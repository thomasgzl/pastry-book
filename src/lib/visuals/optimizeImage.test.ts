import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { optimizeImageForStorage } from "./optimizeImage";

async function makeJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 80 } } }).jpeg().toBuffer();
}

async function makeTransparentPng(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: { r: 10, g: 10, b: 10, alpha: 0 } } }).png().toBuffer();
}

describe("optimizeImageForStorage (K-optim)", () => {
  it("redimensionne une grande photo dans 1600x1600 en conservant le ratio, sortie WebP", async () => {
    const source = await makeJpeg(3024, 4032); // ratio 3:4, type photo smartphone portrait
    const result = await optimizeImageForStorage(source);

    expect(result.contentType).toBe("image/webp");
    expect(result.extension).toBe("webp");
    expect(result.width).toBeLessThanOrEqual(1600);
    expect(result.height).toBeLessThanOrEqual(1600);
    expect(result.height).toBe(1600); // dimension contrainte = la hauteur (plus grande dimension)
    expect(result.width).toBe(1200); // ratio 3:4 conservé (3024/4032 = 1200/1600)
    expect(result.originalSize).toBe(source.length);
    expect(result.optimizedSize).toBeGreaterThan(0);
  });

  it("n'agrandit jamais une petite image (withoutEnlargement)", async () => {
    const source = await makeJpeg(200, 150);
    const result = await optimizeImageForStorage(source);

    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
  });

  it("préserve la transparence d'un PNG après conversion WebP", async () => {
    const source = await makeTransparentPng(100, 100);
    const result = await optimizeImageForStorage(source);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
  });

  it("échec de traitement (octets non-image) : erreur explicite, jamais de buffer silencieusement renvoyé", async () => {
    await expect(optimizeImageForStorage(Buffer.from("pas une image"))).rejects.toThrow();
  });
});
