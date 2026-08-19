import { describe, expect, it } from "vitest";
import type { CanonicalIngredient, Recipe, RecipeIngredient, RecipeSection, RecipeSpecificity } from "@/lib/domain/schemas";
import { buildEditDraft } from "./editDraft";

const RECIPE: Recipe = {
  id: "recipe-1",
  sourceId: "source-1",
  sourceCategoryId: "category-1",
  title: "Tarte aux pommes",
  slug: "tarte-aux-pommes",
  additionalInformation: "Procédé : Cuisson à blanc 15 min\n\nTempérature : 180°C\n\nDresser juste avant le service.",
  originalDocumentUrl: null,
  photoUrl: null,
  illustrationUrl: "https://example.com/illustration.png",
  importStatus: "validated",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SECTION: RecipeSection = { id: "section-1", recipeId: "recipe-1", name: "Pâte", position: 0, originalText: "texte source d'origine" };

const INGREDIENT: RecipeIngredient = {
  id: "ingredient-1",
  recipeSectionId: "section-1",
  originalName: "Farine T55",
  canonicalIngredientId: null,
  originalQuantityText: "250",
  quantityDecimal: "250",
  unit: "g",
  position: 0,
  verificationStatus: "confirmed",
  confidence: null,
};

const SPECIFICITY: RecipeSpecificity = { recipeId: "recipe-1", specificityId: "spec-1", status: "confirmed", reason: null, source: "manual" };

const NOISETTE: CanonicalIngredient = { id: "canonical-noisette", name: "Noisette", slug: "noisette", parentId: null, containsGluten: "unknown", containsLactose: "unknown", containsTreeNuts: "true" };

describe("buildEditDraft", () => {
  it("repeuple titre/source/catégorie/procédé/température/informations à partir du champ combiné", () => {
    const draft = buildEditDraft({ recipe: RECIPE, sections: [SECTION], ingredients: [INGREDIENT], keyIngredients: [] }, [SPECIFICITY]);
    expect(draft.title).toBe("Tarte aux pommes");
    expect(draft.sourceId).toBe("source-1");
    expect(draft.sourceCategoryId).toBe("category-1");
    expect(draft.procedure).toBe("Cuisson à blanc 15 min");
    expect(draft.temperature).toBe("180°C");
    expect(draft.additionalInformation).toBe("Dresser juste avant le service.");
  });

  it("conserve le texte source d'une préparation (originalText) même s'il n'est pas éditable dans le formulaire", () => {
    const draft = buildEditDraft({ recipe: RECIPE, sections: [SECTION], ingredients: [INGREDIENT], keyIngredients: [] }, []);
    expect(draft.sections[0].originalText).toBe("texte source d'origine");
    expect(draft.sections[0].ingredients).toHaveLength(1);
    expect(draft.sections[0].ingredients[0].originalName).toBe("Farine T55");
  });

  it("exclut les allergènes (hors périmètre de cette modification) et les spécificités rejetées", () => {
    const rejected: RecipeSpecificity = { ...SPECIFICITY, specificityId: "spec-2", status: "rejected" };
    const draft = buildEditDraft(
      { recipe: RECIPE, sections: [SECTION], ingredients: [INGREDIENT], keyIngredients: [] },
      [SPECIFICITY, rejected],
    );
    expect(draft.allergens).toEqual([]);
    expect(draft.specificities).toEqual([{ specificityId: "spec-1", status: "confirmed", reason: null, source: "manual" }]);
  });

  it("repeuple les matières premières principales déjà enregistrées (F-KEY1), jamais recréées (kind: existing)", () => {
    const draft = buildEditDraft(
      {
        recipe: RECIPE,
        sections: [SECTION],
        ingredients: [INGREDIENT],
        keyIngredients: [{ recipeId: "recipe-1", canonicalIngredientId: "canonical-noisette", position: 0 }],
      },
      [],
      [NOISETTE],
    );
    expect(draft.proposedKeyIngredients).toEqual([{ kind: "existing", canonicalIngredientId: "canonical-noisette", name: "Noisette" }]);
  });

  it("ignore un lien de matière première dont le canonique n'est pas trouvé dans le référentiel chargé (jamais un tag inventé)", () => {
    const draft = buildEditDraft(
      {
        recipe: RECIPE,
        sections: [SECTION],
        ingredients: [INGREDIENT],
        keyIngredients: [{ recipeId: "recipe-1", canonicalIngredientId: "canonical-inconnu", position: 0 }],
      },
      [],
      [NOISETTE],
    );
    expect(draft.proposedKeyIngredients).toEqual([]);
  });
});
