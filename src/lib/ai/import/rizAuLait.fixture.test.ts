/**
 * Correction ciblée (lot G) : fixture reproduisant exactement le cas
 * signalé par le pilote — recette « Riz au lait Vanille Caramel » à 4
 * préparations (Riz au lait, Caramel, Opaline, Sorbet au lait), extraite
 * jusqu'ici à une seule sur quatre. Mocks uniquement, AUCUN appel réseau
 * réel — voir `openaiProvider.test.ts` pour le mécanisme du mock SDK.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAiCostGuardForTests } from "@/lib/domain/aiCostGuard";

const parseMock = vi.fn();

vi.mock("openai", () => {
  class MockOpenAI {
    responses = { parse: parseMock };
  }
  return { default: MockOpenAI };
});

import { openaiImportProvider } from "./openaiProvider";
import { buildImportDraft } from "./runDemoExtraction";

const FAKE_KEY = "sk-fake-never-sent-anywhere-0000000000";

const FOUR_SECTIONS_RESPONSE = {
  title: "Riz au lait Vanille Caramel",
  procedure: null,
  temperature: null,
  additionalInformation: null,
  sections: [
    {
      name: "Riz au lait",
      procedureText: "Cuire le riz dans le lait vanillé 25 min à feu doux.",
      ingredients: [
        { originalName: "Riz rond", originalQuantityText: "200", unit: "g" },
        { originalName: "Lait", originalQuantityText: "1", unit: "l" },
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
    { name: "Opaline", procedureText: null, ingredients: [{ originalName: "Sucre glace", originalQuantityText: "100", unit: "g" }] },
    {
      name: "Sorbet au lait",
      procedureText: null,
      ingredients: [
        { originalName: "Lait", originalQuantityText: "500", unit: "ml" },
        { originalName: "Sucre", originalQuantityText: "80", unit: "g" },
      ],
    },
  ],
  warnings: [],
  detectedPreparationTitles: ["Riz au lait", "Caramel", "Opaline", "Sorbet au lait"],
  extractedPreparationTitles: ["Riz au lait", "Caramel", "Opaline", "Sorbet au lait"],
  completenessStatus: "complete",
  missingOrUnclearSections: [],
};

/** Reproduit exactement le défaut observé par le pilote : le modèle n'extrait que la première préparation. */
const ONLY_FIRST_SECTION_RESPONSE = {
  ...FOUR_SECTIONS_RESPONSE,
  sections: [FOUR_SECTIONS_RESPONSE.sections[0]],
  extractedPreparationTitles: ["Riz au lait"],
  completenessStatus: "complete", // le modèle prétend "complete" malgré tout : jamais accepté aveuglément
};

beforeEach(() => {
  resetAiCostGuardForTests();
  parseMock.mockReset();
  process.env.OPENAI_API_KEY = FAKE_KEY;
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe("correction lot G — fixture « Riz au lait Vanille Caramel » (4 préparations)", () => {
  it("quatre blocs détectés, quatre blocs extraits", async () => {
    parseMock.mockResolvedValue({ output_parsed: FOUR_SECTIONS_RESPONSE });
    const draft = await buildImportDraft(openaiImportProvider, { name: "riz-au-lait.jpg", type: "image/jpeg", fileBase64: "ZmFrZQ==" });
    expect(draft.completeness.detectedPreparationTitles).toHaveLength(4);
    expect(draft.completeness.extractedPreparationTitles).toHaveLength(4);
    expect(draft.completeness.status).toBe("complete");
  });

  it("ordre des préparations conservé", async () => {
    parseMock.mockResolvedValue({ output_parsed: FOUR_SECTIONS_RESPONSE });
    const draft = await buildImportDraft(openaiImportProvider, { name: "riz-au-lait.jpg", type: "image/jpeg", fileBase64: "ZmFrZQ==" });
    expect(draft.sections.map((s) => s.name)).toEqual(["Riz au lait", "Caramel", "Opaline", "Sorbet au lait"]);
  });

  it("ingrédients attachés à la bonne préparation, jamais fusionnés", async () => {
    parseMock.mockResolvedValue({ output_parsed: FOUR_SECTIONS_RESPONSE });
    const draft = await buildImportDraft(openaiImportProvider, { name: "riz-au-lait.jpg", type: "image/jpeg", fileBase64: "ZmFrZQ==" });
    expect(draft.sections[1].ingredients.map((i) => i.originalName)).toEqual(["Sucre", "Beurre"]);
    expect(draft.sections[3].ingredients.map((i) => i.originalName)).toEqual(["Lait", "Sucre"]);
    // Procédé propre à chaque préparation, jamais fusionné avec celui d'une autre.
    expect(draft.sections[0].originalText).toBe("Cuire le riz dans le lait vanillé 25 min à feu doux.");
    expect(draft.sections[1].originalText).toBe("Cuire le sucre à sec jusqu'à coloration ambrée.");
    expect(draft.sections[2].originalText).toBeNull();
  });

  it("recette principale unique : un seul brouillon, sections dans un seul tableau — jamais 4 recettes", async () => {
    parseMock.mockResolvedValue({ output_parsed: FOUR_SECTIONS_RESPONSE });
    const draft = await buildImportDraft(openaiImportProvider, { name: "riz-au-lait.jpg", type: "image/jpeg", fileBase64: "ZmFrZQ==" });
    expect(draft.title).toBe("Riz au lait Vanille Caramel");
    expect(draft.sections).toHaveLength(4);
  });

  it("reproduit le défaut réel (1 préparation extraite sur 4 détectées) → extraction incomplète bloquée, jamais 'complete'", async () => {
    parseMock.mockResolvedValue({ output_parsed: ONLY_FIRST_SECTION_RESPONSE });
    const draft = await buildImportDraft(openaiImportProvider, { name: "riz-au-lait.jpg", type: "image/jpeg", fileBase64: "ZmFrZQ==" });
    expect(draft.sections).toHaveLength(1);
    expect(draft.completeness.status).not.toBe("complete");
    expect(draft.completeness.status).toBe("needs_review");
  });

  it("plusieurs captures fournies pour la même recette → regroupées en un seul appel, une seule recette", async () => {
    parseMock.mockResolvedValue({ output_parsed: FOUR_SECTIONS_RESPONSE });
    const pages = [
      { name: "page1.jpg", type: "image/jpeg", fileBase64: "cGFnZTE=" },
      { name: "page2.jpg", type: "image/jpeg", fileBase64: "cGFnZTI=" },
    ];
    const draft = await buildImportDraft(openaiImportProvider, pages);
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(draft.originalFiles).toHaveLength(2);
    expect(draft.sections).toHaveLength(4);
    expect(draft.title).toBe("Riz au lait Vanille Caramel");
  });
});
