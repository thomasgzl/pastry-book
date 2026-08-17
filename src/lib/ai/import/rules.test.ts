import { describe, expect, it } from "vitest";
import {
  ambiguousIngredientWarnings,
  proposeAllergensFromIngredients,
  proposeCanonicalIngredientsFromNames,
  proposeSpecificitiesFromIngredients,
} from "./rules";
import type { ExtractedIngredient } from "./types";

function ingredient(originalName: string): ExtractedIngredient {
  return { originalName, originalQuantityText: "10", unit: "g" };
}

describe("proposeAllergensFromIngredients", () => {
  it("détecte gluten/œufs/lait/fruits à coque par mot-clé, toujours en statut proposed (jamais confirmed)", () => {
    const proposals = proposeAllergensFromIngredients([
      ingredient("Farine de blé T65"),
      ingredient("Beurre"),
      ingredient("Œufs"),
      ingredient("Noisette"),
    ]);
    const slugs = proposals.map((p) => p.allergenSlug).sort();
    expect(slugs).toEqual(["fruits-a-coque", "gluten", "lait", "oeufs"]);
    expect(proposals.every((p) => p.status === "proposed")).toBe(true);
  });

  it("ne propose rien pour une liste sans mot-clé connu", () => {
    expect(proposeAllergensFromIngredients([ingredient("Pommes")])).toEqual([]);
  });
});

describe("ambiguousIngredientWarnings", () => {
  it("signale les ingrédients à composition ambiguë sans déduire d'allergène", () => {
    const warnings = ambiguousIngredientWarnings([ingredient("Chocolat"), ingredient("Nappage neutre")]);
    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain("Chocolat");
  });

  it("n'ajoute pas d'avertissement pour un ingrédient déjà couvert par une règle allergène directe", () => {
    expect(ambiguousIngredientWarnings([ingredient("Beurre")])).toEqual([]);
  });
});

describe("proposeSpecificitiesFromIngredients", () => {
  it("propose « Sans gluten » uniquement en statut proposed quand aucun gluten détecté (jamais confirmed)", () => {
    const proposals = proposeSpecificitiesFromIngredients([ingredient("Pommes")], ["sans-gluten", "vegan", "sans-lactose"]);
    const sansGluten = proposals.find((p) => p.specificitySlug === "sans-gluten");
    expect(sansGluten?.status).toBe("proposed");
  });

  it("ne propose pas « Sans gluten » si du gluten est détecté", () => {
    const proposals = proposeSpecificitiesFromIngredients(
      [ingredient("Farine de blé T55")],
      ["sans-gluten"],
    );
    expect(proposals.find((p) => p.specificitySlug === "sans-gluten")).toBeUndefined();
  });
});

describe("proposeCanonicalIngredientsFromNames", () => {
  it("résout un alias existant (ex. « zeste de citron ») vers son canonique, sans modifier le libellé original", () => {
    const [proposal] = proposeCanonicalIngredientsFromNames([ingredient("zeste de citron")]);
    expect(proposal.originalName).toBe("zeste de citron");
    expect(proposal.canonicalIngredientSlug).toBe("citron");
  });

  it("retourne null si aucune correspondance n'existe (jamais une supposition)", () => {
    const [proposal] = proposeCanonicalIngredientsFromNames([ingredient("Farine T55")]);
    expect(proposal.canonicalIngredientSlug).toBeNull();
  });
});
