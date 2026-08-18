"use server";

/**
 * Frontière Server Action de la persistance d'import (I5) — seul point
 * d'entrée appelé par `ImporterWizard.tsx` (Client Component) pour toute
 * écriture/lecture passant par `src/lib/import/store.ts`. Un Client Component
 * ne peut pas attendre une vraie requête Supabase de façon synchrone pendant
 * le rendu ; ce fichier fournit le même patron déjà utilisé par
 * `src/app/(app)/visuels/actions.ts` (visuels). Aucun secret ici : `store.ts`
 * lit la clé de service uniquement
 * côté serveur (`createSupabaseAdminClient`).
 */

import {
  checkDuplicate,
  checkImportDuplicates,
  createImportBatch,
  createLocalCategory,
  getCategoriesForSourceIncludingSession,
  saveImportRecipe,
  type CheckImportDuplicatesParams,
  type ImportDuplicateMatch,
  type SaveImportRecipeResult,
} from "@/lib/import/store";
import { getSources } from "@/lib/data/sources";
import { getCanonicalIngredients } from "@/lib/data/canonical-ingredients";
import { getAllergens, getSpecificities } from "@/lib/data/specificities";
import {
  extractRecipeFromSources,
  type ExtractRecipeParams,
  type ExtractRecipeResult,
} from "@/lib/import/extraction";
import type { Allergen, CanonicalIngredient, ImportBatch, Source, SourceCategory, Specificity } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";

export type { SaveImportRecipeResult } from "@/lib/import/store";

export interface ImportReferenceData {
  sources: Source[];
  canonicalIngredients: CanonicalIngredient[];
  specificities: Specificity[];
  allergens: Allergen[];
}

/** Référentiels lus via Supabase (K1) — `src/lib/data/*` dépend de `next/headers`, donc injoignable depuis `ImporterWizard.tsx` (Client Component) sans cette frontière. */
export async function getImportReferenceDataAction(): Promise<ImportReferenceData> {
  const [sources, canonicalIngredients, specificities, allergens] = await Promise.all([
    getSources(),
    getCanonicalIngredients(),
    getSpecificities(),
    getAllergens(),
  ]);
  return { sources, canonicalIngredients, specificities, allergens };
}

export async function createImportBatchAction(): Promise<ImportBatch> {
  return createImportBatch();
}

export type { ExtractRecipeParams, ExtractRecipeResult } from "@/lib/import/extraction";

/** Extraction IA réelle (K3-IMPORT) — jamais appelée depuis le navigateur : `extractRecipeFromSources` lit `OPENAI_API_KEY` et retélécharge les fichiers archivés via la clé de service, toutes deux réservées au serveur. */
export async function extractRecipeAction(params: ExtractRecipeParams): Promise<ExtractRecipeResult> {
  return extractRecipeFromSources(params);
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

/**
 * Différences K4 au-delà du cas déjà bloquant (`checkDuplicateAction`, même
 * titre + même entreprise) : même titre dans une AUTRE entreprise, hash de
 * fichier source identique, préparation homonyme. Purement informatif —
 * n'empêche jamais l'enregistrement, jamais de fusion automatique.
 */
export async function checkImportDuplicatesAction(
  params: CheckImportDuplicatesParams,
): Promise<ImportDuplicateMatch[]> {
  return checkImportDuplicates(params);
}

export async function saveImportRecipeAction(params: {
  batchId: string;
  draft: ImportRecipeDraft;
  rawExtraction: unknown;
  providerName: string;
  acknowledgeDuplicate?: boolean;
  newSourceName?: string | null;
}): Promise<SaveImportRecipeResult> {
  return saveImportRecipe(params);
}
