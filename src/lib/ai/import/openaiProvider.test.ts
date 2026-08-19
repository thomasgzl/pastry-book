/**
 * Tests mocks uniquement (F-IA1) — AUCUN appel réseau réel, aucune vraie
 * clé. Le SDK `openai` est entièrement remplacé par un mock local ; le
 * "OPENAI_API_KEY" utilisé ici est une chaîne factice, jamais envoyée nulle
 * part puisque `responses.parse` est un `vi.fn()`.
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

// Import après le mock (hors chemin réseau : construit seulement un schéma JSON local).
import { demoImportProvider } from "./demoProvider";
import { openaiImportProvider, redactSecrets } from "./openaiProvider";
import { getImportAIProvider } from "./registry";

const FAKE_KEY = "sk-fake-never-sent-anywhere-0000000000";

function minimalParsed(overrides: Record<string, unknown> = {}) {
  return {
    title: "Recette test",
    procedure: null,
    temperature: null,
    additionalInformation: null,
    sections: [],
    warnings: [],
    detectedPreparationTitles: [],
    extractedPreparationTitles: [],
    completenessStatus: "complete",
    missingOrUnclearSections: [],
    proposedKeyIngredientNames: [],
    ...overrides,
  };
}

beforeEach(() => {
  resetAiCostGuardForTests();
  parseMock.mockReset();
  process.env.OPENAI_API_KEY = FAKE_KEY;
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe("openaiImportProvider.extractText — contrat", () => {
  it("texte local exploitable → method local-text, structure conforme au contrat", async () => {
    parseMock.mockResolvedValue({
      output_parsed: minimalParsed({
        sections: [{ name: null, procedureText: null, ingredients: [{ originalName: "Farine", originalQuantityText: "250", unit: "g" }] }],
      }),
    });

    const result = await openaiImportProvider.extractText(
      { name: "recette.txt", type: "text/plain", text: "Farine 250 g" },
      { requestId: "req-contrat" },
    );

    expect(result.method).toBe("local-text");
    expect(result.title).toBe("Recette test");
    expect(result.sections[0].ingredients[0]).toEqual({ originalName: "Farine", originalQuantityText: "250", unit: "g" });
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("aucun texte ni fichier fourni → repli propre sans appeler le modèle", async () => {
    const result = await openaiImportProvider.extractText({ name: "vide.txt", type: "text/plain" }, { requestId: "req-vide" });
    expect(result.method).toBe("manual");
    expect(parseMock).not.toHaveBeenCalled();
  });
});

describe("openaiImportProvider.extractText — refus et sortie invalide", () => {
  it("refus du modèle (output_parsed null) → état d'erreur explicite, jamais un crash", async () => {
    parseMock.mockResolvedValue({ output_parsed: null });
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-refus" },
    );
    expect(result.method).toBe("manual");
    expect(result.sections).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("sortie non conforme au schéma (revalidée après coup) → jamais acceptée telle quelle", async () => {
    parseMock.mockResolvedValue({
      output_parsed: minimalParsed({
        // quantité renvoyée en nombre par le modèle : viole le schéma (doit rester texte ou null).
        sections: [{ name: null, procedureText: null, ingredients: [{ originalName: "Farine", originalQuantityText: 250, unit: "g" }] }],
      }),
    });
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-invalide" },
    );
    expect(result.method).toBe("manual");
    expect(result.sections).toEqual([]);
    expect(result.warnings.some((w) => w.toLowerCase().includes("invalide"))).toBe(true);
  });

  it("erreur API rejetée → gérée proprement, jamais de crash non attrapé", async () => {
    parseMock.mockRejectedValue(new Error("Une erreur est survenue"));
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-erreur" },
    );
    expect(result.method).toBe("manual");
  });
});

describe("openaiImportProvider.extractText — QS et quantité illisible", () => {
  it("QS reste une chaîne textuelle, jamais convertie en nombre", async () => {
    parseMock.mockResolvedValue({
      output_parsed: minimalParsed({
        sections: [{ name: null, procedureText: null, ingredients: [{ originalName: "Cannelle", originalQuantityText: "QS", unit: null }] }],
      }),
    });
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-qs" },
    );
    expect(result.sections[0].ingredients[0].originalQuantityText).toBe("QS");
  });

  it("quantité illisible → null, jamais une valeur inventée, avertissement ajouté (base du needs_review en aval)", async () => {
    parseMock.mockResolvedValue({
      output_parsed: minimalParsed({
        sections: [{ name: null, procedureText: null, ingredients: [{ originalName: "Beurre", originalQuantityText: null, unit: null }] }],
      }),
    });
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-illisible" },
    );
    const beurre = result.sections[0].ingredients[0];
    expect(beurre.originalQuantityText).toBeNull();
    expect(result.warnings.some((w) => w.includes("Beurre"))).toBe(true);
  });
});

describe("openaiImportProvider.extractText — aucune information inventée", () => {
  it("procédé/température/informations complémentaires absents du mock restent null en sortie", async () => {
    parseMock.mockResolvedValue({ output_parsed: minimalParsed() });
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-sans-invention" },
    );
    expect(result.procedure).toBeNull();
    expect(result.temperature).toBeNull();
    expect(result.additionalInformation).toBeNull();
  });
});

describe("protection de la clé API", () => {
  it("redactSecrets masque un motif de clé OpenAI dans un message", () => {
    const message = "Unauthorized: sk-thisisasecretfakekey1234567890abcdef";
    const redacted = redactSecrets(message);
    expect(redacted).not.toContain("sk-thisisasecretfakekey1234567890abcdef");
    expect(redacted).toContain("[clé masquée]");
  });

  it("une erreur contenant une clé n'apparaît jamais telle quelle dans les avertissements renvoyés", async () => {
    parseMock.mockRejectedValue(new Error("Unauthorized: sk-thisisasecretfakekey1234567890abcdef"));
    const result = await openaiImportProvider.extractText(
      { name: "x.txt", type: "text/plain", text: "contenu" },
      { requestId: "req-cle" },
    );
    const joined = result.warnings.join(" ");
    expect(joined).not.toContain("sk-thisisasecretfakekey1234567890abcdef");
  });

  it("sans clé API configurée → repli propre, jamais une erreur bloquante, aucun appel réel", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await openaiImportProvider.extractText({ name: "x.txt", type: "text/plain", text: "contenu" });
    expect(result.method).toBe("manual");
    expect(parseMock).not.toHaveBeenCalled();
  });
});

describe("garde de coût — anti-double-clic / idempotence", () => {
  it("deux appels d'extraction rapprochés : le second est refusé (délai minimal non écoulé), aucun doublon d'appel payant", async () => {
    parseMock.mockResolvedValue({ output_parsed: minimalParsed() });
    const first = await openaiImportProvider.extractText(
      { name: "a.txt", type: "text/plain", text: "contenu a" },
      { requestId: "req-a" },
    );
    const second = await openaiImportProvider.extractText(
      { name: "b.txt", type: "text/plain", text: "contenu b" },
      { requestId: "req-b" },
    );
    expect(first.method).toBe("local-text");
    expect(second.method).toBe("manual");
    expect(second.warnings[0]).toContain("garde de coût");
    expect(parseMock).toHaveBeenCalledTimes(1);
  });
});

describe("getImportAIProvider — sélection du fournisseur (registry)", () => {
  it("sans clé API → fournisseur de démonstration", () => {
    delete process.env.OPENAI_API_KEY;
    expect(getImportAIProvider()).toBe(demoImportProvider);
  });

  it("avec clé API → adaptateur OpenAI réel", () => {
    process.env.OPENAI_API_KEY = FAKE_KEY;
    expect(getImportAIProvider()).toBe(openaiImportProvider);
  });
});
