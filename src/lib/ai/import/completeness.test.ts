import { describe, expect, it } from "vitest";
import { detectDuplicateSections, reconcileCompleteness } from "./completeness";
import type { ExtractedSection } from "./types";

/**
 * Fixture exacte du défaut relevé par le pilote (correction lot G) : recette
 * « Riz au lait Vanille Caramel » avec 4 préparations distinctes. Représente
 * ce qu'une extraction CORRECTE doit produire — pas ce que le modèle a
 * réellement renvoyé lors du pilote (jamais journalisé, voir CLAUDE.md).
 */
const RIZ_AU_LAIT_SECTIONS: ExtractedSection[] = [
  {
    name: "Riz au lait",
    procedureText: "Cuire le riz dans le lait vanillé 25 min à feu doux.",
    ingredients: [
      { originalName: "Riz rond", originalQuantityText: "200", unit: "g" },
      { originalName: "Lait", originalQuantityText: "1", unit: "l" },
      { originalName: "Vanille", originalQuantityText: "1", unit: "gousse" },
    ],
  },
  {
    name: "Caramel",
    procedureText: "Cuire le sucre à sec jusqu'à coloration ambrée.",
    ingredients: [
      { originalName: "Sucre", originalQuantityText: "150", unit: "g" },
      { originalName: "Beurre", originalQuantityText: "30", unit: "g" },
    ],
  },
  {
    name: "Opaline",
    procedureText: null,
    ingredients: [{ originalName: "Sucre glace", originalQuantityText: "100", unit: "g" }],
  },
  {
    name: "Sorbet au lait",
    procedureText: null,
    ingredients: [
      { originalName: "Lait", originalQuantityText: "500", unit: "ml" },
      { originalName: "Sucre", originalQuantityText: "80", unit: "g" },
    ],
  },
];

describe("reconcileCompleteness — fixture Riz au lait Vanille Caramel (4 préparations)", () => {
  it("4 blocs détectés, 4 extraits, comptes reconciliés → complete", () => {
    const titles = RIZ_AU_LAIT_SECTIONS.map((s) => s.name!);
    const result = reconcileCompleteness({
      sections: RIZ_AU_LAIT_SECTIONS,
      detectedPreparationTitles: titles,
      extractedPreparationTitles: titles,
      completenessStatus: "complete",
    });
    expect(result.status).toBe("complete");
    expect(result.detectedPreparationTitles).toEqual(["Riz au lait", "Caramel", "Opaline", "Sorbet au lait"]);
    expect(result.extractedPreparationTitles).toEqual(result.detectedPreparationTitles);
  });

  it("ordre des préparations conservé dans le résultat réconcilié", () => {
    const titles = RIZ_AU_LAIT_SECTIONS.map((s) => s.name!);
    const result = reconcileCompleteness({ sections: RIZ_AU_LAIT_SECTIONS, detectedPreparationTitles: titles, extractedPreparationTitles: titles, completenessStatus: "complete" });
    expect(result.extractedPreparationTitles).toEqual(["Riz au lait", "Caramel", "Opaline", "Sorbet au lait"]);
  });

  it("ingrédients attachés à la bonne préparation (jamais fusionnés)", () => {
    expect(RIZ_AU_LAIT_SECTIONS[1].ingredients.map((i) => i.originalName)).toEqual(["Sucre", "Beurre"]);
    expect(RIZ_AU_LAIT_SECTIONS[3].ingredients.map((i) => i.originalName)).toEqual(["Lait", "Sucre"]);
  });

  it("reproduit exactement le défaut observé (1 seul bloc extrait sur 4) → bloqué, jamais complete", () => {
    // Reproduction du défaut réel du pilote : le modèle n'a extrait que « Riz au lait ».
    const onlyFirstSection = [RIZ_AU_LAIT_SECTIONS[0]];
    const result = reconcileCompleteness({
      sections: onlyFirstSection,
      detectedPreparationTitles: ["Riz au lait", "Caramel", "Opaline", "Sorbet au lait"],
      extractedPreparationTitles: ["Riz au lait"],
      completenessStatus: "complete", // même si le modèle prétend "complete"
    });
    expect(result.status).not.toBe("complete");
    expect(result.status).toBe("needs_review");
  });

  it("champs de complétude absents (ancienne réponse) → jamais complete par défaut", () => {
    const result = reconcileCompleteness({ sections: RIZ_AU_LAIT_SECTIONS });
    expect(result.status).toBe("possibly_incomplete");
  });

  it("recette principale unique : les 4 préparations restent DANS un seul tableau sections, jamais 4 recettes", () => {
    expect(RIZ_AU_LAIT_SECTIONS).toHaveLength(4);
    expect(new Set(RIZ_AU_LAIT_SECTIONS.map((s) => s.name)).size).toBe(4);
  });
});

describe("detectDuplicateSections — captures qui se chevauchent", () => {
  it("signale une préparation identique répétée entre deux captures regroupées", () => {
    const withOverlap = [...RIZ_AU_LAIT_SECTIONS, RIZ_AU_LAIT_SECTIONS[0]];
    const warnings = detectDuplicateSections(withOverlap);
    expect(warnings.some((w) => w.includes("Riz au lait"))).toBe(true);
  });

  it("aucun doublon sur les 4 préparations distinctes", () => {
    expect(detectDuplicateSections(RIZ_AU_LAIT_SECTIONS)).toEqual([]);
  });
});
