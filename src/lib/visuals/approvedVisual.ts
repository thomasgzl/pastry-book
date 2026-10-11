import type { VisualAsset } from "@/lib/domain/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { existsInR2, getR2DownloadUrl } from "@/lib/r2";
import { getPrimaryVisualAsset, VisualAssetPersistenceError, VISUAL_ASSETS_BUCKET } from "./storage";

type SubjectType = VisualAsset["subjectType"];

/** Durée de validité de l'URL signée Supabase (secondes) — repli legacy uniquement, voir `resolveLegacySupabaseUrl`. */
const SUPABASE_SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Repli UNIQUEMENT pour un chemin déjà stocké dans le bucket Supabase
 * `visual-assets` avant la bascule R2 (K-R2) — jamais pour un nouveau
 * visuel : `hasR2Config()` gère déjà ce choix à l'écriture (`storage.ts`).
 * Transitoire, à retirer une fois les anciennes images migrées ou
 * entièrement renouvelées.
 */
async function resolveLegacySupabaseUrl(path: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(VISUAL_ASSETS_BUCKET)
    .createSignedUrl(path, SUPABASE_SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    throw new VisualAssetPersistenceError(
      `URL signée du visuel impossible à générer (Supabase) : ${error?.message ?? "réponse vide"}`,
    );
  }
  return data.signedUrl;
}

/**
 * Résout le champ `image_url` brut d'un visuel (approuvé ou non) vers une
 * URL réellement affichable par un `<img>` — seule fonction de ce type,
 * consommée par `getApprovedVisualUrl` (sujet public) et par le Centre des
 * illustrations (`/illustrations`, tous statuts confondus, K5/K11) : sans
 * elle, un visuel réel en bucket privé s'affichait comme une image cassée
 * dans ce dernier (chemin Storage brut passé tel quel en `src`, jamais signé
 * — invisible tant que seuls des brouillons démonstration en data URI ou des
 * chemins publics statiques y transitaient).
 *
 * --- Format réel de `imageUrl` --- Une data URI base64 n'a rien à signer :
 * retournée telle quelle. Un chemin public statique (`/visuals/...`, fourni
 * manuellement) est servi tel quel par Next, jamais dans un bucket privé. Un
 * chemin de stockage réel (`{subjectType}/{subjectId}/{uuid}.{ext}`) exige
 * une URL signée temporaire — MAIS le même chemin peut désigner un objet R2
 * (bascule K-R2, écrit depuis `hasR2Config()` vrai) ou un objet resté dans
 * l'ancien bucket Supabase (upload antérieur à la bascule) : rien dans la
 * chaîne elle-même ne distingue les deux, `existsInR2` tranche réellement
 * (HEAD) avant de choisir le bon fournisseur de signature. Transitoire —
 * à simplifier (R2 uniquement) une fois toutes les anciennes images migrées.
 */
export async function resolveVisualAssetDisplayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("/")) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;

  try {
    if (await existsInR2(imageUrl)) return await getR2DownloadUrl(imageUrl);
    return await resolveLegacySupabaseUrl(imageUrl);
  } catch (cause) {
    if (cause instanceof VisualAssetPersistenceError) throw cause;
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new VisualAssetPersistenceError(`URL signée du visuel impossible à générer : ${message}`);
  }
}

/**
 * Version en lot de `resolveVisualAssetDisplayUrl` — un seul appel Storage
 * (`createSignedUrls`, pluriel) pour N chemins réels au lieu d'un appel par
 * asset. Cause principale des lenteurs constatées sur `/illustrations`
 * (autant d'allers-retours Storage que de visuels affichés, cumulés à un
 * appel `listVisualAssets` par sujet — voir `page.tsx`). Retourne une `Map`
 * indexée par le chemin D'ORIGINE (data URI/chemin public tel quel, chemin
 * Storage résolu en URL signée) ; une entrée manquante signale un échec de
 * signature pour CE chemin précis, jamais un échec bloquant pour les autres.
 */
export async function resolveVisualAssetDisplayUrls(imageUrls: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const realPaths: string[] = [];
  for (const imageUrl of imageUrls) {
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("/") || imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      result.set(imageUrl, imageUrl);
    } else {
      realPaths.push(imageUrl);
    }
  }
  if (realPaths.length === 0) return result;

  // Un échec isolé (`allSettled`) laisse simplement l'entrée absente du résultat, jamais
  // bloquant pour les autres chemins — même comportement que l'ancienne API Supabase en lot.
  const settled = await Promise.allSettled(realPaths.map((path) => resolveVisualAssetDisplayUrl(path)));
  settled.forEach((outcome, index) => {
    if (outcome.status === "fulfilled") result.set(realPaths[index], outcome.value);
  });
  return result;
}

export async function getApprovedVisualUrl(
  subjectType: SubjectType,
  subjectId: string,
): Promise<string | null> {
  const asset = await getPrimaryVisualAsset(subjectType, subjectId);
  if (!asset) return null;

  // Défense explicite, règle non négociable de ce lot : un brouillon ne doit
  // JAMAIS atteindre un affichage public. `getPrimaryVisualAsset` ne peut
  // aujourd'hui renvoyer qu'un visuel `approved` + `isPrimary` (contrainte
  // déjà appliquée en amont par `storage.ts`, y compris par l'index unique
  // PostgreSQL `visual_assets_one_primary_per_subject`) — on revalide quand
  // même ici plutôt que de faire confiance implicitement à une évolution
  // future de cette fonction ou à un appelant qui la contournerait.
  if (asset.status !== "approved" || !asset.isPrimary) return null;

  // Nettoyage de fond (K-BG) : affiché seulement si un humain l'a explicitement validé
  // depuis /illustrations (`useBackgroundRemoved`) — jamais activé automatiquement,
  // même quand une version nettoyée existe (CLAUDE.md, pas de bascule en masse).
  const imageKey = asset.useBackgroundRemoved && asset.backgroundRemovedUrl ? asset.backgroundRemovedUrl : asset.imageUrl;
  return resolveVisualAssetDisplayUrl(imageKey);
}
