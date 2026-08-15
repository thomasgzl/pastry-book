import { describe, expect, it } from "vitest";
import { getSourceBySlug, getSources } from "./sources";
import { getCategoriesForSource, getRecipeCountForCategory } from "./categories";

describe("getCategoriesForSource", () => {
  it("retourne les 4 catégories de Hennessy, triées par position", async () => {
    const hennessy = (await getSourceBySlug("hennessy"))!;
    const categories = await getCategoriesForSource(hennessy.id);
    expect(categories.map((c) => c.name)).toEqual([
      "Desserts à l'assiette",
      "Desserts boutique",
      "Recettes de base",
      "Petit-déjeuner",
    ]);
  });

  it("ne retourne jamais de catégorie Hennessy pour une autre source", async () => {
    for (const source of await getSources()) {
      if (source.slug === "hennessy") continue;
      expect(await getCategoriesForSource(source.id)).toHaveLength(0);
    }
  });
});

describe("getRecipeCountForCategory", () => {
  it("compte dynamiquement les recettes d'une catégorie", async () => {
    const hennessy = (await getSourceBySlug("hennessy"))!;
    const dessertsBoutique = (await getCategoriesForSource(hennessy.id)).find((c) => c.slug === "desserts-boutique")!;
    expect(await getRecipeCountForCategory(dessertsBoutique.id)).toBe(1);
  });

  it("retourne 0 pour une catégorie sans recette (jamais affichée par l'appelant)", async () => {
    const hennessy = (await getSourceBySlug("hennessy"))!;
    const petitDejeuner = (await getCategoriesForSource(hennessy.id)).find((c) => c.slug === "petit-dejeuner")!;
    expect(await getRecipeCountForCategory(petitDejeuner.id)).toBe(0);
  });
});
