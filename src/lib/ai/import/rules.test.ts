import { describe, expect, it } from "vitest";
import type { CanonicalIngredient, IngredientAlias } from "@/lib/domain/schemas";
import {
  ambiguousIngredientWarnings,
  normalizeKeyIngredientName,
  proposeAllergensFromIngredients,
  proposeCanonicalIngredientsFromNames,
  proposeSpecificitiesFromIngredients,
  resolveKeyIngredientTags,
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

describe("normalizeKeyIngredientName (F-KEY1)", () => {
  it("retire les préfixes jus/zeste/purée/poudre/pâte de, sans toucher au libellé original de la recette", () => {
    expect(normalizeKeyIngredientName("jus de citron")).toBe("Citron");
    expect(normalizeKeyIngredientName("Zeste de citron")).toBe("Citron");
    expect(normalizeKeyIngredientName("purée de framboise")).toBe("Framboise");
    expect(normalizeKeyIngredientName("Poudre de noisette")).toBe("Noisette");
    expect(normalizeKeyIngredientName("pâte de pistache")).toBe("Pistache");
  });

  it("regroupe les variantes de chocolat vers les 4 tags attendus, jamais si une variante est explicitement nommée", () => {
    expect(normalizeKeyIngredientName("Chocolat")).toBe("Chocolat noir");
    expect(normalizeKeyIngredientName("Chocolat 70%")).toBe("Chocolat noir");
    expect(normalizeKeyIngredientName("Chocolat noir")).toBe("Chocolat noir");
    expect(normalizeKeyIngredientName("Couverture 64%")).toBe("Chocolat noir");
    expect(normalizeKeyIngredientName("Chocolat au lait")).toBe("Chocolat au lait");
    expect(normalizeKeyIngredientName("Chocolat blanc")).toBe("Chocolat blanc");
    expect(normalizeKeyIngredientName("Dulcey")).toBe("Chocolat blond Dulcey");
    expect(normalizeKeyIngredientName("Chocolat noisette")).toBe("Chocolat noisette");
  });

  it("retourne null pour un nom vide après nettoyage, jamais un tag inventé", () => {
    expect(normalizeKeyIngredientName("   ")).toBeNull();
  });
});

describe("resolveKeyIngredientTags (F-KEY1, dédoublonnage à la proposition)", () => {
  const CITRON: CanonicalIngredient = { id: "id-citron", name: "Citron", slug: "citron", parentId: null, containsGluten: "unknown", containsLactose: "unknown", containsTreeNuts: "unknown" };
  const NOISETTE: CanonicalIngredient = { id: "id-noisette", name: "Noisette", slug: "noisette", parentId: null, containsGluten: "unknown", containsLactose: "unknown", containsTreeNuts: "unknown" };
  const CANONICAL = [CITRON, NOISETTE];
  const ALIASES: IngredientAlias[] = [
    { id: "alias-1", canonicalIngredientId: NOISETTE.id, alias: "éclats de noisette", normalizedAlias: "eclats de noisette", status: "confirmed" },
  ];

  it("résout un nom déjà proche du canonique existant (comparaison directe, insensible casse/accents)", () => {
    const [tag] = resolveKeyIngredientTags(["citron"], CANONICAL, []);
    expect(tag).toEqual({ kind: "existing", canonicalIngredientId: CITRON.id, name: CITRON.name });
  });

  it("résout via un alias déjà enregistré quand le nom ne correspond pas directement au canonique", () => {
    const [tag] = resolveKeyIngredientTags(["éclats de noisette"], CANONICAL, ALIASES);
    expect(tag).toEqual({ kind: "existing", canonicalIngredientId: NOISETTE.id, name: NOISETTE.name });
  });

  it("propose un nouveau tag quand aucune correspondance n'existe (jamais une supposition)", () => {
    const [tag] = resolveKeyIngredientTags(["Framboise"], CANONICAL, []);
    expect(tag).toEqual({ kind: "new", name: "Framboise", slug: "framboise" });
  });

  it("dédoublonne deux propositions équivalentes (même slug), jamais deux tags pour la même matière", () => {
    const tags = resolveKeyIngredientTags(["Framboise", "framboises"], CANONICAL, []);
    expect(tags).toHaveLength(1);
  });

  it("jamais plus de 6 tags", () => {
    const tags = resolveKeyIngredientTags(
      ["A", "B", "C", "D", "E", "F", "G", "H"].map((letter) => `Ingrédient ${letter}`),
      [],
      [],
    );
    expect(tags).toHaveLength(6);
  });

  it("liste vide → aucun tag (zéro accepté, jamais une invention pour atteindre un minimum)", () => {
    expect(resolveKeyIngredientTags([], CANONICAL, [])).toEqual([]);
  });
});
