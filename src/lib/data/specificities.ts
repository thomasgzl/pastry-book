/**
 * Couche de lecture — spécificités et allergènes (notions séparées,
 * CLAUDE.md principe 9). Voir `src/lib/data/sources.ts` pour la règle
 * Supabase/démo/`DataAccessError` (K1).
 */

import {
  allergens as demoAllergens,
  recipeAllergens as demoRecipeAllergens,
  recipeSpecificities as demoRecipeSpecificities,
  recipes as demoRecipes,
  specificities as demoSpecificities,
} from "@/lib/demo/data";
import type { Allergen, Recipe, RecipeAllergen, RecipeSpecificity, Specificity } from "@/lib/domain/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import {
  loadAllergens,
  loadRecipeAllergens,
  loadRecipeSpecificities,
  loadRecipes,
  loadSpecificities,
} from "./supabaseSource";

export async function getSpecificities(): Promise<Specificity[]> {
  return hasSupabaseConfig() ? loadSpecificities() : demoSpecificities;
}

export async function getSpecificityBySlug(slug: string): Promise<Specificity | undefined> {
  const specificities = await getSpecificities();
  return specificities.find((specificity) => specificity.slug === slug);
}

export async function getAllergens(): Promise<Allergen[]> {
  return hasSupabaseConfig() ? loadAllergens() : demoAllergens;
}

export async function getAllergenBySlug(slug: string): Promise<Allergen | undefined> {
  const allergens = await getAllergens();
  return allergens.find((allergen) => allergen.slug === slug);
}

export async function getRecipeSpecificities(recipeId: string): Promise<RecipeSpecificity[]> {
  const entries = hasSupabaseConfig() ? await loadRecipeSpecificities() : demoRecipeSpecificities;
  return entries.filter((entry) => entry.recipeId === recipeId);
}

export async function getRecipeAllergens(recipeId: string): Promise<RecipeAllergen[]> {
  const entries = hasSupabaseConfig() ? await loadRecipeAllergens() : demoRecipeAllergens;
  return entries.filter((entry) => entry.recipeId === recipeId);
}

/** Recettes proposées ou confirmées pour une spécificité donnée (jamais `rejected`). */
export async function getRecipesForSpecificity(slug: string): Promise<Recipe[]> {
  const specificity = await getSpecificityBySlug(slug);
  if (!specificity) return [];
  const [entries, recipes] = await Promise.all([
    hasSupabaseConfig() ? loadRecipeSpecificities() : Promise.resolve(demoRecipeSpecificities),
    hasSupabaseConfig() ? loadRecipes() : Promise.resolve(demoRecipes),
  ]);
  const recipeIds = new Set(
    entries
      .filter((entry) => entry.specificityId === specificity.id && entry.status !== "rejected")
      .map((entry) => entry.recipeId),
  );
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}

/** Recettes portant un allergène détecté (confirmé ou proposé) donné. */
export async function getRecipesForAllergen(slug: string): Promise<Recipe[]> {
  const allergen = await getAllergenBySlug(slug);
  if (!allergen) return [];
  const [entries, recipes] = await Promise.all([
    hasSupabaseConfig() ? loadRecipeAllergens() : Promise.resolve(demoRecipeAllergens),
    hasSupabaseConfig() ? loadRecipes() : Promise.resolve(demoRecipes),
  ]);
  const recipeIds = new Set(entries.filter((entry) => entry.allergenId === allergen.id).map((entry) => entry.recipeId));
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}
