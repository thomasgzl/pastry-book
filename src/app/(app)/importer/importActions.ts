"use server";

/**
 * Frontière Server Action de la persistance d'import (I5) — seul point
 * d'entrée appelé par `ImporterWizard.tsx` (Client Component) pour toute
 * écriture/lecture passant par `src/lib/import/store.ts`. Un Client Component
 * ne peut pas attendre une vraie requête Supabase de façon synchrone pendant
 * le rendu ; ce fichier fournit le même patron déjà utilisé par
 * `pilotActions.ts` (extraction IA) et `src/app/(app)/visuels/actions.ts`
 * (visuels). Aucun secret ici : `store.ts` lit la clé de service uniquement
 * côté serveur (`createSupabaseAdminClient`).
 */

import {
  checkDuplicate,
  createImportBatch,
  createLocalCategory,
  getCategoriesForSourceIncludingSession,
  saveImportRecipe,
  type SaveImportRecipeResult,
} from "@/lib/import/store";
import type { ImportBatch, SourceCategory } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";

export type { SaveImportRecipeResult } from "@/lib/import/store";

export async function createImportBatchAction(): Promise<ImportBatch> {
  return createImportBatch();
}

export async function getCategoriesAction(sourceId: string): Promise<SourceCategory[]> {
  return getCategoriesForSourceIncludingSession(sourceId);
}

export async function createCategoryAction(sourceId: string, name: string): Promise<SourceCategory> {
  return createLocalCategory(sourceId, name);
}

export async function checkDuplicateAction(
  title: string,
  sourceId: string,
): Promise<{ title: string; sourceId: string } | null> {
  return checkDuplicate(title, sourceId);
}

export async function saveImportRecipeAction(params: {
  batchId: string;
  draft: ImportRecipeDraft;
  rawExtraction: unknown;
  providerName: string;
  acknowledgeDuplicate?: boolean;
}): Promise<SaveImportRecipeResult> {
  return saveImportRecipe(params);
}
