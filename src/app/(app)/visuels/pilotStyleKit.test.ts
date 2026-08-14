import { describe, expect, it } from "vitest";
import { PILOT_STYLE_DESCRIPTOR, PILOT_EXCLUSIONS, buildPilotPrompt } from "./pilotStyleKit";
import { buildCitronPilotPrompt } from "./pilote/prompt";
import { buildPistachePilotPrompt } from "./pilote-pistache/prompt";

describe("pilotStyleKit — réplique de style Citron → Pistache", () => {
  it("Citron et Pistache partagent EXACTEMENT le même descripteur de style (verbatim)", () => {
    expect(buildCitronPilotPrompt()).toContain(PILOT_STYLE_DESCRIPTOR);
    expect(buildPistachePilotPrompt()).toContain(PILOT_STYLE_DESCRIPTOR);
  });

  it("Citron et Pistache partagent le même format/fond et les mêmes exclusions", () => {
    const citron = buildCitronPilotPrompt();
    const pistache = buildPistachePilotPrompt();
    const formatLine = "Format : carré 1:1, fond ivoire parfaitement uniforme";
    expect(citron).toContain(formatLine);
    expect(pistache).toContain(formatLine);
    for (const exclusion of PILOT_EXCLUSIONS) {
      expect(citron).toContain(exclusion);
      expect(pistache).toContain(exclusion);
    }
  });

  it("jamais 'transparent' demandé au fournisseur dans le texte du prompt (gpt-image-2 ne le supporte pas)", () => {
    expect(buildPilotPrompt("sujet test")).not.toMatch(/fond transparent\b/i);
  });

  it("le contenu Pistache ne mentionne jamais Citron (référence de style seulement, jamais de contenu)", () => {
    expect(buildPistachePilotPrompt().toLowerCase()).not.toContain("citron");
  });

  it("le contenu Citron ne mentionne jamais Pistache", () => {
    expect(buildCitronPilotPrompt().toLowerCase()).not.toContain("pistache");
  });
});
