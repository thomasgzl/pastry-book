/**
 * Extraction IA réelle du parcours d'import (K3-IMPORT) — seul point qui
 * appelle `openaiImportProvider` en production. Consommé uniquement par
 * `src/app/(app)/importer/importActions.ts` (Server Action), jamais
 * directement par `ImporterWizard.tsx` (Client Component).
 *
 * Fichiers sources : jamais renvoyés depuis le navigateur à chaque tentative
 * — ils sont déjà archivés dans le bucket privé `recipe-sources` au moment de
 * leur sélection (I6, `FilesStep.tsx`/`sourceUpload.ts`). Ce module les
 * retélécharge ici, côté serveur, via `createSupabaseAdminClient()` (même
 * patron que `fetchAndHashSourceFile`, `src/lib/import/store.ts`), avant de
 * les encoder en base64 pour l'appel vision OpenAI.
 *
 * Ne lève jamais d'exception : retourne toujours un `ExtractRecipeResult`
 * typé (CLAUDE.md — jamais un échec silencieux), donc jamais de dépendance
 * à la préservation du message d'une exception à travers la frontière
 * Server Action.
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SOURCE_BUCKET } from "./sourceUpload";
import { buildImportDraft, type DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import { openaiImportProvider } from "@/lib/ai/import/openaiProvider";
import type { ExtractSourceFile } from "@/lib/ai/import/types";
import type { ImportFileRef } from "./schema";

export type ExtractRecipeResult =
  | { status: "success"; draft: DemoExtractionDraft }
  /** Clé/API OpenAI absente côté serveur — jamais un repli vers un exemple de démonstration (CLAUDE.md). */
  | { status: "config_error"; message: string }
  /** Échec de validation, de lecture Storage, ou d'extraction (voir `draft.method === "manual"`) — toujours un message explicite, jamais tu. */
  | { status: "extraction_failed"; message: string };

export interface ExtractRecipeParams {
  /** Fichiers du brouillon en cours — seuls ceux réellement archivés (`sourceFileUrl` non nul) sont exploitables ici. */
  files: ImportFileRef[];
  pastedText: string | null;
}

/** Télécharge un fichier déjà archivé et l'encode en base64 — jamais un contenu deviné/reconstruit. */
async function downloadArchivedFileAsBase64(
  client: ReturnType<typeof createSupabaseAdminClient>,
  file: ImportFileRef,
): Promise<ExtractSourceFile> {
  const download = await client.storage.from(SOURCE_BUCKET).download(file.sourceFileUrl!);
  if (download.error || !download.data) {
    throw new Error(`Lecture du fichier archivé impossible (${file.name}) : ${download.error?.message ?? "réponse vide"}`);
  }
  const buffer = await download.data.arrayBuffer();
  return {
    name: file.name,
    // Type réellement stocké par Storage au moment de l'upload (signature binaire déjà vérifiée, I6) — jamais le `type` déclaré par le navigateur seul en repli.
    type: download.data.type || file.type,
    fileBase64: Buffer.from(buffer).toString("base64"),
  };
}

/**
 * Construit la requête d'extraction (texte collé + fichiers archivés,
 * regroupés en un seul appel — jamais un appel par fichier), appelle
 * OpenAI exclusivement côté serveur, puis retourne un résultat typé.
 * `null`/`needs_review` sur les champs incertains vient de `buildImportDraft`/
 * `openaiImportProvider` (déjà strict, jamais rien inventé ici en plus).
 */
export async function extractRecipeFromSources(params: ExtractRecipeParams): Promise<ExtractRecipeResult> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      status: "config_error",
      message:
        "Extraction IA indisponible : la configuration OpenAI (clé API) est absente côté serveur. Contactez la personne responsable du déploiement, ou saisissez la recette manuellement à l'étape suivante.",
    };
  }

  try {
    const sourceFiles: ExtractSourceFile[] = [];
    const trimmedText = params.pastedText?.trim();
    if (trimmedText) {
      sourceFiles.push({ name: "texte-colle.txt", type: "text/plain", text: trimmedText });
    }

    const archivedFiles = params.files.filter((file) => file.sourceFileUrl);
    if (archivedFiles.length > 0) {
      const client = createSupabaseAdminClient();
      for (const file of archivedFiles) {
        sourceFiles.push(await downloadArchivedFileAsBase64(client, file));
      }
    }

    if (sourceFiles.length === 0) {
      return {
        status: "extraction_failed",
        message:
          "Aucun fichier archivé ni texte collé exploitable pour l'extraction. Ajoutez un fichier ou du texte, ou continuez en saisie manuelle.",
      };
    }

    const draft = await buildImportDraft(openaiImportProvider, sourceFiles);
    if (draft.method === "manual") {
      return {
        status: "extraction_failed",
        message: draft.warnings[0] ?? "L'extraction n'a produit aucun résultat exploitable.",
      };
    }

    return { status: "success", draft };
  } catch (error) {
    // Jamais le message brut d'une exception inattendue (pourrait contenir un détail interne) : message générique, cause réelle disponible uniquement côté logs serveur.
    console.error("[import] extraction IA échouée", error);
    return {
      status: "extraction_failed",
      message: "L'analyse de la recette a échoué de façon inattendue. Réessayez, ou continuez en saisie manuelle.",
    };
  }
}
