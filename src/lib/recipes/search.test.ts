import { describe, expect, it } from "vitest";
import { normalizeText, recipeIdsForCanonicalIngredientId, resolveCanonicalIngredientId, searchAll } from "./search";

describe("normalizeText", () => {
  it("retire les accents et met en minuscule", () => {
    expect(normalizeText("Crème Pâtissière")).toBe("creme patissiere");
  });

  it("réduit les espaces superflus", () => {
    expect(normalizeText("  Jus   de   citron  ")).toBe("jus de citron");
  });
});

describe("resolveCanonicalIngredientId", () => {
  it("résout un alias vers sa matière canonique sans modifier le libellé fourni", () => {
    const label = "Zeste de citron";
    const id = resolveCanonicalIngredientId(label);
    expect(id).not.toBeNull();
    expect(label).toBe("Zeste de citron");
  });

  it("résout les trois alias citron vers le même id canonique", () => {
    const jus = resolveCanonicalIngredientId("jus de citron");
    const zeste = resolveCanonicalIngredientId("zeste de citron");
    const puree = resolveCanonicalIngredientId("purée de citron");
    expect(jus).toBe(zeste);
    expect(zeste).toBe(puree);
    expect(jus).not.toBeNull();
  });

  it("ignore accent/casse lors de la résolution", () => {
    expect(resolveCanonicalIngredientId("ZESTE DE CITRON")).toBe(resolveCanonicalIngredientId("zeste de citron"));
    expect(resolveCanonicalIngredientId("Purée De Citron")).toBe(resolveCanonicalIngredientId("puree de citron"));
  });

  it("retourne null pour un libellé sans alias connu", () => {
    expect(resolveCanonicalIngredientId("Farine T55")).toBeNull();
  });
});

describe("recipeIdsForCanonicalIngredientId", () => {
  it("retrouve les recettes contenant jus/zeste/purée de citron sans changer les libellés", () => {
    const citronId = resolveCanonicalIngredientId("jus de citron");
    const ids = recipeIdsForCanonicalIngredientId(citronId!);
    // Seule « Tarte au citron (Hennessy) » utilise du citron dans le jeu démo.
    expect(ids.size).toBe(1);
  });
});

describe("searchAll", () => {
  it("retourne des groupes vides pour une requête vide", () => {
    const results = searchAll("   ");
    expect(results.sources).toHaveLength(0);
    expect(results.recipes).toHaveLength(0);
    expect(results.canonicalIngredients).toHaveLength(0);
    expect(results.categories).toHaveLength(0);
  });

  it("« citron » retrouve la matière canonique Citron et la recette correspondante", () => {
    const results = searchAll("citron");
    expect(results.canonicalIngredients.map((i) => i.name)).toContain("Citron");
    expect(results.recipes.map((r) => r.title)).toContain("Tarte au citron (Hennessy)");
  });

  it("ignore accent/casse", () => {
    const withAccent = searchAll("Citron");
    const withoutAccent = searchAll("citron");
    expect(withAccent).toEqual(withoutAccent);
  });

  it("« hennessy » retrouve la source", () => {
    const results = searchAll("hennessy");
    expect(results.sources.map((s) => s.name)).toContain("Hennessy");
  });

  it("chaque catégorie trouvée indique son entreprise parente", () => {
    const results = searchAll("desserts");
    expect(results.categories.length).toBeGreaterThan(0);
    for (const category of results.categories) {
      expect(category.sourceName).toBe("Hennessy");
    }
  });

  it("ne mélange jamais les catégories Hennessy avec une autre source", () => {
    const results = searchAll("desserts");
    expect(results.categories.every((category) => category.sourceName === "Hennessy")).toBe(true);
  });

  it("distingue les deux recettes homonymes « Crème pâtissière » par leur source", () => {
    const results = searchAll("Crème pâtissière");
    expect(results.recipes).toHaveLength(2);
    const sourceNames = results.recipes.map((r) => r.sourceName).sort();
    expect(sourceNames).toEqual(["CAP Pâtissier", "Hennessy"]);
  });

  it("recherche sans résultat renvoie des groupes vides", () => {
    const results = searchAll("xyzabc-inexistant");
    expect(results.sources).toHaveLength(0);
    expect(results.recipes).toHaveLength(0);
    expect(results.canonicalIngredients).toHaveLength(0);
    expect(results.categories).toHaveLength(0);
  });
});
