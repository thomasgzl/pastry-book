import sharp from "sharp";

export interface OptimizedImage {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
}

const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 82;

/**
 * Pipeline UNIQUE d'optimisation avant stockage — mutualisé entre l'import
 * manuel (`persistUploadedVisual`) et la génération IA (`persistGeneratedVisual`),
 * jamais deux implémentations. Oriente selon l'EXIF (`.rotate()` sans
 * argument — lit le tag d'orientation, pivote réellement les pixels, rend le
 * tag obsolète), redimensionne sans jamais agrandir une petite image
 * (`fit: "inside"` + `withoutEnlargement: true`, ratio conservé), convertit
 * en WebP (qualité 82, alpha PNG préservé nativement). Métadonnées
 * (EXIF/GPS…) retirées par omission : sharp ne les réécrit que si
 * `.withMetadata()` est appelé — jamais ici.
 */
export async function optimizeImageForStorage(bytes: Buffer): Promise<OptimizedImage> {
  const originalSize = bytes.length;
  const original = await sharp(bytes).metadata();

  const output = await sharp(bytes)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true })
    .catch((cause: unknown) => {
      const message = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`Traitement de l'image impossible : ${message}`);
    });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[Image optimize] ${(originalSize / 1024 / 1024).toFixed(1)} MB → ${(output.data.length / 1024).toFixed(0)} KB, ` +
        `${original.width ?? "?"}x${original.height ?? "?"} → ${output.info.width}x${output.info.height}, WebP`,
    );
  }

  return {
    buffer: output.data,
    contentType: "image/webp",
    extension: "webp",
    width: output.info.width,
    height: output.info.height,
    originalSize,
    optimizedSize: output.data.length,
  };
}
