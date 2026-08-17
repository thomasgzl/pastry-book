import type { VisualAsset } from "@/lib/domain/schemas";
import type { VisualAssetRow, VisualSubjectType as DbSubjectType } from "@/lib/supabase/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { DEMO_VISUAL_ASSETS } from "./fixtures/demo-examples";

type SubjectType = VisualAsset["subjectType"];

/**
 * Store en mémoire process — utilisé UNIQUEMENT quand aucun projet Supabase
 * réel n'est configuré : dev local sans `.env.local` Supabase, ou tests
 * unitaires qui seedent explicitement via `seedVisualAssetsStore` (jamais un
 * vrai appel réseau dans les tests). Dès que `hasSupabaseConfig()` est vrai
 * (Preview/Production, ou dev local avec un vrai projet lié), toutes les
 * fonctions ci-dessous lisent et écrivent la table `visual_assets` réelle —
 * jamais de repli silencieux vers ce store en cas d'échec Supabase (règle
 * non négociable I5 : un échec de persistance doit être une erreur explicite,
 * jamais une perte silencieuse comme celle qui a motivé cette tâche).
 *
 * Amorcé avec les cinq exemples de référence (E4, mode démonstration
 * uniquement) : jamais régénérés automatiquement, jamais écrasés par un lot.
 */
let store: VisualAsset[] = [...DEMO_VISUAL_ASSETS];

/** Réservé aux tests et à l'amorçage des exemples de démonstration (E4) — jamais appelé par l'UI. Sans effet si un vrai Supabase est configuré. */
export function seedVisualAssetsStore(initial: VisualAsset[]): void {
  store = [...initial];
}

/** Action utilisateur invalide (identifiant inconnu, transition refusée) — distincte d'un échec de persistance. */
export class VisualAssetActionError extends Error {}

/** Échec de la persistance Supabase elle-même (réseau, contrainte PostgreSQL rejetée...) — toujours remonté, jamais avalé ni suivi d'un repli silencieux vers le store mémoire. */
export class VisualAssetPersistenceError extends Error {}

function toDbSubjectType(type: SubjectType): DbSubjectType {
  return type === "sourceCategory" ? "source_category" : type;
}

function fromDbSubjectType(type: DbSubjectType): SubjectType {
  return type === "source_category" ? "sourceCategory" : type;
}

function fromRow(row: VisualAssetRow): VisualAsset {
  return {
    id: row.id,
    subjectType: fromDbSubjectType(row.subject_type),
    subjectId: row.subject_id,
    status: row.status,
    isPrimary: row.is_primary,
    imageUrl: row.image_url,
    sourcePhotoUrl: row.source_photo_url,
    prompt: row.prompt,
    presetVersion: row.preset_version,
    createdAt: row.created_at,
  };
}

export async function listVisualAssets(subjectType?: SubjectType, subjectId?: string): Promise<VisualAsset[]> {
  if (!hasSupabaseConfig()) {
    return store.filter(
      (asset) =>
        (!subjectType || asset.subjectType === subjectType) &&
        (!subjectId || asset.subjectId === subjectId),
    );
  }
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("visual_assets").select("*").order("created_at", { ascending: true });
  if (subjectType) query = query.eq("subject_type", toDbSubjectType(subjectType));
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw new VisualAssetPersistenceError(`Lecture des visuels impossible : ${error.message}`);
  return (data ?? []).map(fromRow);
}

export async function getVisualAssetById(id: string): Promise<VisualAsset | undefined> {
  if (!hasSupabaseConfig()) return store.find((asset) => asset.id === id);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("visual_assets").select("*").eq("id", id).maybeSingle();
  if (error) throw new VisualAssetPersistenceError(`Lecture du visuel impossible : ${error.message}`);
  return data ? fromRow(data) : undefined;
}

export async function hasAnyVisualAsset(subjectType: SubjectType, subjectId: string): Promise<boolean> {
  if (!hasSupabaseConfig()) {
    return store.some((asset) => asset.subjectType === subjectType && asset.subjectId === subjectId);
  }
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("visual_assets")
    .select("id", { count: "exact", head: true })
    .eq("subject_type", toDbSubjectType(subjectType))
    .eq("subject_id", subjectId);
  if (error) throw new VisualAssetPersistenceError(`Lecture des visuels impossible : ${error.message}`);
  return (count ?? 0) > 0;
}

