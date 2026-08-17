import { beforeEach, describe, expect, it } from "vitest";
import { approveVisualAsset, getVisualAssetById, listVisualAssets, seedVisualAssetsStore } from "@/lib/visuals/storage";
import { VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import { generateVisualDraft, regenerateVisualDraft } from "./service";

const SUBJECT = { subjectType: "ingredient" as const, subjectId: "00000000-0000-4000-8000-000000009101" };

beforeEach(() => {
  seedVisualAssetsStore([]);
});

describe("generateVisualDraft (E1/E3)", () => {
  it("consomme le preset E2 (version + prompt) et le fournisseur actif", async () => {
    const asset = await generateVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });
    expect(asset.presetVersion).toBe(VISUAL_PRESET_VERSION);
    expect(asset.prompt).toContain("Citron");
    expect(asset.status).toBe("draft");
    expect(asset.imageUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("RÈGLE NON NÉGOCIABLE : générer à nouveau pour un sujet déjà approuvé ne touche jamais l'existant", async () => {
    const first = await generateVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });
    const approved = await approveVisualAsset(first.id);
    expect(approved.isPrimary).toBe(true);

    const second = await generateVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });

    expect(second.id).not.toBe(approved.id);
    expect(second.status).toBe("draft");
    expect(await getVisualAssetById(approved.id)).toEqual(approved);
    expect(await listVisualAssets(SUBJECT.subjectType, SUBJECT.subjectId)).toHaveLength(2);
  });

  it("régénère à partir d'un asset existant sans le modifier", async () => {
    const original = await generateVisualDraft({ ...SUBJECT, subjectLabel: "Pistache" });
    const regenerated = await regenerateVisualDraft(original.id, "Pistache");

    expect(regenerated.id).not.toBe(original.id);
    expect(await getVisualAssetById(original.id)).toEqual(original);
  });

  it("régénérer un identifiant inconnu échoue explicitement", async () => {
    await expect(regenerateVisualDraft("00000000-0000-4000-8000-999999999999", "Sujet")).rejects.toThrow();
  });
});
