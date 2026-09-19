import type { VisualAsset } from "@/lib/domain/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrimaryVisualAsset, VisualAssetPersistenceError, VISUAL_ASSETS_BUCKET } from "./storage";

type SubjectType = VisualAsset["subjectType"];

/** Durée de validité de l'URL signée (secondes) — assez courte pour rester privée, assez longue pour couvrir un rendu de page + son cache. */
const SIGNED_URL_TTL_SECONDS = 3600;

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
 * --- Format réel de `imageUrl` (K10) --- Une data URI base64 n'a rien à
 * signer : retournée telle quelle. Un chemin public statique (`/visuals/...`,
 * fourni manuellement) est servi tel quel par Next, jamais dans le bucket
 * privé. Un chemin Storage réel (`{subjectType}/{subjectId}/{uuid}.{ext}`)
 * exige une URL signée temporaire (`createSignedUrl`).
 */
export async function resolveVisualAssetDisplayUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("/")) return imageUrl;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(VISUAL_ASSETS_BUCKET)
    .createSignedUrl(imageUrl, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    throw new VisualAssetPersistenceError(
      `URL signée du visuel impossible à générer : ${error?.message ?? "réponse vide"}`,
    );
  }
  return data.signedUrl;
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
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("/")) result.set(imageUrl, imageUrl);
    else realPaths.push(imageUrl);
  }
  if (realPaths.length === 0) return result;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(VISUAL_ASSETS_BUCKET)
    .createSignedUrls(realPaths, SIGNED_URL_TTL_SECONDS);
  if (error) {
    throw new VisualAssetPersistenceError(`URL signées des visuels impossibles à générer : ${error.message}`);
  }
  for (const item of data ?? []) {
    if (item.signedUrl && !item.error) result.set(item.path ?? "", item.signedUrl);
  }
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

  return resolveVisualAssetDisplayUrl(asset.imageUrl);
}