export async function getPrimaryVisualAsset(subjectType: SubjectType, subjectId: string): Promise<VisualAsset | undefined> {
  if (!hasSupabaseConfig()) {
    return store.find(
      (asset) => asset.subjectType === subjectType && asset.subjectId === subjectId && asset.isPrimary,
    );
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("visual_assets")
    .select("*")
    .eq("subject_type", toDbSubjectType(subjectType))
    .eq("subject_id", subjectId)
    .eq("is_primary", true)
    .maybeSingle();
  if (error) throw new VisualAssetPersistenceError(`Lecture du visuel principal impossible : ${error.message}`);
  return data ? fromRow(data) : undefined;
}

export interface CreateDraftInput {
  subjectType: SubjectType;
  subjectId: string;
  imageUrl: string;
  sourcePhotoUrl: string | null;
  prompt: string;
  presetVersion: string;
}

/**
 * Crée toujours une nouvelle ligne en statut `draft` : ne modifie et
 * n'écrase jamais un asset existant, même approuvé (règle non négociable
 * E1 — voir `storage.test.ts` pour le test de ce scénario exact).
 */
export async function createDraftVisualAsset(input: CreateDraftInput): Promise<VisualAsset> {
  if (!hasSupabaseConfig()) {
    const asset: VisualAsset = {
      id: crypto.randomUUID(),
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      status: "draft",
      isPrimary: false,
      imageUrl: input.imageUrl,
      sourcePhotoUrl: input.sourcePhotoUrl,
      prompt: input.prompt,
      presetVersion: input.presetVersion,
      createdAt: new Date().toISOString(),
    };
    store = [...store, asset];
    return asset;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("visual_assets")
    .insert({
      subject_type: toDbSubjectType(input.subjectType),
      subject_id: input.subjectId,
      image_url: input.imageUrl,
      source_photo_url: input.sourcePhotoUrl,
      prompt: input.prompt,
      preset_version: input.presetVersion,
    })
    .select("*")
    .single();
  if (error) throw new VisualAssetPersistenceError(`Création du brouillon impossible : ${error.message}`);
  return fromRow(data);
}

/** Bucket privé confirmé par K-S1 (`20260814090300_storage_buckets.sql`) — `public = false`, PNG/WebP uniquement. */
export const VISUAL_ASSETS_BUCKET = "visual-assets";

/** Reflet en lecture seule des `allowed_mime_types` du bucket ci-dessus — la migration reste la seule source de vérité, jamais redéfinie ici. */
const BUCKET_EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/webp": "webp",
};

/** Échec de validation du fichier reçu du fournisseur (K10, étape 1) — distinct d'un échec de stockage : aucun octet n'a encore été écrit nulle part, aucun nettoyage nécessaire. */
export class VisualGenerationValidationError extends Error {}

const DATA_URI_PATTERN = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/;

/**
 * Valide le fichier réellement reçu du fournisseur (K10, étape 1) : doit être
 * une data URI base64 bien formée, de type image, dont le contenu décodé est
 * non vide. Le type MIME est celui déclaré par la data URI du fournisseur —
 * pas de vérification de signature binaire des octets décodés.
 * ponytail: fournisseur unique et contrôlé (OpenAI/démo interne, jamais une
 * entrée tierce non fiable) ; ajouter un sniff de signature si une source
 * moins fiable est branchée un jour.
 */
function decodeGeneratedImage(dataUri: string): { mimeType: string; bytes: Buffer } {
  const match = DATA_URI_PATTERN.exec(dataUri.trim());
  if (!match) {
    throw new VisualGenerationValidationError("Réponse du fournisseur invalide : aucune image reconnue dans la réponse.");
  }
  const [, mimeType, base64] = match;
  if (!mimeType.startsWith("image/")) {
    throw new VisualGenerationValidationError(`Réponse du fournisseur invalide : type "${mimeType}" n'est pas une image.`);
  }
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length === 0) {
    throw new VisualGenerationValidationError("Réponse du fournisseur invalide : image vide.");
  }
  return { mimeType, bytes };
}

function visualAssetStoragePath(subjectType: SubjectType, subjectId: string, mimeType: string): string {
  return `${toDbSubjectType(subjectType)}/${subjectId}/${crypto.randomUUID()}.${BUCKET_EXTENSION_BY_MIME[mimeType]}`;
}

/**
 * Journal structuré, jamais silencieux, jamais de contenu sensible (ni le
 * prompt, ni les octets) — juste de quoi retrouver et traiter l'incident :
 * bucket, chemin, sujet, message d'erreur base, résultat du nettoyage tenté.
 */
function logVisualAssetOrphanIncident(
  path: string,
  subjectType: SubjectType,
  subjectId: string,
  dbErrorMessage: string,
  cleanup: "removed" | "cleanup_failed",
): void {
  console.warn(
    cleanup === "removed"
      ? "[visuals] écriture base échouée après stockage réussi d'une image générée — fichier nettoyé avec succès, aucune image orpheline restante"
      : "[visuals] écriture base échouée après stockage réussi d'une image générée — ÉCHEC DU NETTOYAGE, fichier potentiellement orphelin (image possiblement payante), à vérifier/supprimer manuellement",
    { bucket: VISUAL_ASSETS_BUCKET, path, subjectType, subjectId, dbErrorMessage, cleanup },
  );
}

