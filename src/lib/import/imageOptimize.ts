/**
 * Optimisation client d'une image avant extraction réelle (lot G2-bis) —
 * jamais l'original modifié/écrasé, jamais d'appel réseau ici. Utilisé
 * uniquement par le pilote IA réel (`PilotExtractionPanel.tsx`).
 *
 * Orientation EXIF : déléguée au décodage natif du navigateur
 * (`createImageBitmap` sans option `imageOrientation` applique
 * `"from-image"` par défaut dans les navigateurs modernes — Chrome,
 * Firefox, Safari récents) plutôt qu'un parseur EXIF maison. Non testable en
 * environnement jsdom (aucun vrai décodage d'image) — comportement du
 * navigateur, pas de cette fonction.
 */

export const MAX_DIMENSION = 2400;
export const TARGET_MAX_BYTES = 7 * 1024 * 1024;
/** 0,92 → 0,82 : jamais en dessous (préserve la lisibilité des petits textes/quantités). */
export const QUALITY_STEPS = [0.92, 0.87, 0.82] as const;

const HEIC_TYPES = new Set(["image/heic", "image/heif"]);

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif|gif|bmp)$/i.test(file.name);
}

export function isHeic(file: File): boolean {
  return HEIC_TYPES.has(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = MAX_DIMENSION,
): { width: number; height: number } {
  const largest = Math.max(width, height);
  if (largest <= maxDimension) return { width, height };
  const scale = maxDimension / largest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export type EncodeFn = (quality: number) => Promise<Blob>;

/**
 * Boucle de qualité déterministe 0,92 → 0,82 — logique pure testable sans
 * navigateur réel (`encode` fait le vrai travail canvas côté appelant).
 * Retourne `null` si même la qualité minimale reste au-dessus du budget :
 * refus explicite, jamais une image dégradée en dessous de 0,82.
 */
export async function encodeUnderBudget(encode: EncodeFn, maxBytes: number = TARGET_MAX_BYTES): Promise<{ blob: Blob; quality: number } | null> {
  let last: { blob: Blob; quality: number } | null = null;
  for (const quality of QUALITY_STEPS) {
    const blob = await encode(quality);
    last = { blob, quality };
    if (blob.size <= maxBytes) return last;
  }
  return null;
}

export type OptimizeOutcome =
  | { status: "unsupported-format"; message: string }
  | { status: "too-large"; message: string }
  | { status: "ok"; blob: Blob; width: number; height: number; quality: number };

/** Orchestrateur DOM (canvas réel) — non exécuté par les tests unitaires, voir `encodeUnderBudget`/`computeTargetDimensions` pour la logique testée. */
export async function optimizeImageFile(file: File): Promise<OptimizeOutcome> {
  if (isHeic(file)) {
    return {
      status: "unsupported-format",
      message: "Format HEIC/HEIF non pris en charge pour l'instant — convertissez l'image en JPEG, PNG ou WebP avant de l'importer.",
    };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { status: "unsupported-format", message: "Ce format d'image n'a pas pu être décodé par le navigateur." };
  }

  const { width, height } = computeTargetDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { status: "unsupported-format", message: "Optimisation d'image indisponible sur ce navigateur." };
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const result = await encodeUnderBudget(
    (quality) =>
      new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Échec d'encodage WebP."))), "image/webp", quality);
      }),
  );

  if (!result) {
    return {
      status: "too-large",
      message: `Image toujours supérieure à ${TARGET_MAX_BYTES / (1024 * 1024)} Mo après optimisation (qualité minimale ${QUALITY_STEPS[QUALITY_STEPS.length - 1]}) — réduisez-la manuellement avant de réessayer.`,
    };
  }

  return { status: "ok", blob: result.blob, width, height, quality: result.quality };
}
