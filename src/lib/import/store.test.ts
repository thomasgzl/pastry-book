import { beforeEach, describe, expect, it } from "vitest";
import { sources } from "@/lib/demo/data";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import {
  checkDuplicate,
  checkImportDuplicates,
  computeSha256Hex,
  createImportBatch,
  createLocalCategory,
  getCategoriesForSourceIncludingSession,
  resetImportStoreForTests,
  saveImportRecipe,
} from "./store";

const CAP_SOURCE_ID = sources.find((s) => s.slug === "cap-patissier")!.id;
const HENNESSY_SOURCE_ID = sources.find((s) => s.slug === "hennessy")!.id;

function draft(overrides: Partial<ImportRecipeDraft> = {}): ImportRecipeDraft {
  return {
    id: "draft-1",
    title: "Recette de test",
    sourceId: CAP_SOURCE_ID,
    sourceCategoryId: null,
    procedure: null,
    temperature: null,
    additionalInformation: null,
    sections: [
      {
        id: "sec-1",
        name: null,
        originalText: null,
        ingredients: [
          {
            id: "ing-1",
            originalName: "Farine",
            canonicalIngredientId: null,
            originalQuantityText: "200",
            quantityDecimal: "200",
            unit: "g",
            verificationStatus: "confirmed",
          },
        ],
      },
    ],
    specificities: [],
    allergens: [],
    originalFiles: [],
    pastedText: null,
    warnings: [],
    ...overrides,
  };
}

beforeEach(() => {
  resetImportStoreForTests();
});

// `hasSupabaseConfig()` est faux dans cet environnement de test (aucune
// variable Supabase chargée par `vitest`, voir `vitest.config.ts`) : ces
// tests exercent uniquement le repli en mémoire de `store.ts`, jamais un
// vrai appel réseau Supabase. Toutes les fonctions du store sont
// asynchrones (I5) — appelées ici directement comme le ferait
// `src/app/(app)/importer/importActions.ts`.

describe("createLocalCategory", () => {
  it("crée une catégorie locale à une source", async () => {
    const category = await createLocalCategory(CAP_SOURCE_ID, "Viennoiseries");
    expect(category.sourceId).toBe(CAP_SOURCE_ID);
    expect(await getCategoriesForSourceIncludingSession(CAP_SOURCE_ID)).toContainEqual(category);
  });

  it("ne crée pas de doublon silencieux pour un nom déjà utilisé (comparaison insensible à la casse)", async () => {
    const first = await createLocalCategory(CAP_SOURCE_ID, "Viennoiseries");
    const second = await createLocalCategory(CAP_SOURCE_ID, "viennoiseries");
    expect(second.id).toBe(first.id);
    expect(await getCategoriesForSourceIncludingSession(CAP_SOURCE_ID)).toHaveLength(1);
  });
});

describe("saveImportRecipe", () => {
  it("enregistre une recette valide et retourne son id", async () => {
    const batch = await createImportBatch();
    const result = await saveImportRecipe({ batchId: batch.id, draft: draft(), rawExtraction: null, providerName: "manual" });
    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.recipe.title).toBe("Recette de test");
      expect(result.recipe.importStatus).toBe("validated");
      expect(result.item.recipeId).toBe(result.recipe.id);
    }
  });

  it("fichier réellement archivé (I6) : le chemin Storage est repris tel quel comme sourceFileUrl et originalDocumentUrl", async () => {
    const batch = await createImportBatch();
    const result = await saveImportRecipe({
      batchId: batch.id,
      draft: draft({
        originalFiles: [{ name: "recette.pdf", type: "application/pdf", sizeBytes: 12345, sourceFileUrl: `${batch.id}/abc.pdf` }],
      }),
      rawExtraction: null,
      providerName: "manual",
    });
    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.item.sourceFileUrl).toBe(`${batch.id}/abc.pdf`);
      expect(result.recipe.originalDocumentUrl).toBe(`${batch.id}/abc.pdf`);
    }
  });

  it("texte collé sans fichier : sourceFileUrl reste null, jamais une URL fictive", async () => {
    const batch = await createImportBatch();
    const result = await saveImportRecipe({
      batchId: batch.id,
      draft: draft({ pastedText: "Farine 200g...", originalFiles: [] }),
      rawExtraction: null,
      providerName: "manual",
    });
    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.item.sourceFileUrl).toBeNull();
      expect(result.item.sourceFileName).toBeNull();
    }
  });

  it("signale un doublon (même titre + même source) sans enregistrer, tant qu'il n'est pas explicitement reconnu", async () => {
    const batch = await createImportBatch();
    await saveImportRecipe({ batchId: batch.id, draft: draft({ id: "draft-1" }), rawExtraction: null, providerName: "manual" });

    const secondAttempt = await saveImportRecipe({
      batchId: batch.id,
      draft: draft({ id: "draft-2" }),
      rawExtraction: null,
      providerName: "manual",
    });
    expect(secondAttempt.status).toBe("duplicate");
  });

  it("accepte le doublon une fois explicitement reconnu (aucune écrasement silencieux)", async () => {
    const batch = await createImportBatch();
    await saveImportRecipe({ batchId: batch.id, draft: draft({ id: "draft-1" }), rawExtraction: null, providerName: "manual" });

    const secondAttempt = await saveImportRecipe({
      batchId: batch.id,
      draft: draft({ id: "draft-2" }),
      rawExtraction: null,
      providerName: "manual",
      acknowledgeDuplicate: true,
    });
    expect(secondAttempt.status).toBe("saved");
  });

  it("ré-invoquer avec le même draft.id ne crée pas une seconde recette (idempotent, pas de doublon silencieux sur relance)", async () => {
    const batch = await createImportBatch();
    const first = await saveImportRecipe({ batchId: batch.id, draft: draft(), rawExtraction: null, providerName: "manual" });
    const retry = await saveImportRecipe({ batchId: batch.id, draft: draft(), rawExtraction: null, providerName: "manual" });

    expect(retry.status).toBe("already_saved");
    if (first.status === "saved" && retry.status === "already_saved") {
      expect(retry.recipe.id).toBe(first.recipe.id);
    }
  });
});

