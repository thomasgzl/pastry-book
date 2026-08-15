import { describe, expect, it } from "vitest";
import {
  getIngredientTagsForRecipe,
  getRecipeBySlug,
  getRecipeDetail,
  getRecipes,
  getRecipesByCategory,
  getRecipesBySource,
  getRecipesWithoutCategoryForSource,
  toRecipeCardData,
} from "./recipes";

describe("getRecipes", () => {
  it("retourne les 6 recettes du jeu démo", async () => {
    expect(await getRecipes()).toHaveLength(6);
  });
});

describe("getRecipesBySource", () => {
  it("retourne uniquement les recettes de la source demandée", async () => {
    const recipes = await getRecipesBySource("cap-patissier");
    expect(recipes.map((r) => r.title).sort()).toEqual(["Crème pâtissière (CAP)", "Pâte sablée (CAP)"]);
  });

  it("retourne un tableau vide pour un slug inconnu", async () => {
    expect(await getRecipesBySource("inexistant")).toEqual([]);
  });
});

describe("getRecipesByCategory", () => {
  it("retourne les recettes d'une catégorie Hennessy précise", async () => {
    const recipes = await getRecipesByCategory("hennessy", "desserts-boutique");
    expect(recipes.map((r) => r.title)).toEqual(["Tarte au citron (Hennessy)"]);
  });

  it("ne retourne rien pour une catégorie Hennessy demandée sur une autre source", async () => {
    expect(await getRecipesByCategory("cap-patissier", "desserts-boutique")).toEqual([]);
  });
});

describe("getRecipesWithoutCategoryForSource", () => {
  it("retourne toutes les recettes d'une source sans catégories (CAP Pâtissier)", async () => {
    expect(await getRecipesWithoutCategoryForSource("cap-patissier")).toHaveLength(2);
  });

  it("ne retourne aucune recette Hennessy (toutes classées)", async () => {
    expect(await getRecipesWithoutCategoryForSource("hennessy")).toHaveLength(0);
  });
});

describe("getIngredientTagsForRecipe", () => {
  it("retrouve les recettes contenant jus/zeste/purée de citron sans changer les libellés affichés", async () => {
    const tarte = (await getRecipes()).find((r) => r.slug === "tarte-au-citron-hennessy")!;
    const tags = await getIngredientTagsForRecipe(tarte.id);
    expect(tags).toContain("Citron");
  });
});

describe("toRecipeCardData", () => {
  it("distingue les deux « Crème pâtissière » homonymes par leur source", async () => {
    const recipes = (await getRecipes()).filter((r) => r.title.startsWith("Crème pâtissière"));
    const cards = await Promise.all(recipes.map(toRecipeCardData));
    const sourceNames = cards.map((c) => c.sourceName).sort();
    expect(sourceNames).toEqual(["CAP Pâtissier", "Hennessy"]);
  });

  it("n'affiche pas de catégorie pour une recette sans catégorie", async () => {
    const pateSablee = (await getRecipes()).find((r) => r.slug === "pate-sablee-cap")!;
    expect((await toRecipeCardData(pateSablee)).categoryName).toBeUndefined();
  });
});

describe("getRecipeBySlug", () => {
  it("retrouve une recette par son slug", async () => {
    expect((await getRecipeBySlug("pate-sablee-cap"))?.title).toBe("Pâte sablée (CAP)");
  });

  it("retourne undefined pour un slug inconnu", async () => {
    expect(await getRecipeBySlug("inexistant")).toBeUndefined();
  });
});

describe("getRecipeDetail", () => {
  it("retourne undefined pour un slug inconnu", async () => {
    expect(await getRecipeDetail("inexistant")).toBeUndefined();
  });

  it("assemble une fiche minimale (CAP) sans catégorie ni matière première clé", async () => {
    const detail = (await getRecipeDetail("pate-sablee-cap"))!;
    expect(detail.sourceName).toBe("CAP Pâtissier");
    expect(detail.categoryName).toBeUndefined();
    expect(detail.sections).toHaveLength(1);
    expect(detail.sections[0].ingredients.map((i) => i.originalName)).toEqual([
      "Farine T55",
      "Beurre",
      "Sucre glace",
      "Œuf",
      "Sel",
    ]);
    expect(detail.keyIngredients).toEqual([]);
  });

  it("assemble une fiche détaillée (Hennessy) avec catégorie, préparations ordonnées et matière première clé", async () => {
    const detail = (await getRecipeDetail("tarte-au-citron-hennessy"))!;
    expect(detail.categoryName).toBe("Desserts boutique");
    expect(detail.sections.map((s) => s.name)).toEqual(["Pâte sablée", "Crème citron"]);
    expect(detail.keyIngredients).toEqual([{ name: "Citron", slug: "citron" }]);
  });

  it("chaque « Crème pâtissière » (CAP/Hennessy) garde ses propres ingrédients, sans mélange", async () => {
    const cap = (await getRecipeDetail("creme-patissiere-cap"))!;
    const hennessy = (await getRecipeDetail("creme-patissiere-hennessy"))!;

    const capNames = cap.sections.flatMap((s) => s.ingredients.map((i) => i.originalName));
    const hennessyNames = hennessy.sections.flatMap((s) => s.ingredients.map((i) => i.originalName));

    expect(capNames).toEqual(["Lait", "Jaunes d'œufs", "Sucre", "Poudre à crème", "Vanille"]);
    expect(hennessyNames).toEqual([
      "Lait entier",
      "Jaunes d'œufs",
      "Sucre semoule",
      "Poudre à crème",
      "Gousse de vanille",
    ]);
    // Aucun id d'ingrédient partagé entre les deux préparations homonymes.
    const capIds = new Set(cap.sections.flatMap((s) => s.ingredients.map((i) => i.id)));
    const hennessyIds = hennessy.sections.flatMap((s) => s.ingredients.map((i) => i.id));
    expect(hennessyIds.some((id) => capIds.has(id))).toBe(false);
  });
});
