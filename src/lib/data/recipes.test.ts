import { describe, expect, it } from "vitest";
import {
  getIngredientTagsForRecipe,
  getRecipes,
  getRecipesByCategory,
  getRecipesBySource,
  getRecipesWithoutCategoryForSource,
  toRecipeCardData,
} from "./recipes";

describe("getRecipes", () => {
  it("retourne les 6 recettes du jeu démo", () => {
    expect(getRecipes()).toHaveLength(6);
  });
});

describe("getRecipesBySource", () => {
  it("retourne uniquement les recettes de la source demandée", () => {
    const recipes = getRecipesBySource("cap-patissier");
    expect(recipes.map((r) => r.title).sort()).toEqual(["Crème pâtissière (CAP)", "Pâte sablée (CAP)"]);
  });

  it("retourne un tableau vide pour un slug inconnu", () => {
    expect(getRecipesBySource("inexistant")).toEqual([]);
  });
});

describe("getRecipesByCategory", () => {
  it("retourne les recettes d'une catégorie Hennessy précise", () => {
    const recipes = getRecipesByCategory("hennessy", "desserts-boutique");
    expect(recipes.map((r) => r.title)).toEqual(["Tarte au citron (Hennessy)"]);
  });

  it("ne retourne rien pour une catégorie Hennessy demandée sur une autre source", () => {
    expect(getRecipesByCategory("cap-patissier", "desserts-boutique")).toEqual([]);
  });
});

describe("getRecipesWithoutCategoryForSource", () => {
  it("retourne toutes les recettes d'une source sans catégories (CAP Pâtissier)", () => {
    expect(getRecipesWithoutCategoryForSource("cap-patissier")).toHaveLength(2);
  });

  it("ne retourne aucune recette Hennessy (toutes classées)", () => {
    expect(getRecipesWithoutCategoryForSource("hennessy")).toHaveLength(0);
  });
});

describe("getIngredientTagsForRecipe", () => {
  it("retrouve les recettes contenant jus/zeste/purée de citron sans changer les libellés affichés", () => {
    const tarte = getRecipes().find((r) => r.slug === "tarte-au-citron-hennessy")!;
    const tags = getIngredientTagsForRecipe(tarte.id);
    expect(tags).toContain("Citron");
  });
});

describe("toRecipeCardData", () => {
  it("distingue les deux « Crème pâtissière » homonymes par leur source", () => {
    const recipes = getRecipes().filter((r) => r.title.startsWith("Crème pâtissière"));
    const cards = recipes.map(toRecipeCardData);
    const sourceNames = cards.map((c) => c.sourceName).sort();
    expect(sourceNames).toEqual(["CAP Pâtissier", "Hennessy"]);
  });

  it("n'affiche pas de catégorie pour une recette sans catégorie", () => {
    const pateSablee = getRecipes().find((r) => r.slug === "pate-sablee-cap")!;
    expect(toRecipeCardData(pateSablee).categoryName).toBeUndefined();
  });
});
