import { describe, expect, it } from "vitest";
import {
  PRESET_EXCLUSIONS,
  VISUAL_PRESET,
  VISUAL_PRESET_VERSION,
  buildVisualPrompt,
  getSubjectFraming,
} from "./preset";

describe("preset Botanique éditorial (E2)", () => {
  it("expose une version stable", () => {
    expect(VISUAL_PRESET_VERSION).toBe("v1");
    expect(VISUAL_PRESET.version).toBe("v1");
  });

  it("n'expose qu'un seul preset (pas de duplication par type d'usage)", () => {
    expect(VISUAL_PRESET.basePrompt.length).toBeGreaterThan(0);
  });

  it.each([
    ["ingredient", "1:1", "transparent"],
    ["recipe", "4:3", "ivoire"],
    ["source", "16:9", "ivoire"],
    ["sourceCategory", "4:3", "ivoire"],
  ] as const)("cadrage %s : ratio %s, fond %s", (kind, ratio, background) => {
    const framing = getSubjectFraming(kind);
    expect(framing.ratio).toBe(ratio);
    expect(framing.background).toBe(background);
  });

  it("inclut le texte commun, le sujet et toutes les exclusions dans le prompt final", () => {
    const prompt = buildVisualPrompt({ kind: "ingredient", subjectLabel: "Citron" });
    expect(prompt).toContain(VISUAL_PRESET.basePrompt);
    expect(prompt).toContain("Citron");
    for (const exclusion of PRESET_EXCLUSIONS) {
      expect(prompt).toContain(exclusion);
    }
  });

  it("distingue le mode photo et description pour une recette", () => {
    const photo = buildVisualPrompt({ kind: "recipe", subjectLabel: "Tarte au citron", recipeMode: "photo" });
    const description = buildVisualPrompt({ kind: "recipe", subjectLabel: "Tarte au citron", recipeMode: "description" });
    expect(photo).toContain("photo fournie");
    expect(description).toContain("ne pas inventer de décoration complexe");
    expect(photo).not.toBe(description);
  });

  it("affine le symbole d'une catégorie connue sans casser une catégorie inconnue", () => {
    const known = buildVisualPrompt({ kind: "sourceCategory", subjectLabel: "Recettes de base", categorySlug: "recettes-de-base" });
    expect(known).toContain("poche à douille");

    const unknown = buildVisualPrompt({ kind: "sourceCategory", subjectLabel: "Nouvelle catégorie", categorySlug: "inconnue" });
    expect(unknown).toContain("Nouvelle catégorie");
  });

  it("n'invente jamais aucune personne, texte ou logo (exclusions toujours explicites)", () => {
    expect(PRESET_EXCLUSIONS.join(" ")).toMatch(/personne/);
    expect(PRESET_EXCLUSIONS.join(" ")).toMatch(/texte/);
    expect(PRESET_EXCLUSIONS.join(" ")).toMatch(/logo/);
    expect(PRESET_EXCLUSIONS.join(" ")).toMatch(/photoréalisme/);
  });
});
