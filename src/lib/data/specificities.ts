/**
 * Couche de lecture — spécificités et allergènes (notions séparées,
 * CLAUDE.md principe 9). Mode démo uniquement pour l'instant, voir
 * `src/lib/data/sources.ts` pour la note sur la future bascule Supabase.
 */

import { allergens, recipeAllergens, recipeSpecificities, recipes, specificities } from "@/lib/demo/data";
import type { Allergen, Recipe, RecipeAllergen, RecipeSpecificity, Specificity } from "@/lib/domain/schemas";

export function getSpecificities(): Specificity[] {
  return specificities;
}

export function getSpecificityBySlug(slug: string): Specificity | undefined {
  return specificities.find((specificity) => specificity.slug === slug);
}

export function getAllergens(): Allergen[] {
  return allergens;
}

export function getAllergenBySlug(slug: string): Allergen | undefined {
  return allergens.find((allergen) => allergen.slug === slug);
}

export function getRecipeSpecificities(recipeId: string): RecipeSpecificity[] {
  return recipeSpecificities.filter((entry) => entry.recipeId === recipeId);
}

export function getRecipeAllergens(recipeId: string): RecipeAllergen[] {
  return recipeAllergens.filter((entry) => entry.recipeId === recipeId);
}

/** Recettes proposées ou confirmées pour une spécificité donnée (jamais `rejected`). */
export function getRecipesForSpecificity(slug: string): Recipe[] {
  const specificity = getSpecificityBySlug(slug);
  if (!specificity) return [];
  const recipeIds = new Set(
    recipeSpecificities
      .filter((entry) => entry.specificityId === specificity.id && entry.status !== "rejected")
      .map((entry) => entry.recipeId),
  );
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}

/** Recettes portant un allergène détecté (confirmé ou proposé) donné. */
export function getRecipesForAllergen(slug: string): Recipe[] {
  const allergen = getAllergenBySlug(slug);
  if (!allergen) return [];
  const recipeIds = new Set(
    recipeAllergens.filter((entry) => entry.allergenId === allergen.id).map((entry) => entry.recipeId),
  );
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}
