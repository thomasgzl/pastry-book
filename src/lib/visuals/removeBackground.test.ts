import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { removeIngredientBackground } from "./removeBackground";

const BACKGROUND: [number, number, number] = [250, 247, 236]; // ~#faf7ec, mesuré sur de vrais visuels
const SUBJECT: [number, number, number] = [60, 110, 50]; // vert feuille, loin du fond

/**
 * Construit un PNG RGBA 10x10 : fond uniforme sur tout le cadre, un carré
 * "sujet" (vert) connecté au centre, et UN pixel isolé couleur fond entouré
 * de sujet (jamais connecté au bord) — le cas qui doit rester intact.
 */
async function buildTestPng(): Promise<Buffer> {
  const size = 10;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inSubjectSquare = x >= 2 && x <= 7 && y >= 2 && y <= 7;
      const isIsolatedBackgroundIsland = x === 4 && y === 4;
      const [r, g, b] = inSubjectSquare && !isIsolatedBackgroundIsland ? SUBJECT : BACKGROUND;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}

async function buildNoisyBorderPng(): Promise<Buffer> {
  const size = 10;
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const onBorder = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      const [r, g, b] = onBorder && (x + y) % 2 === 0 ? [20, 200, 30] : BACKGROUND;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = 255;
    }
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}

async function alphaAt(buffer: Buffer, x: number, y: number): Promise<number> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return data[i + 3];
}

describe("removeIngredientBackground", () => {
  it("rend transparent le fond connecté au bord, préserve le sujet et l'îlot interne isolé", async () => {
    const result = await removeIngredientBackground(await buildTestPng());
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    expect(await alphaAt(result.buffer, 0, 0)).toBe(0); // coin, fond connecté au bord
    expect(await alphaAt(result.buffer, 4, 2)).toBeGreaterThan(200); // sujet, doit rester opaque
    expect(await alphaAt(result.buffer, 4, 4)).toBeGreaterThan(200); // îlot fond isolé au milieu du sujet : jamais touché
  });

  it("retourne needs_review quand le fond des bords est trop irrégulier plutôt que de forcer le traitement", async () => {
    const result = await removeIngredientBackground(await buildNoisyBorderPng());
    expect(result.status).toBe("needs_review");
  });
});
