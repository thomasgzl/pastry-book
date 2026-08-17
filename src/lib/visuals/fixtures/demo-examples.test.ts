import { describe, expect, it } from "vitest";
import { visualAssetSchema } from "@/lib/domain/schemas";
import { VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import { DEMO_VISUAL_ASSETS } from "./demo-examples";

describe("DEMO_VISUAL_ASSETS (E4, mode démonstration uniquement)", () => {
  it("respecte strictement le contrat gelé visualAssetSchema", () => {
    for (const asset of DEMO_VISUAL_ASSETS) {
      expect(() => visualAssetSchema.parse(asset)).not.toThrow();
    }
  });

  it("couvre exactement les cinq sujets de référence demandés", () => {
    const subjects = new Set(DEMO_VISUAL_ASSETS.map((asset) => `${asset.subjectType}:${asset.subjectId}`));
    expect(subjects.size).toBe(5);
  });

  it("couvre les trois statuts (brouillon, approuvé, rejeté)", () => {
    const statuses = new Set(DEMO_VISUAL_ASSETS.map((asset) => asset.status));
    expect(statuses).toEqual(new Set(["draft", "approved", "rejected"]));
  });

  it("tous générés avec le preset v1 courant", () => {
    for (const asset of DEMO_VISUAL_ASSETS) {
      expect(asset.presetVersion).toBe(VISUAL_PRESET_VERSION);
    }
  });

  it("jamais plus d'un principal par sujet, et un principal est toujours approuvé", () => {
    const primaryBySubject = new Map<string, number>();
    for (const asset of DEMO_VISUAL_ASSETS) {
      if (!asset.isPrimary) continue;
      expect(asset.status).toBe("approved");
      const key = `${asset.subjectType}:${asset.subjectId}`;
      primaryBySubject.set(key, (primaryBySubject.get(key) ?? 0) + 1);
    }
    for (const count of primaryBySubject.values()) {
      expect(count).toBe(1);
    }
  });

  it("l'ambiance Hennessy ne reproduit aucun logo (aucune mention dans le prompt final)", () => {
    const hennessy = DEMO_VISUAL_ASSETS.find((asset) => asset.subjectType === "source");
    expect(hennessy).toBeDefined();
    expect(hennessy!.prompt.toLowerCase()).not.toContain("logo hennessy");
    expect(hennessy!.prompt).toContain("aucune lettre ni logo inventé");
    // Ambiance sensible : reste en attente de validation humaine, jamais publiée d'office.
    expect(hennessy!.status).toBe("draft");
  });

  it("la recette Tarte au citron conserve sa photo source à côté de l'illustration", () => {
    const recipeAsset = DEMO_VISUAL_ASSETS.find((asset) => asset.subjectType === "recipe");
    expect(recipeAsset?.sourcePhotoUrl).toBeTruthy();
  });

  it("Pistache illustre le cycle rejeté -> régénéré (deux variantes, aucune principale)", () => {
    const pistacheAssets = DEMO_VISUAL_ASSETS.filter(
      (asset) => asset.subjectType === "ingredient" && asset.subjectId === DEMO_VISUAL_ASSETS[1].subjectId,
    );
    expect(pistacheAssets).toHaveLength(2);
    expect(pistacheAssets.some((asset) => asset.status === "rejected")).toBe(true);
    expect(pistacheAssets.some((asset) => asset.status === "draft")).toBe(true);
    expect(pistacheAssets.every((asset) => !asset.isPrimary)).toBe(true);
  });
});
