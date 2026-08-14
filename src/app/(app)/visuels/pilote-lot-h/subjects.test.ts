import { beforeEach, describe, expect, it } from "vitest";
import { seedVisualAssetsStore } from "@/lib/visuals/storage";
import { DEMO_VISUAL_ASSETS } from "@/lib/visuals/fixtures/demo-examples";
import { resolveLotHSubjects } from "./subjects";

beforeEach(() => {
  seedVisualAssetsStore([...DEMO_VISUAL_ASSETS]);
});

describe("resolveLotHSubjects — 7 sujets du lot H", () => {
  it("résout exactement 7 sujets réels, groupés correctement", async () => {
    const subjects = await resolveLotHSubjects();
    expect(subjects).toHaveLength(7);
    expect(subjects.map((s) => s.key)).toEqual([
      "tarte-au-citron",
      "ambiance-hennessy",
      "recettes-de-base",
      "chocolat",
      "vanille",
      "noisette",
      "poire",
    ]);
    expect(subjects.find((s) => s.key === "tarte-au-citron")?.group).toBe("recipe");
    expect(subjects.find((s) => s.key === "ambiance-hennessy")?.group).toBe("source");
    expect(subjects.find((s) => s.key === "recettes-de-base")?.group).toBe("sourceCategory");
    for (const key of ["chocolat", "vanille", "noisette", "poire"]) {
      expect(subjects.find((s) => s.key === key)?.group).toBe("ingredient");
    }
  });

  it("chaque prompt contient le format carré/ivoire opaque et ses propres exclusions, jamais 'transparent' demandé", async () => {
    for (const subject of await resolveLotHSubjects()) {
      expect(subject.prompt).toContain("Format : carré 1:1, fond ivoire opaque");
      expect(subject.prompt).toContain("Exclusions impératives");
      expect(subject.prompt).not.toMatch(/fond transparent\b/i);
    }
  });

  it("aucun sujet ne mentionne un autre sujet du lot dans son propre prompt (contenu jamais mélangé)", async () => {
    const subjects = await resolveLotHSubjects();
    const chocolat = subjects.find((s) => s.key === "chocolat")!;
    expect(chocolat.prompt.toLowerCase()).not.toContain("citron");
    expect(chocolat.prompt.toLowerCase()).not.toContain("pistache");
    const tarte = subjects.find((s) => s.key === "tarte-au-citron")!;
    expect(tarte.prompt.toLowerCase()).not.toContain("pistache");
  });

  it("vérification dynamique : les sujets déjà approuvés dans le fixture démo (Tarte au citron, Recettes de base) sont marqués alreadyApproved, jamais un doublon", async () => {
    const subjects = await resolveLotHSubjects();
    expect(subjects.find((s) => s.key === "tarte-au-citron")?.alreadyApproved).toBe(true);
    expect(subjects.find((s) => s.key === "recettes-de-base")?.alreadyApproved).toBe(true);
    // Hennessy (source) n'a qu'un brouillon dans le fixture, jamais approuvé — à générer.
    expect(subjects.find((s) => s.key === "ambiance-hennessy")?.alreadyApproved).toBe(false);
    for (const key of ["chocolat", "vanille", "noisette", "poire"]) {
      expect(subjects.find((s) => s.key === key)?.alreadyApproved).toBe(false);
    }
  });
});
