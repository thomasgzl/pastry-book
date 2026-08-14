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
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SOURCE_BUCKET = "recipe-sources";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

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
 * Effectue l'upload réel. Non exécuté par les tests unitaires (vrai réseau
 * Supabase) — voir `sourceFileExtension`/`sourceFilePath` pour la logique
 * pure testée, et les tests des composants appelants pour le mock du client
 * Storage.
 */
export async function uploadSourceFile(importBatchId: string, file: File): Promise<SourceUploadResult> {
  const path = sourceFilePath(importBatchId, file.name, file.type);
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(SOURCE_BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) {
    throw new Error(`Archivage du fichier source échoué : ${error.message}`);
  }
  return { path };
}
