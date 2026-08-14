import { describe, expect, it } from "vitest";
import {
  getCanonicalIngredientBySlug,
  getCanonicalIngredients,
  getRecipeCountForCanonicalIngredient,
  getRecipesForCanonicalIngredient,
} from "./canonical-ingredients";

describe("getCanonicalIngredients", () => {
  it("liste au moins Citron, Pistache, Chocolat, Vanille, Noisette, Poire", () => {
    const names = getCanonicalIngredients().map((i) => i.name);
    for (const expected of ["Citron", "Pistache", "Chocolat", "Vanille", "Noisette", "Poire"]) {
      expect(names).toContain(expected);
    }
  });
});

describe("getRecipesForCanonicalIngredient", () => {
  it("« citron » retrouve la tarte au citron (jus/zeste/purée) sans modifier les libellés d'origine", () => {
    const recipes = getRecipesForCanonicalIngredient("citron");
    expect(recipes.map((r) => r.title)).toEqual(["Tarte au citron (Hennessy)"]);
  });

  it("« noisette » retrouve les recettes de plusieurs sources", () => {
    const recipes = getRecipesForCanonicalIngredient("noisette");
    const sourceIds = new Set(recipes.map((r) => r.sourceId));
    expect(recipes.length).toBeGreaterThanOrEqual(2);
    expect(sourceIds.size).toBeGreaterThanOrEqual(2);
  });

  it("retourne un tableau vide pour un slug inconnu", () => {
    expect(getRecipesForCanonicalIngredient("inexistant")).toEqual([]);
  });
});

describe("getRecipeCountForCanonicalIngredient", () => {
  it("compte dynamiquement le nombre de recettes", () => {
    expect(getRecipeCountForCanonicalIngredient("citron")).toBe(1);
    const pistache = getCanonicalIngredientBySlug("pistache")!;
    expect(pistache).toBeDefined();
    expect(getRecipeCountForCanonicalIngredient("pistache")).toBe(0);
  });
});