describe("checkDuplicate", () => {
  it("ne signale rien pour un titre inédit", async () => {
    expect(await checkDuplicate("Titre totalement inédit", CAP_SOURCE_ID)).toBeNull();
  });
});

describe("computeSha256Hex (K4)", () => {
  it("calcule l'empreinte SHA-256 hex minuscule attendue", () => {
    const bytes = new TextEncoder().encode("hello");
    expect(computeSha256Hex(bytes)).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("accepte aussi bien un ArrayBuffer qu'un Uint8Array (même résultat)", () => {
    const bytes = new TextEncoder().encode("hello");
    expect(computeSha256Hex(bytes.buffer)).toBe(computeSha256Hex(bytes));
  });

  it("respecte le format exigé par la contrainte SQL (64 hex minuscules)", () => {
    expect(computeSha256Hex(new Uint8Array([1, 2, 3]))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("checkImportDuplicates (K4, repli mémoire)", () => {
  it("signale un même titre dans une AUTRE source, distinct du cas même source", async () => {
    const batch = await createImportBatch();
    await saveImportRecipe({
      batchId: batch.id,
      draft: draft({ id: "draft-a", title: "Tarte au citron", sourceId: CAP_SOURCE_ID }),
      rawExtraction: null,
      providerName: "manual",
    });

    const matches = await checkImportDuplicates({ title: "Tarte au citron", sourceId: HENNESSY_SOURCE_ID });
    expect(matches).toContainEqual(
      expect.objectContaining({ kind: "same_title_other_source", sourceId: CAP_SOURCE_ID }),
    );
    expect(matches.some((m) => m.kind === "same_title_same_source")).toBe(false);
  });

  it("signale une préparation homonyme (même nom de préparation) sans jamais la fusionner", async () => {
    const batch = await createImportBatch();
    await saveImportRecipe({
      batchId: batch.id,
      draft: draft({
        id: "draft-b",
        title: "Fraisier",
        sections: [
          {
            id: "sec-cp",
            name: "Crème pâtissière",
            originalText: null,
            ingredients: [
              {
                id: "ing-1",
                originalName: "Lait",
                canonicalIngredientId: null,
                originalQuantityText: "500",
                quantityDecimal: "500",
                unit: "g",
                verificationStatus: "confirmed",
              },
            ],
          },
        ],
      }),
      rawExtraction: null,
      providerName: "manual",
    });

    const matches = await checkImportDuplicates({
      title: "Recette totalement différente",
      sourceId: CAP_SOURCE_ID,
      sectionNames: ["Crème pâtissière"],
    });
    expect(matches).toContainEqual(
      expect.objectContaining({ kind: "homonymous_preparation", sectionName: "Crème pâtissière" }),
    );
  });

  it("ne signale rien pour un titre et des préparations inédits", async () => {
    const matches = await checkImportDuplicates({
      title: "Titre totalement inédit",
      sourceId: CAP_SOURCE_ID,
      sectionNames: ["Préparation totalement inédite"],
    });
    expect(matches).toEqual([]);
  });
});
