import { describe, expect, it, vi } from "vitest";
import { computeTargetDimensions, encodeUnderBudget, isHeic, isImageFile, QUALITY_STEPS } from "./imageOptimize";

function blobOfSize(bytes: number): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

describe("computeTargetDimensions", () => {
  it("laisse une image déjà adaptée inchangée", () => {
    expect(computeTargetDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });
  });

  it("redimensionne une grande image à 2400 px max en conservant les proportions", () => {
    expect(computeTargetDimensions(4800, 3600)).toEqual({ width: 2400, height: 1800 });
  });
});

describe("encodeUnderBudget", () => {
  it("accepte dès la première qualité (0,92) si déjà sous le budget", async () => {
    const encode = vi.fn(async () => blobOfSize(2 * 1024 * 1024));
    const result = await encodeUnderBudget(encode);
    expect(result).not.toBeNull();
    expect(result?.quality).toBe(QUALITY_STEPS[0]);
    expect(encode).toHaveBeenCalledTimes(1);
  });

  it("réduit progressivement la qualité jusqu'à passer sous 7 Mo", async () => {
    const sizesByQuality = new Map([
      [0.92, 9 * 1024 * 1024],
      [0.87, 7.5 * 1024 * 1024],
      [0.82, 6 * 1024 * 1024],
    ]);
    const encode = vi.fn(async (quality: number) => blobOfSize(sizesByQuality.get(quality)!));
    const result = await encodeUnderBudget(encode);
    expect(result?.quality).toBe(0.82);
    expect(result!.blob.size).toBeLessThan(7 * 1024 * 1024);
  });

  it("refuse si même la qualité minimale (0,82) reste au-dessus de 7 Mo", async () => {
    const encode = vi.fn(async () => blobOfSize(8 * 1024 * 1024));
    const result = await encodeUnderBudget(encode);
    expect(result).toBeNull();
    expect(encode).toHaveBeenCalledTimes(QUALITY_STEPS.length);
  });

  it("n'appelle jamais fetch (aucun appel IA pendant l'optimisation)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("fetch ne doit jamais être appelé ici");
    });
    await encodeUnderBudget(async () => blobOfSize(1024));
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("détection de format", () => {
  it("reconnaît une image par type MIME ou extension", () => {
    expect(isImageFile(new File([""], "photo.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isImageFile(new File([""], "recette.pdf", { type: "application/pdf" }))).toBe(false);
  });

  it("reconnaît HEIC/HEIF explicitement (jamais un échec silencieux)", () => {
    expect(isHeic(new File([""], "capture.heic", { type: "" }))).toBe(true);
    expect(isHeic(new File([""], "photo.jpg", { type: "image/jpeg" }))).toBe(false);
  });
});
