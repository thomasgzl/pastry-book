/**
 * Couche de lecture — catégories locales à une entreprise (K1). Voir
 * `src/lib/data/sources.ts` pour la règle Supabase/démo/`DataAccessError`.
 */

import { recipes as demoRecipes, sourceCategories as demoSourceCategories } from "@/lib/demo/data";
import type { SourceCategory } from "@/lib/domain/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { loadRecipes, loadSourceCategories } from "./supabaseSource";

/** Catégories propres à une source — jamais celles d'une autre entreprise. */
export async function getCategoriesForSource(sourceId: string): Promise<SourceCategory[]> {
  const categories = hasSupabaseConfig() ? await loadSourceCategories() : demoSourceCategories;
  return categories
    .filter((category) => category.sourceId === sourceId)
    .sort((a, b) => a.position - b.position);
}

export async function getCategoryBySlug(sourceId: string, categorySlug: string): Promise<SourceCategory | undefined> {
  const categories = hasSupabaseConfig() ? await loadSourceCategories() : demoSourceCategories;
  return categories.find((category) => category.sourceId === sourceId && category.slug === categorySlug);
}

export async function getRecipeCountForCategory(categoryId: string): Promise<number> {
  const recipes = hasSupabaseConfig() ? await loadRecipes() : demoRecipes;
  return recipes.filter((recipe) => recipe.sourceCategoryId === categoryId).length;
}
