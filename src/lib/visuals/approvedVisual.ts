import type { VisualAsset } from "@/lib/domain/schemas";
import { getPrimaryVisualAsset } from "./storage";

type SubjectType = VisualAsset["subjectType"];

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
 * --- Format réel de `imageUrl` aujourd'hui (vérifié dans le code, lot J) ---
 * Les deux seules sources qui peuplent `visual_assets.image_url`
 * (`src/lib/ai/visuals/demo-provider.ts` et
 * `src/lib/ai/visuals/openai-provider.ts`) écrivent TOUJOURS une data URI
 * base64 (`data:image/svg+xml;base64,...` en démo, `data:image/png;base64,...`
 * pour un vrai appel OpenAI Images) directement en base — aucun upload vers
 * le bucket Storage privé `visual-assets` n'existe nulle part dans le code
 * actuel, malgré la convention de chemin déjà documentée dans la migration
 * `20260814090300_storage_buckets.sql` (`{subjectType}/{subjectId}/{uuid}.{ext}`).
 * Une data URI n'a rien à signer : elle est retournée telle quelle.
 *
 * Le jour où un vrai chemin Storage sera écrit dans `image_url` (upload réel
 * des visuels IA vers le bucket — chantier séparé, non fait ici), cette
 * fonction devra détecter ce cas (`!imageUrl.startsWith("data:")`) et générer
 * une URL signée temporaire via
 * `(await createSupabaseServerClient()).storage.from("visual-assets").createSignedUrl(path, 3600)`
 * plutôt que retourner le chemin brut (RLS Storage restreint déjà l'accès
 * direct à `authenticated`, mais un chemin brut sans URL signée n'est de
 * toute façon pas exploitable par un `<img>`). Non implémenté ici : aucun
 * appelant ne produit ce format aujourd'hui — l'écrire maintenant serait du
 * code mort, non vérifiable contre un vrai upload.
 */
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

  return asset.imageUrl;
}
