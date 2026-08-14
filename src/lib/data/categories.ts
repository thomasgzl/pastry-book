/**
 * Couche de lecture — catégories locales à une entreprise. Mode démo
 * uniquement pour l'instant, voir `src/lib/data/sources.ts` pour la note sur
 * la future bascule Supabase.
 */

import { recipes, sourceCategories } from "@/lib/demo/data";
import type { SourceCategory } from "@/lib/domain/schemas";

/** Catégories propres à une source — jamais celles d'une autre entreprise. */
export function getCategoriesForSource(sourceId: string): SourceCategory[] {
  return sourceCategories
    .filter((category) => category.sourceId === sourceId)
    .sort((a, b) => a.position - b.position);
}

export function getCategoryBySlug(sourceId: string, categorySlug: string): SourceCategory | undefined {
  return sourceCategories.find((category) => category.sourceId === sourceId && category.slug === categorySlug);
}

export function getRecipeCountForCategory(categoryId: string): number {
  return recipes.filter((recipe) => recipe.sourceCategoryId === categoryId).length;
}
