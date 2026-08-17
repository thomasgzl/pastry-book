/**
 * Couche de lecture — entreprises/sources (K1). En Preview/Production avec
 * Supabase configuré (`hasSupabaseConfig()`), lit la table réelle ; sinon
 * lit `src/lib/demo/data.ts` (tests automatisés explicites, ou dev local
 * sans Supabase volontairement sélectionné). Aucun repli silencieux vers la
 * démo si Supabase EST configuré et échoue : `loadSources`/`loadRecipes`
 * lèvent alors une `DataAccessError` explicite (voir `supabaseSource.ts`).
 */

import { recipes as demoRecipes, sources as demoSources } from "@/lib/demo/data";
import type { Source } from "@/lib/domain/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { loadRecipes, loadSources } from "./supabaseSource";

export async function getSources(): Promise<Source[]> {
  if (!hasSupabaseConfig()) return demoSources;
  return loadSources();
}

export async function getSourceBySlug(slug: string): Promise<Source | undefined> {
  const sources = await getSources();
  return sources.find((source) => source.slug === slug);
}

/** Nombre de recettes rattachées à une source — toujours calculé, jamais codé en dur. */
export async function getRecipeCountForSource(sourceId: string): Promise<number> {
  const recipes = hasSupabaseConfig() ? await loadRecipes() : demoRecipes;
  return recipes.filter((recipe) => recipe.sourceId === sourceId).length;
}
