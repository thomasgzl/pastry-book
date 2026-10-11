import sharp from "sharp";

/**
 * Suppression de fond déterministe (chroma-key + flood-fill), PAS un modèle
 * IA/segmentation — le fond des illustrations « Botanique éditorial » est un
 * aplat quasi uniforme (mesuré en direct sur de vrais visuels approuvés :
 * #f8f4ec–#fefbf4), donc un flood-fill depuis les bords suffit et reste
 * prévisible/gratuit, contrairement à un modèle de segmentation.
 *
 * Connectivité stricte : seuls les pixels ATTEIGNABLE depuis un bord de
 * l'image en restant sous `outerThreshold` deviennent transparents. Une zone
 * interne de couleur proche du fond (reflet clair sur une feuille, pistil
 * blanc) mais non connectée au bord n'est JAMAIS touchée — c'est cette
 * connectivité, pas la seule couleur, qui protège les détails fins.
 */

export interface RemoveBackgroundOptions {
  /** Distance couleur (0–~441, racine de la somme des carrés RGB) sous laquelle un pixel connecté au fond devient entièrement transparent. */
  innerThreshold?: number;
  /** Distance au-delà de laquelle un pixel reste entièrement opaque, même connecté au fond — dégradé entre les deux seuils (contour adouci, jamais dur). */
  outerThreshold?: number;
  /** Écart-type couleur maximum toléré sur l'échantillon des 4 bords pour juger le fond « uniforme » — au-delà, le fond est jugé trop complexe pour un traitement automatique sûr. */
  maxBorderStdDev?: number;
}

export type RemoveBackgroundResult =
  | { status: "ok"; buffer: Buffer; backgroundColor: [number, number, number] }
  | { status: "needs_review"; reason: string };

const DEFAULT_OPTIONS: Required<RemoveBackgroundOptions> = {
  innerThreshold: 10,
  outerThreshold: 28,
  maxBorderStdDev: 14,
};

type Rgb = [number, number, number];

function readRgb(data: Buffer, width: number, channels: number, x: number, y: number): Rgb {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}

function meanRgb(samples: Rgb[]): Rgb {
  const sum = samples.reduce<Rgb>((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]);
  return [sum[0] / samples.length, sum[1] / samples.length, sum[2] / samples.length];
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function stdDevRgb(samples: Rgb[], mean: Rgb): number {
  const variance = samples.reduce((acc, rgb) => acc + colorDistance(rgb, mean) ** 2, 0) / samples.length;
  return Math.sqrt(variance);
}

/**
 * Traite une illustration déjà décodable par Sharp (PNG/WebP/JPEG, avec ou
 * sans alpha) : estime le fond depuis les bords, propage par flood-fill,
 * applique une transparence dure proche du fond et progressive près des
 * seuils. Ne lève jamais pour un fond simplement non uniforme — retourne
 * `needs_review` plutôt que de risquer un recadrage silencieux agressif ;
 * seules une image illisible par Sharp ou une entrée invalide font lever.
 */
export async function removeIngredientBackground(
  input: Buffer,
  options: RemoveBackgroundOptions = {},
): Promise<RemoveBackgroundResult> {
  const { innerThreshold, outerThreshold, maxBorderStdDev } = { ...DEFAULT_OPTIONS, ...options };

  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  if (width < 3 || height < 3) {
    return { status: "needs_review", reason: "Image trop petite pour une estimation de fond fiable." };
  }

  const borderSamples: Rgb[] = [];
  for (let x = 0; x < width; x++) {
    borderSamples.push(readRgb(data, width, channels, x, 0));
    borderSamples.push(readRgb(data, width, channels, x, height - 1));
  }
  for (let y = 0; y < height; y++) {
    borderSamples.push(readRgb(data, width, channels, 0, y));
    borderSamples.push(readRgb(data, width, channels, width - 1, y));
  }

  const backgroundColor = meanRgb(borderSamples);
  const borderStdDev = stdDevRgb(borderSamples, backgroundColor);
  if (borderStdDev > maxBorderStdDev) {
    return {
      status: "needs_review",
      reason: `Fond des bords trop irrégulier (écart-type ${borderStdDev.toFixed(1)} > seuil ${maxBorderStdDev}) — vérification manuelle requise.`,
    };
  }

  // Flood-fill depuis les 4 bords, seuil large (outerThreshold) : détermine UNIQUEMENT quels
  // pixels sont connectés au fond extérieur, pas encore leur transparence finale.
  const pixelCount = width * height;
  const connectedToBackground = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueTail = 0;

  function enqueueIfBackground(x: number, y: number): void {
    const idx = y * width + x;
    if (connectedToBackground[idx]) return;
    if (colorDistance(readRgb(data, width, channels, x, y), backgroundColor) > outerThreshold) return;
    connectedToBackground[idx] = 1;
    queue[queueTail++] = idx;
  }

  for (let x = 0; x < width; x++) {
    enqueueIfBackground(x, 0);
    enqueueIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfBackground(0, y);
    enqueueIfBackground(width - 1, y);
  }

  for (let queueHead = 0; queueHead < queueTail; queueHead++) {
    const idx = queue[queueHead];
    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) enqueueIfBackground(x - 1, y);
    if (x < width - 1) enqueueIfBackground(x + 1, y);
    if (y > 0) enqueueIfBackground(x, y - 1);
    if (y < height - 1) enqueueIfBackground(x, y + 1);
  }

  // Transparence : dure sous innerThreshold, dégradée jusqu'à outerThreshold, jamais appliquée
  // hors de `connectedToBackground` — une zone interne isolée reste intacte même si sa couleur
  // est proche du fond (protège les détails fins, reflets clairs, pistils blancs…).
  for (let idx = 0; idx < pixelCount; idx++) {
    if (!connectedToBackground[idx]) continue;
    const x = idx % width;
    const y = (idx - x) / width;
    const distance = colorDistance(readRgb(data, width, channels, x, y), backgroundColor);
    const alphaIndex = idx * channels + 3;
    if (distance <= innerThreshold) {
      data[alphaIndex] = 0;
    } else {
      const fade = Math.min(1, Math.max(0, (distance - innerThreshold) / (outerThreshold - innerThreshold)));
      data[alphaIndex] = Math.round(data[alphaIndex] * fade);
    }
  }

  const buffer = await sharp(data, { raw: { width, height, channels } })
    .webp({ quality: 90 })
    .toBuffer();

  return { status: "ok", buffer, backgroundColor };
}
