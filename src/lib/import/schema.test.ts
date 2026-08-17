import { describe, expect, it } from "vitest";
import {
  combineAdditionalInformation,
  importIngredientDraftSchema,
  importRecipeDraftSchema,
  TITLE_PLACEHOLDER,
} from "./schema";

const SOURCE_ID = "00000000-0000-4000-8000-000000000001";

function baseIngredient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ing-1",
    originalName: "Farine T55",
    originalQuantityText: "250",
    quantityDecimal: "250",
    unit: "g",
    verificationStatus: "confirmed",
    ...overrides,
  };
}

function baseRecipe(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "recipe-1",
    title: "Tarte aux pommes (CAP)",
    sourceId: SOURCE_ID,
    sections: [{ id: "sec-1", name: null, ingredients: [baseIngredient()] }],
    ...overrides,
  };
}

describe("importIngredientDraftSchema", () => {
  it("accepte un ingrédient valide et sépare libellé original / proposition canonique", () => {
    const result = importIngredientDraftSchema.parse(
      baseIngredient({ canonicalIngredientId: "00000000-0000-4000-8000-000000000201" }),
    );
    expect(result.originalName).toBe("Farine T55");
    expect(result.canonicalIngredientId).toBe("00000000-0000-4000-8000-000000000201");
  });

  it("rejette un libellé original vide (schéma invalide)", () => {
    const result = importIngredientDraftSchema.safeParse(baseIngredient({ originalName: "" }));
    expect(result.success).toBe(false);
  });

  it("rejette une quantité décimale mal formée (ex. fraction stockée telle quelle par erreur)", () => {
    const result = importIngredientDraftSchema.safeParse(baseIngredient({ quantityDecimal: "1/2" }));
    expect(result.success).toBe(false);
  });

  it("accepte une quantité absente : null explicite, jamais une chaîne inventée", () => {
    const result = importIngredientDraftSchema.parse(
      baseIngredient({ originalQuantityText: null, quantityDecimal: null, verificationStatus: "needs_review" }),
    );
    expect(result.originalQuantityText).toBeNull();
    expect(result.quantityDecimal).toBeNull();
  });

  it("recadre une chaîne blanche en null plutôt que de la conserver telle quelle", () => {
    const result = importIngredientDraftSchema.parse(baseIngredient({ unit: "   " }));
    expect(result.unit).toBeNull();
  });
});

describe("importRecipeDraftSchema", () => {
  it("accepte un brouillon minimal (CAP : ingrédients seuls, aucune section optionnelle)", () => {
    const result = importRecipeDraftSchema.safeParse(baseRecipe());
    expect(result.success).toBe(true);
  });

  it("rejette une recette sans aucune préparation (schéma invalide)", () => {
    const result = importRecipeDraftSchema.safeParse(baseRecipe({ sections: [] }));
    expect(result.success).toBe(false);
  });

  it("rejette un sourceId qui n'est pas un UUID (schéma invalide)", () => {
    const result = importRecipeDraftSchema.safeParse(baseRecipe({ sourceId: "pas-un-uuid" }));
    expect(result.success).toBe(false);
  });

  it("accepte le placeholder de titre illisible, jamais une autre valeur inventée", () => {
    const result = importRecipeDraftSchema.parse(baseRecipe({ title: TITLE_PLACEHOLDER }));
    expect(result.title).toBe("À vérifier");
  });
});

describe("combineAdditionalInformation", () => {
  it("retourne null quand procédé/température/informations sont tous absents (aucune section vide affichée)", () => {
    expect(combineAdditionalInformation({ procedure: null, temperature: null, additionalInformation: null })).toBeNull();
  });

  it("combine uniquement les champs renseignés", () => {
    const combined = combineAdditionalInformation({
      procedure: "Cuisson à blanc 15 min",
      temperature: null,
      additionalInformation: "Dresser juste avant le service.",
    });
    expect(combined).toContain("Procédé : Cuisson à blanc 15 min");
    expect(combined).toContain("Dresser juste avant le service.");
    expect(combined).not.toContain("Température");
  });
});