export type PersistGeneratedVisualInput = Omit<CreateDraftInput, "imageUrl"> & {
  /** Data URI brute renvoyée par `ImageGenerationProvider.generate()` (démo ou réelle) — jamais une URL déjà stockée. */
  generatedImageUrl: string;
};

/**
 * Mécanisme UNIQUE de persistance après une réponse réussie du fournisseur
 * d'images (K10) — commun au mode démonstration (`service.ts`) et à
 * l'adaptateur réel OpenAI (`real-generation.ts`), jamais dupliqué entre les
 * deux. Séquence imposée, jamais réordonnée : 1) valider le fichier
 * réellement reçu (`decodeGeneratedImage`) ; 2) le stocker immédiatement dans
 * le bucket privé `visual-assets` — uniquement pour les formats que ce bucket
 * accepte réellement (PNG/WebP) ; 3) enregistrer les métadonnées dans
 * `visual_assets` (`createDraftVisualAsset`, inchangé) ; 4) toujours en statut
 * `draft` (jamais approuvé automatiquement). Le visuel n'est retourné à
 * l'appelant — donc jamais affiché comme un succès — qu'une fois ces étapes
 * réellement confirmées : toute exception interrompt la fonction avant de
 * renvoyer quoi que ce soit.
 *
 * Le mode démonstration (`demo-provider.ts`) produit un SVG, format que ce
 * bucket refuse (contenu gratuit et déterministe, jamais payant) : dans ce
 * cas précis — et chaque fois que Supabase n'est pas configuré (dev local,
 * tests) — la data URI continue d'être écrite directement dans la colonne
 * texte `image_url`, comportement inchangé et déjà couvert par les tests
 * existants (`service.test.ts`, `storage.test.ts`). Seule une image
 * réellement reçue dans un format accepté par le bucket (l'adaptateur OpenAI
 * réel renvoie toujours du PNG) déclenche un vrai upload Storage — c'est la
 * seule situation où un octet potentiellement payant existe.
 *
 * Échec après stockage réussi (uniquement atteignable sur le chemin réel/
 * payant, `real-generation.ts`) : un nettoyage du fichier orphelin est tenté
 * immédiatement ; qu'il réussisse ou échoue, l'incident est journalisé
 * explicitement (`logVisualAssetOrphanIncident`, jamais silencieux) — ne
 * jamais perdre silencieusement la trace d'une image potentiellement payante
 * est la règle la plus importante de cette tâche.
 */
export async function persistGeneratedVisual(input: PersistGeneratedVisualInput): Promise<VisualAsset> {
  const { mimeType, bytes } = decodeGeneratedImage(input.generatedImageUrl);

  const bucketExtension = BUCKET_EXTENSION_BY_MIME[mimeType];
  const canUploadToBucket = hasSupabaseConfig() && Boolean(bucketExtension);

  if (!canUploadToBucket) {
    return createDraftVisualAsset({ ...input, imageUrl: input.generatedImageUrl });
  }

  const path = visualAssetStoragePath(input.subjectType, input.subjectId, mimeType);
  const supabase = await createSupabaseServerClient();

  const { error: uploadError } = await supabase.storage
    .from(VISUAL_ASSETS_BUCKET)
    .upload(path, bytes, { contentType: mimeType });
  if (uploadError) {
    // Rien n'a encore été écrit en base ni conservé ailleurs : aucun nettoyage nécessaire, échec propre.
    throw new VisualAssetPersistenceError(`Stockage de l'image impossible : ${uploadError.message}`);
  }

  try {
    return await createDraftVisualAsset({ ...input, imageUrl: path });
  } catch (dbError) {
    const { error: removeError } = await supabase.storage.from(VISUAL_ASSETS_BUCKET).remove([path]);
    const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
    const cleanup = removeError ? "cleanup_failed" : "removed";
    logVisualAssetOrphanIncident(path, input.subjectType, input.subjectId, dbErrorMessage, cleanup);
    throw new VisualAssetPersistenceError(
      `Enregistrement du visuel impossible après stockage réussi (fichier ${cleanup === "removed" ? "nettoyé" : "potentiellement orphelin, voir journal serveur"}) : ${dbErrorMessage}`,
    );
  }
}

function updateInMemory(id: string, changes: Partial<VisualAsset>): VisualAsset {
  const existing = store.find((asset) => asset.id === id);
  if (!existing) throw new VisualAssetActionError("Visuel introuvable.");
  const updated = { ...existing, ...changes };
  store = store.map((asset) => (asset.id === id ? updated : asset));
  return updated;
}

