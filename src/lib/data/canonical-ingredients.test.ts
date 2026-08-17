import { describe, expect, it } from "vitest";
import {
  getCanonicalIngredientBySlug,
  getCanonicalIngredients,
  getRecipeCountForCanonicalIngredient,
  getRecipesForCanonicalIngredient,
} from "./canonical-ingredients";

describe("getCanonicalIngredients", () => {
  it("liste au moins Citron, Pistache, Chocolat, Vanille, Noisette, Poire", async () => {
    const names = (await getCanonicalIngredients()).map((i) => i.name);
    for (const expected of ["Citron", "Pistache", "Chocolat", "Vanille", "Noisette", "Poire"]) {
      expect(names).toContain(expected);
    }
  });
});

describe("getRecipesForCanonicalIngredient", () => {
  it("« citron » retrouve la tarte au citron (jus/zeste/purée) sans modifier les libellés d'origine", async () => {
    const recipes = await getRecipesForCanonicalIngredient("citron");
    expect(recipes.map((r) => r.title)).toEqual(["Tarte au citron (Hennessy)"]);
  });

  it("« noisette » retrouve les recettes de plusieurs sources", async () => {
    const recipes = await getRecipesForCanonicalIngredient("noisette");
    const sourceIds = new Set(recipes.map((r) => r.sourceId));
    expect(recipes.length).toBeGreaterThanOrEqual(2);
    expect(sourceIds.size).toBeGreaterThanOrEqual(2);
  });

  it("retourne un tableau vide pour un slug inconnu", async () => {
    expect(await getRecipesForCanonicalIngredient("inexistant")).toEqual([]);
  });
});

describe("getRecipeCountForCanonicalIngredient", () => {
  it("compte dynamiquement le nombre de recettes", async () => {
    expect(await getRecipeCountForCanonicalIngredient("citron")).toBe(1);
    const pistache = await getCanonicalIngredientBySlug("pistache");
    expect(pistache).toBeDefined();
    expect(await getRecipeCountForCanonicalIngredient("pistache")).toBe(0);
  });
});
