import { describe, expect, it } from "vitest";
import { demoImageProvider, renderDemoIllustrationSvg } from "./demo-provider";

describe("demoImageProvider (E1, mode démonstration)", () => {
  it("ne consomme aucune clé et n'a aucun coût", () => {
    expect(demoImageProvider.costPerImageEstimateEur).toBe(0);
    expect(demoImageProvider.name).toMatch(/démonstration/i);
  });

  it("est déterministe : même prompt/ratio -> même image", async () => {
    const request = { prompt: "Citron, étude botanique", ratio: "1:1" as const, background: "transparent" as const };
    const first = await demoImageProvider.generate(request);
    const second = await demoImageProvider.generate(request);
    expect(first.imageUrl).toBe(second.imageUrl);
  });

  it("produit une image différente pour un prompt différent", async () => {
    const a = await demoImageProvider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
    const b = await demoImageProvider.generate({ prompt: "Pistache", ratio: "1:1", background: "transparent" });
    expect(a.imageUrl).not.toBe(b.imageUrl);
  });

  it("ne génère jamais de texte intégré (aucune balise <text> dans le SVG)", () => {
    const svg = renderDemoIllustrationSvg("Tarte au citron", "4:3");
    expect(svg).not.toMatch(/<text/i);
    expect(svg).toContain("<title>");
  });

  it("retourne une data URI valide", async () => {
    const result = await demoImageProvider.generate({ prompt: "Hennessy", ratio: "16:9", background: "ivoire" });
    expect(result.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
