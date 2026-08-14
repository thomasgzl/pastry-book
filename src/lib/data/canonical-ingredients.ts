/**
 * Couche de lecture — matières premières normalisées. Mode démo uniquement
 * pour l'instant, voir `src/lib/data/sources.ts` pour la note sur la future
 * bascule Supabase.
 */

import { canonicalIngredients, recipes } from "@/lib/demo/data";
import type { CanonicalIngredient, Recipe } from "@/lib/domain/schemas";
import { recipeIdsForCanonicalIngredientId } from "@/lib/recipes/search";

export function getCanonicalIngredients(): CanonicalIngredient[] {
  return canonicalIngredients;
}

export function getCanonicalIngredientBySlug(slug: string): CanonicalIngredient | undefined {
  return canonicalIngredients.find((ingredient) => ingredient.slug === slug);
}

/**
 * Recettes reliées à une matière première, toutes sources confondues, via
 * liaison directe ou alias (`ingredient_aliases`) — sans jamais modifier les
 * libellés d'origine affichés sur les cartes recette.
 */
export function getRecipesForCanonicalIngredient(slug: string): Recipe[] {
  const ingredient = getCanonicalIngredientBySlug(slug);
  if (!ingredient) return [];
  const recipeIds = recipeIdsForCanonicalIngredientId(ingredient.id);
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}

export function getRecipeCountForCanonicalIngredient(slug: string): number {
  return getRecipesForCanonicalIngredient(slug).length;
}
