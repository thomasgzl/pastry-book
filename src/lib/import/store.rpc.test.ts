import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportRecipeDraft } from "@/lib/import/schema";

/**
 * Tests ciblés (niveau 1, K3-DATA) de la voie Supabase de `saveImportRecipe`
 * via un client mocké — aucune connexion réseau réelle, comme demandé
 * (« cas testables sans vraie connexion Supabase live via mocks »). Vérifie
 * spécifiquement :
 * - l'atomicité déléguée à Postgres : un échec de `save_import_recipe`
 *   (RPC) ne déclenche AUCUNE écriture de compensation côté JS (l'ancien
 *   code supprimait la recette partielle en JS ; ce test échouerait si ce
 *   code était réintroduit, car `from("recipes")` ne fournit ici aucune
 *   méthode `delete`/`insert`) ;
 * - le mapping correct des réponses `saved`/`already_saved` de la fonction
 *   Postgres vers le domaine.
 */

const { rpcMock, recipesSelectEqMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  recipesSelectEqMock: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseConfig: () => true,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    from(table: string) {
      if (table === "recipes") {
        return { select: () => ({ eq: recipesSelectEqMock }) };
      }
      throw new Error(`from("${table}") inattendu dans ce test mocké — aucune écriture de compensation attendue`);
    },
    rpc: rpcMock,
    storage: {
      from: () => ({
        download: async () => {
          throw new Error("download() inattendu — ce test n'utilise aucun fichier source");
        },
      }),
    },
  }),
}));

const { saveImportRecipe } = await import("./store");

function draft(overrides: Partial<ImportRecipeDraft> = {}): ImportRecipeDraft {
  return {
    id: "draft-1",
    title: "Recette de test",
    sourceId: "11111111-1111-1111-1111-111111111111",
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

const RECIPE_ROW = {
  id: "recipe-1",
  source_id: "11111111-1111-1111-1111-111111111111",
  source_category_id: null,
  title: "Recette de test",
  slug: "recette-de-test",
  additional_information: null,
  original_document_url: null,
  photo_url: null,
  illustration_url: null,
  import_status: "validated",
  created_at: "2026-08-15T00:00:00.000Z",
  updated_at: "2026-08-15T00:00:00.000Z",
};

const ITEM_ROW = {
  id: "item-1",
  import_batch_id: "batch-1",
  source_file_url: null,
  source_file_hash: null,
  status: "done",
  raw_extraction: null,
  proposed_recipe: { id: "draft-1" },
  errors: [],
  recipe_id: "recipe-1",
};

beforeEach(() => {
  rpcMock.mockReset();
  recipesSelectEqMock.mockReset();
  recipesSelectEqMock.mockResolvedValue({ data: [], error: null }); // aucun doublon titre+source par défaut
});

describe("saveImportRecipe — voie Supabase mockée (K3-DATA, atomicité)", () => {
  it("un échec de la transaction Postgres (RPC) ne tente aucune écriture de compensation et remonte un message lisible", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "violation de contrainte simulée" } });

    await expect(
      saveImportRecipe({ batchId: "batch-1", draft: draft(), rawExtraction: null, providerName: "manual" }),
    ).rejects.toThrow(/violation de contrainte simulée/);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [fnName, args] = rpcMock.mock.calls[0];
    expect(fnName).toBe("save_import_recipe");
    expect(args.payload).toMatchObject({ draftId: "draft-1", title: "Recette de test" });
  });

  it("mappe une réponse « saved » de la fonction Postgres vers le domaine", async () => {
    rpcMock.mockResolvedValue({ data: { outcome: "saved", recipe: RECIPE_ROW, item: ITEM_ROW }, error: null });

    const result = await saveImportRecipe({
      batchId: "batch-1",
      draft: draft(),
      rawExtraction: null,
      providerName: "manual",
    });

    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.recipe.id).toBe("recipe-1");
      expect(result.recipe.title).toBe("Recette de test");
      expect(result.item.recipeId).toBe("recipe-1");
    }
  });

  it("mappe une réponse « already_saved » (idempotence vérifiée à l'intérieur de la fonction Postgres)", async () => {
    rpcMock.mockResolvedValue({
      data: { outcome: "already_saved", recipe: RECIPE_ROW, item: ITEM_ROW },
      error: null,
    });

    const result = await saveImportRecipe({
      batchId: "batch-1",
      draft: draft(),
      rawExtraction: null,
      providerName: "manual",
    });

    expect(result.status).toBe("already_saved");
  });

  it("un doublon même titre + même source non reconnu bloque avant tout appel RPC", async () => {
    recipesSelectEqMock.mockResolvedValue({
      data: [{ title: "Recette de test", source_id: "11111111-1111-1111-1111-111111111111" }],
      error: null,
    });

    const result = await saveImportRecipe({
      batchId: "batch-1",
      draft: draft(),
      rawExtraction: null,
      providerName: "manual",
    });

    expect(result.status).toBe("duplicate");
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
