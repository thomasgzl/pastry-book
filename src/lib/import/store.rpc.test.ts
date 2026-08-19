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

const { rpcMock, recipesSelectEqMock, ingredientAliasesInsertMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  recipesSelectEqMock: vi.fn(),
  ingredientAliasesInsertMock: vi.fn(),
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
      // F-KEY1 : alias opportuniste d'une nouvelle matière première
      // principale — non exercé par la plupart des tests de ce fichier
      // (`draft()` n'a par défaut aucune matière première proposée).
      if (table === "ingredient_aliases") {
        return { insert: ingredientAliasesInsertMock };
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
    proposedKeyIngredients: [],
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
  ingredientAliasesInsertMock.mockReset();
  ingredientAliasesInsertMock.mockResolvedValue({ data: null, error: null });
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

describe("saveImportRecipe — matières premières principales (F-KEY1)", () => {
  it("crée une nouvelle matière première via find_or_create_canonical_ingredient et la passe à save_import_recipe", async () => {
    rpcMock.mockImplementation(async (fn: string) => {
      if (fn === "find_or_create_canonical_ingredient") {
        return { data: "canonical-nouveau", error: null };
      }
      if (fn === "save_import_recipe") {
        return { data: { outcome: "saved", recipe: RECIPE_ROW, item: ITEM_ROW }, error: null };
      }
      throw new Error(`rpc("${fn}") inattendu`);
    });

    await saveImportRecipe({
      batchId: "batch-1",
      draft: draft({ proposedKeyIngredients: [{ kind: "new", name: "Framboise", slug: "framboise" }] }),
      rawExtraction: null,
      providerName: "manual",
    });

    const findOrCreateCall = rpcMock.mock.calls.find(([fn]) => fn === "find_or_create_canonical_ingredient");
    expect(findOrCreateCall?.[1]).toEqual({ p_name: "Framboise", p_slug: "framboise" });

    const saveCall = rpcMock.mock.calls.find(([fn]) => fn === "save_import_recipe");
    expect(saveCall?.[1].payload.keyIngredients).toEqual([{ canonicalIngredientId: "canonical-nouveau", position: 0 }]);
  });

  it("reprend un tag déjà résolu (kind: existing) tel quel, sans appeler find_or_create_canonical_ingredient", async () => {
    rpcMock.mockResolvedValue({ data: { outcome: "saved", recipe: RECIPE_ROW, item: ITEM_ROW }, error: null });

    await saveImportRecipe({
      batchId: "batch-1",
      draft: draft({ proposedKeyIngredients: [{ kind: "existing", canonicalIngredientId: "canonical-existant", name: "Citron" }] }),
      rawExtraction: null,
      providerName: "manual",
    });

    expect(rpcMock).toHaveBeenCalledTimes(1);
    const [, args] = rpcMock.mock.calls[0];
    expect(args.payload.keyIngredients).toEqual([{ canonicalIngredientId: "canonical-existant", position: 0 }]);
  });
});
