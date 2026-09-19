import type { VisualAsset } from "@/lib/domain/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPrimaryVisualAsset, VisualAssetPersistenceError, VISUAL_ASSETS_BUCKET } from "./storage";

type SubjectType = VisualAsset["subjectType"];

/** Durée de validité de l'URL signée (secondes) — assez courte pour rester privée, assez longue pour couvrir un rendu de page + son cache. */
const SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Lecture serveur du visuel approuvé et publié (« principal ») d'un sujet —
 * jamais un brouillon, jamais un visuel rejeté (lot J, mécanisme de lecture
 * sécurisée consommé ensuite par `frontend-design-agent`). Appelée
 * UNIQUEMENT depuis un Server Component ou une Server Action, jamais
 * importée dans un fichier `"use client"` — même règle que
 * `storage.ts`/`subjects.ts` : `getPrimaryVisualAsset` passe par le client
 * Supabase serveur authentifié, qui ne doit jamais tourner côté navigateur.
 *
 * Retourne `null` si le sujet n'a aucun visuel principal — état normal (pas
 * encore illustré ou pas encore validé), jamais une erreur bloquante :
 * l'appelant affiche un placeholder dans ce cas.
 *
 * --- Format réel de `imageUrl` (K10 : deux cas possibles désormais) ---
 * Une data URI base64 (`data:image/svg+xml;base64,...` en démo,
 * `data:image/png;base64,...` quand Supabase n'est pas configuré) n'a rien à
 * signer : retournée telle quelle. Un chemin Storage réel
 * (`{subjectType}/{subjectId}/{uuid}.{ext}`, écrit par `persistGeneratedVisual`
 * depuis K10 quand Supabase est configuré et le format accepté par le
 * bucket) n'est pas exploitable tel quel par un `<img>` — RLS Storage
 * restreint déjà l'accès direct à `authenticated`, jamais public — il faut
 * une URL signée temporaire (`createSignedUrl`, K11).
 */
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
