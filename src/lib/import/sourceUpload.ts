/**
 * Upload direct navigateur → bucket privé `recipe-sources` (I6). Le fichier
 * SOURCE ORIGINAL (jamais une copie optimisée/recompressée — CLAUDE.md,
 * principe « source intacte ») part directement du navigateur vers Storage,
 * sans jamais transiter en base64/FormData par une Server Action : seul le
 * client Supabase navigateur (clé anonyme publique, RLS Storage réservée à
 * `authenticated`) est utilisé ici, jamais `createSupabaseAdminClient`.
 *
 * Chemin déterministe non conflictuel `{importBatchId}/{uuid}.{ext}` —
 * convention documentée en commentaire dans la migration
 * `supabase/migrations/20260814090300_storage_buckets.sql`, reprise telle
 * quelle plutôt que réinventée.
 *
 * Sans effet côté serveur/tests si aucun projet Supabase réel n'est
 * configuré : l'appelant (Client Component) doit vérifier `hasSupabaseConfig()`
 * avant d'appeler `uploadSourceFile` — mode démonstration déterministe,
 * jamais un échec réseau ici (CLAUDE.md).
 *
 * Accès anonyme (K3-DATA, vérifié) : le bucket `recipe-sources` n'accepte
 * d'écriture/lecture que pour le rôle `authenticated`
 * (`20260814090300_storage_buckets.sql`), et `createSupabaseBrowserClient()`
 * ne porte une session `authenticated` que pour une personne déjà connectée
 * (`src/proxy.ts` bloque toute route applicative, dont `/importer`, en amont).
 * Aucun changement requis ici pour cet invariant, déjà respecté par
 * construction.
 *
 * Validation avant upload (K3-DATA) : taille et **type MIME réel** (signature
 * binaire des premiers octets, pas seulement l'extension ni `file.type` —
 * tous deux librement falsifiables par l'appelant) sont vérifiés par
 * `validateSourceFile` avant tout transfert réseau. Le bucket applique aussi
 * sa propre limite de taille/MIME côté serveur (`file_size_limit`,
 * `allowed_mime_types`) : cette validation client est une première ligne de
 * défense avec un message lisible, pas la seule barrière.
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const SOURCE_BUCKET = "recipe-sources";

/** Identique à `file_size_limit` du bucket (`20260814090300_storage_buckets.sql`) et à `MAX_FILE_SIZE_BYTES` (`src/lib/ai/import/openaiProvider.ts`). */
export const MAX_SOURCE_FILE_SIZE_BYTES = 8 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/**
 * Signatures binaires (« magic bytes ») des seuls types acceptés par le
 * bucket `recipe-sources`. Le DOCX est un conteneur ZIP : ses quatre premiers
 * octets (`PK\x03\x04`) identifient un ZIP générique, pas spécifiquement un
 * DOCX — limite connue des signatures binaires courtes, aucune bibliothèque
 * ajoutée pour aller plus loin (le bucket n'accepte de toute façon aucun
 * autre type ZIP). Pure, testable sans navigateur.
 * ponytail: signature ZIP non distinctive DOCX vs autre ZIP ; à durcir
 * (lecture de `[Content_Types].xml` interne) seulement si un faux DOCX
 * malveillant devient un problème réel.
 */
export function sniffMimeType(header: Uint8Array): string | null {
  const at = (offset: number, bytes: number[]) => bytes.every((b, i) => header[offset + i] === b);
  if (at(0, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (at(0, [0x25, 0x50, 0x44, 0x46])) return "application/pdf";
  if (at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50])) return "image/webp";
  if (at(0, [0x50, 0x4b, 0x03, 0x04])) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

/**
 * Rejette un fichier avant tout envoi réseau : taille au-delà de 8 Mo, ou
 * contenu réel non reconnu parmi les types acceptés par le bucket (jamais une
 * simple vérification d'extension). Retourne le type MIME réel détecté —
 * utilisé comme `contentType` de l'upload plutôt que `file.type` (déclaré par
 * le navigateur/l'appelant, jamais vérifié).
 */
export async function validateSourceFile(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new Error("Fichier vide, import refusé.");
  }
  if (file.size > MAX_SOURCE_FILE_SIZE_BYTES) {
    throw new Error(
      `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo, limite ${MAX_SOURCE_FILE_SIZE_BYTES / (1024 * 1024)} Mo).`,
    );
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const sniffed = sniffMimeType(header);
  if (!sniffed) {
    throw new Error("Type de fichier non reconnu (contenu réel non identifié) : image JPEG/PNG/WebP, PDF ou DOCX attendus.");
  }
  return sniffed;
}

/**
 * Extension déduite du nom de fichier en priorité, du type MIME en repli.
 * `"bin"` en tout dernier recours (jamais inventée à partir de rien) : dans
 * ce cas l'upload échouera explicitement côté policy MIME du bucket plutôt
 * que de produire un chemin trompeur. Pure, testable sans navigateur.
 */
export function sourceFileExtension(name: string, type: string): string {
  const dot = name.lastIndexOf(".");
  if (dot !== -1 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();
  return EXTENSION_BY_MIME[type] ?? "bin";
}

/** Chemin Storage déterministe non conflictuel entre lots. Pure, testable sans navigateur. */
export function sourceFilePath(importBatchId: string, name: string, type: string): string {
  return `${importBatchId}/${crypto.randomUUID()}.${sourceFileExtension(name, type)}`;
}

export interface SourceUploadResult {
  /** Chemin Storage réel retourné par Supabase — jamais une URL fictive, jamais transformé. */
  path: string;
}

/**
 * Effectue l'upload réel — validation de taille/MIME réel d'abord
 * (`validateSourceFile`, rejette avant tout envoi réseau), puis transfert
 * direct navigateur → Storage. Le `contentType` envoyé à Supabase est le type
 * réellement détecté (signature binaire), jamais `file.type` (déclaré par le
 * navigateur, non fiable). Non exécuté par les tests unitaires au-delà de la
 * validation (vrai réseau Supabase) — voir `sourceFileExtension`/
 * `sourceFilePath`/`validateSourceFile`/`sniffMimeType` pour la logique pure
 * testée, et les tests des composants appelants pour le mock du client
 * Storage.
 */
export async function uploadSourceFile(importBatchId: string, file: File): Promise<SourceUploadResult> {
  const contentType = await validateSourceFile(file);
  const path = sourceFilePath(importBatchId, file.name, contentType);
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(SOURCE_BUCKET).upload(path, file, {
    contentType,
  });
  if (error) {
    throw new Error(`Archivage du fichier source échoué : ${error.message}`);
  }
  return { path };
}
