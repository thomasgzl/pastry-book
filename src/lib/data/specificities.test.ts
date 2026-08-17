import { describe, expect, it } from "vitest";
import {
  getAllergens,
  getRecipeAllergens,
  getRecipeSpecificities,
  getRecipesForAllergen,
  getRecipesForSpecificity,
  getSpecificities,
} from "./specificities";
import { getRecipes } from "./recipes";

describe("getSpecificities / getAllergens", () => {
  it("liste les 3 spécificités et les 4 allergènes attendus, séparément", async () => {
    expect((await getSpecificities()).map((s) => s.name)).toEqual(["Vegan", "Sans gluten", "Sans lactose"]);
    expect((await getAllergens()).map((a) => a.name)).toEqual(["Gluten", "Œufs", "Lait", "Fruits à coque"]);
  });
});

describe("getRecipeSpecificities / getRecipeAllergens", () => {
  it("distingue confirmed et proposed pour une même recette", async () => {
    const tarte = (await getRecipes()).find((r) => r.slug === "tarte-au-citron-hennessy")!;
    const specificities = await getRecipeSpecificities(tarte.id);
    expect(specificities).toHaveLength(1);
    expect(specificities[0].status).toBe("proposed");

    const allergens = await getRecipeAllergens(tarte.id);
    expect(allergens.some((a) => a.status === "confirmed")).toBe(true);
    expect(allergens.some((a) => a.status === "proposed")).toBe(true);
  });
});

describe("getRecipesForSpecificity", () => {
  it("retrouve la recette vegan confirmée", async () => {
    const recipes = await getRecipesForSpecificity("vegan");
    expect(recipes.map((r) => r.slug)).toEqual(["pain-aux-noisettes-demo"]);
  });
});

describe("getRecipesForAllergen", () => {
  it("retrouve toutes les recettes contenant un allergène donné, tous statuts confondus", async () => {
    const recipes = await getRecipesForAllergen("gluten");
    expect(recipes.length).toBeGreaterThanOrEqual(3);
  });
});
