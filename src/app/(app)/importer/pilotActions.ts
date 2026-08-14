"use server";

/**
 * Action serveur dédiée au pilote IA réel (lot G, G2). Point d'entrée UNIQUE
 * qui appelle explicitement l'adaptateur OpenAI réel (jamais via le registre
 * auto-basculant `getImportAIProvider`, pour garder une sélection de
 * fournisseur explicite pendant le pilote — CLAUDE.md, aucun basculement
 * silencieux). Un appel = une invocation de cette fonction (garde de coût
 * partagée dans `openaiImportProvider`, `aiCostGuard.ts`).
 */

import { buildImportDraft, type DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import { openaiImportProvider } from "@/lib/ai/import/openaiProvider";
import type { ExtractOptions, ExtractSourceFile } from "@/lib/ai/import/types";

/** `files` : un ou plusieurs fichiers ORDONNÉS d'UNE SEULE recette (lot G — captures multiples), regroupés en un seul appel. */
export async function runPilotExtraction(
  files: ExtractSourceFile[],
  options: ExtractOptions,
): Promise<DemoExtractionDraft> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("Extraction réelle indisponible : clé API absente côté serveur.");
  }
  return buildImportDraft(openaiImportProvider, files, options);
}