/**
 * Approuve un brouillon. Si le sujet n'a encore aucun visuel principal, le
 * nouvel approuvé le devient automatiquement (première publication,
 * `docs/09-AI_VISUALS.md` § Parcours de génération unitaire). Sinon il reste
 * approuvé sans devenir principal : jamais de remplacement silencieux d'un
 * visuel déjà validé — « Définir comme principal » est une action humaine
 * distincte (`setPrimaryVisualAsset`).
 */
export async function approveVisualAsset(id: string): Promise<VisualAsset> {
  const asset = await getVisualAssetById(id);
  if (!asset) throw new VisualAssetActionError("Visuel introuvable.");
  const alreadyHasPrimary = Boolean(await getPrimaryVisualAsset(asset.subjectType, asset.subjectId));

  if (!hasSupabaseConfig()) {
    return updateInMemory(id, { status: "approved", isPrimary: !alreadyHasPrimary });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("visual_assets")
    .update({ status: "approved", is_primary: !alreadyHasPrimary })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    // 23505 = violation d'index unique (`visual_assets_one_primary_per_subject`) : une
    // approbation concurrente a déjà publié un principal entre notre lecture et cet
    // update — jamais un doublon silencieux, message explicite plutôt qu'un crash générique.
    if (error.code === "23505") {
      throw new VisualAssetActionError(
        "Un visuel principal vient d'être publié pour ce sujet par une autre action : approbation refusée pour éviter un doublon, réessayez.",
      );
    }
    throw new VisualAssetPersistenceError(`Approbation impossible : ${error.message}`);
  }
  return fromRow(data);
}

/** Rejette un brouillon (ou retire un visuel approuvé de la circulation) : action humaine explicite, jamais automatique. */
export async function rejectVisualAsset(id: string): Promise<VisualAsset> {
  if (!hasSupabaseConfig()) {
    return updateInMemory(id, { status: "rejected", isPrimary: false });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("visual_assets")
    .update({ status: "rejected", is_primary: false })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new VisualAssetPersistenceError(`Rejet impossible : ${error.message}`);
  if (!data) throw new VisualAssetActionError("Visuel introuvable.");
  return fromRow(data);
}

/**
 * Définit un visuel déjà approuvé comme principal, en retirant ce statut à
 * l'ancien principal du même sujet — celui-ci reste `approved`, jamais
 * rejeté ni supprimé (simple changement d'affichage, action humaine).
 */
export async function setPrimaryVisualAsset(id: string): Promise<VisualAsset> {
  const asset = await getVisualAssetById(id);
  if (!asset) throw new VisualAssetActionError("Visuel introuvable.");
  if (asset.status !== "approved") {
    throw new VisualAssetActionError("Seul un visuel approuvé peut devenir principal.");
  }
  const previousPrimary = await getPrimaryVisualAsset(asset.subjectType, asset.subjectId);

  if (!hasSupabaseConfig()) {
    store = store.map((candidate) => {
      if (previousPrimary && candidate.id === previousPrimary.id) return { ...candidate, isPrimary: false };
      if (candidate.id === id) return { ...candidate, isPrimary: true };
      return candidate;
    });
    return (await getVisualAssetById(id))!;
  }

  const supabase = await createSupabaseServerClient();

  // ponytail: le client Supabase REST (postgrest) n'expose pas de transaction
  // multi-requêtes depuis le code applicatif — la rendre atomique exigerait une
  // fonction RPC/migration dédiée, hors périmètre de cette tâche (propriété de
  // data-security-agent). Bascule en deux étapes ORDONNÉES : on désactive
  // d'abord l'ancien principal, puis on active le nouveau (jamais l'inverse) —
  // au pire une fenêtre transitoire sans principal si la 2ᵉ étape échoue,
  // jamais deux principaux simultanés. L'index unique PostgreSQL
  // `visual_assets_one_primary_per_subject` reste la garantie ultime contre un
  // doublon. Amélioration possible : RPC `set_primary_visual_asset` si ce
  // point s'avère insuffisant en pratique.
  if (previousPrimary && previousPrimary.id !== id) {
    const { error: clearError } = await supabase
      .from("visual_assets")
      .update({ is_primary: false })
      .eq("id", previousPrimary.id);
    if (clearError) {
      throw new VisualAssetPersistenceError(`Changement de principal impossible : ${clearError.message}`);
    }
  }

  const { data, error } = await supabase
    .from("visual_assets")
    .update({ is_primary: true })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    throw new VisualAssetPersistenceError(
      `Changement de principal impossible (l'ancien principal a été désactivé, réessayez) : ${error.message}`,
    );
  }
  return fromRow(data);
}
