import { describe, expect, it } from "vitest";
import { getSourceBySlug, getSources } from "./sources";
import { getCategoriesForSource, getRecipeCountForCategory } from "./categories";

describe("getCategoriesForSource", () => {
  it("retourne les 4 catégories de Hennessy, triées par position", () => {
    const hennessy = getSourceBySlug("hennessy")!;
    const categories = getCategoriesForSource(hennessy.id);
    expect(categories.map((c) => c.name)).toEqual([
      "Desserts à l'assiette",
      "Desserts boutique",
      "Recettes de base",
      "Petit-déjeuner",
    ]);
  });

  it("ne retourne jamais de catégorie Hennessy pour une autre source", () => {
    for (const source of getSources()) {
      if (source.slug === "hennessy") continue;
      expect(getCategoriesForSource(source.id)).toHaveLength(0);
    }
  });
});

describe("getRecipeCountForCategory", () => {
  it("compte dynamiquement les recettes d'une catégorie", () => {
    const hennessy = getSourceBySlug("hennessy")!;
    const dessertsBoutique = getCategoriesForSource(hennessy.id).find((c) => c.slug === "desserts-boutique")!;
    expect(getRecipeCountForCategory(dessertsBoutique.id)).toBe(1);
  });

  it("retourne 0 pour une catégorie sans recette (jamais affichée par l'appelant)", () => {
    const hennessy = getSourceBySlug("hennessy")!;
    const petitDejeuner = getCategoriesForSource(hennessy.id).find((c) => c.slug === "petit-dejeuner")!;
    expect(getRecipeCountForCategory(petitDejeuner.id)).toBe(0);
  });
});
