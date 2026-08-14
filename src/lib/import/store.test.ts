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

describe("createLocalCategory", () => {
  it("crée une catégorie locale à une source", () => {
    const category = createLocalCategory(CAP_SOURCE_ID, "Viennoiseries");
    expect(category.sourceId).toBe(CAP_SOURCE_ID);
    expect(getCategoriesForSourceIncludingSession(CAP_SOURCE_ID)).toContainEqual(category);
  });

  it("ne crée pas de doublon silencieux pour un nom déjà utilisé (comparaison insensible à la casse)", () => {
    const first = createLocalCategory(CAP_SOURCE_ID, "Viennoiseries");
    const second = createLocalCategory(CAP_SOURCE_ID, "viennoiseries");
    expect(second.id).toBe(first.id);
    expect(getCategoriesForSourceIncludingSession(CAP_SOURCE_ID)).toHaveLength(1);
  });
});

describe("saveImportRecipe", () => {
  it("enregistre une recette valide et retourne son id", () => {
    const batch = createImportBatch();
    const result = saveImportRecipe({ batchId: batch.id, draft: draft(), rawExtraction: null, providerName: "manual" });
    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.recipe.title).toBe("Recette de test");
      expect(result.recipe.importStatus).toBe("validated");
      expect(result.item.recipeId).toBe(result.recipe.id);
    }
  });

  it("texte collé sans fichier : sourceFileUrl reste null, jamais une URL fictive", () => {
    const batch = createImportBatch();
    const result = saveImportRecipe({
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

  it("signale un doublon (même titre + même source) sans enregistrer, tant qu'il n'est pas explicitement reconnu", () => {
    const batch = createImportBatch();
    saveImportRecipe({ batchId: batch.id, draft: draft({ id: "draft-1" }), rawExtraction: null, providerName: "manual" });

    const secondAttempt = saveImportRecipe({
      batchId: batch.id,
      draft: draft({ id: "draft-2" }),
      rawExtraction: null,
      providerName: "manual",
    });
    expect(secondAttempt.status).toBe("duplicate");
  });

  it("accepte le doublon une fois explicitement reconnu (aucune écrasement silencieux)", () => {
    const batch = createImportBatch();
    saveImportRecipe({ batchId: batch.id, draft: draft({ id: "draft-1" }), rawExtraction: null, providerName: "manual" });

    const secondAttempt = saveImportRecipe({
      batchId: batch.id,
      draft: draft({ id: "draft-2" }),
      rawExtraction: null,
      providerName: "manual",
      acknowledgeDuplicate: true,
    });
    expect(secondAttempt.status).toBe("saved");
  });

  it("ré-invoquer avec le même draft.id ne crée pas une seconde recette (idempotent, pas de doublon silencieux sur relance)", () => {
    const batch = createImportBatch();
    const first = saveImportRecipe({ batchId: batch.id, draft: draft(), rawExtraction: null, providerName: "manual" });
    const retry = saveImportRecipe({ batchId: batch.id, draft: draft(), rawExtraction: null, providerName: "manual" });

    expect(retry.status).toBe("already_saved");
    if (first.status === "saved" && retry.status === "already_saved") {
      expect(retry.recipe.id).toBe(first.recipe.id);
    }
  });
});

describe("checkDuplicate", () => {
  it("ne signale rien pour un titre inédit", () => {
    expect(checkDuplicate("Titre totalement inédit", CAP_SOURCE_ID)).toBeNull();
  });
});
