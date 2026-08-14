import { describe, expect, it } from "vitest";
import { demoImportProvider } from "./demoProvider";
import { runDemoExtraction } from "./runDemoExtraction";

describe("demoImportProvider.extractText", () => {
  it("mode démonstration : aucun fichier hors des 3 exemples n'est traité, jamais de contenu simulé au hasard", async () => {
    const result = await demoImportProvider.extractText({ name: "recette-inconnue.pdf", type: "application/pdf" });
    expect(result.sections).toEqual([]);
    expect(result.title).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("runDemoExtraction — 3 exemples contrôlés (D3)", () => {
  it("(a) CAP : ingrédients seuls, aucune préparation nommée, aucune information complémentaire", async () => {
    const draft = await runDemoExtraction("cap-tarte-pommes");
    expect(draft.title).toBe("Tarte aux pommes (CAP)");
    expect(draft.sections).toHaveLength(1);
    expect(draft.sections[0].name).toBeNull();
    expect(draft.additionalInformation).toBeNull();
    expect(draft.procedure).toBeNull();
    // QS jamais converti.
    const cannelle = draft.sections[0].ingredients.find((i) => i.originalName === "Cannelle");
    expect(cannelle?.originalQuantityText).toBe("QS");
    expect(cannelle?.quantityDecimal).toBeNull();
  });

  it("(b) Hennessy : préparations multiples, informations complémentaires, allergènes proposés", async () => {
    const draft = await runDemoExtraction("hennessy-tartelette-citron");
    expect(draft.sections.map((s) => s.name)).toEqual(["Pâte sucrée", "Crème citron", "Meringue française"]);
    expect(draft.procedure).not.toBeNull();
    expect(draft.additionalInformation).not.toBeNull();
    expect(draft.allergens.length).toBeGreaterThan(0);
    expect(draft.allergens.every((a) => a.status === "proposed")).toBe(true);
  });

  it("(c) capture : quantité illisible → null + À vérifier, jamais une valeur inventée", async () => {
    const draft = await runDemoExtraction("capture-illisible");
    const beurre = draft.sections[0].ingredients.find((i) => i.originalName === "Beurre");
    expect(beurre?.originalQuantityText).toBeNull();
    expect(beurre?.quantityDecimal).toBeNull();
    expect(beurre?.verificationStatus).toBe("needs_review");
    expect(draft.warnings.some((w) => w.includes("Beurre"))).toBe(true);
  });
});
