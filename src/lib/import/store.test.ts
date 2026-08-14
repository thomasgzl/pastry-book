import { beforeEach, describe, expect, it } from "vitest";
import { sources } from "@/lib/demo/data";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import {
  checkDuplicate,
  createImportBatch,
  createLocalCategory,
  getCategoriesForSourceIncludingSession,
  resetImportStoreForTests,
  saveImportRecipe,
} from "./store";

const CAP_SOURCE_ID = sources.find((s) => s.slug === "cap-patissier")!.id;

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
