import { DeleteObjectsCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;

/** Vrai seulement si un vrai bucket R2 est configuré — même logique que `hasSupabaseConfig` (mode démonstration sans clé API). */
export function hasR2Config(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

const PRESIGNED_URL_TTL_SECONDS = 300;

/** URL PUT temporaire — navigateur envoie le fichier direct à R2, clé secrète jamais exposée. */
export function getR2UploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(r2, command, { expiresIn: PRESIGNED_URL_TTL_SECONDS });
}

/** Durée de validité de l'URL signée (secondes) — assez courte pour rester privée, assez longue pour couvrir un rendu de page + son cache (même valeur que l'ancienne URL signée Supabase). */
const SIGNED_URL_TTL_SECONDS = 3600;

/** URL GET temporaire — seule façon d'afficher un visuel stocké dans le bucket R2 privé. */
export function getR2DownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
}

/** Upload direct depuis le serveur (octets déjà en main, pas besoin d'URL présignée). */
export async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<void> {
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
}

/** Suppression en lot — fichier(s) potentiellement orphelin(s) après un échec d'écriture base ou une suppression de recette/matière première actée. */
export async function deleteFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await r2.send(new DeleteObjectsCommand({ Bucket: R2_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })) } }));
}

/**
 * Vrai si l'objet existe réellement dans le bucket R2 — seul moyen fiable de
 * distinguer un chemin R2 (bascule en cours) d'un chemin Supabase Storage
 * historique : les deux ont exactement la même forme de chemin
 * (`{subjectType}/{subjectId}/{uuid}.{ext}`), rien dans la chaîne elle-même
 * ne permet de les différencier (voir `approvedVisual.ts`).
 */
export async function existsInR2(key: string): Promise<boolean> {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}
