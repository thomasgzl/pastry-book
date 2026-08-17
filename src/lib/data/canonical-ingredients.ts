/**
 * Couche de lecture — matières premières normalisées (K1). Voir
 * `src/lib/data/sources.ts` pour la règle Supabase/démo/`DataAccessError`.
 *
 * Résolution recette ↔ matière canonique (liaison directe ou alias) : en
 * mode démo, réutilise `recipeIdsForCanonicalIngredientId`
 * (`src/lib/recipes/search.ts`, déjà testée) sur les données de démo. En
 * mode Supabase, applique la même règle (`canonicalIngredientId` direct,
 * sinon résolution de `originalName` via les alias réels) sans jamais
 * modifier les libellés d'origine — `resolveCanonicalIngredientId` accepte
 * un tableau d'alias explicite, réutilisé ici avec les alias Supabase
 * plutôt qu'avec son défaut démo.
 */

import { canonicalIngredients as demoCanonicalIngredients, recipes as demoRecipes } from "@/lib/demo/data";
import type { CanonicalIngredient, Recipe } from "@/lib/domain/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { recipeIdsForCanonicalIngredientId, resolveCanonicalIngredientId } from "@/lib/recipes/search";
import { loadCanonicalIngredients, loadIngredientAliases, loadRecipeIngredients, loadRecipeSections, loadRecipes } from "./supabaseSource";

export async function getCanonicalIngredients(): Promise<CanonicalIngredient[]> {
  return hasSupabaseConfig() ? loadCanonicalIngredients() : demoCanonicalIngredients;
}

export async function getCanonicalIngredientBySlug(slug: string): Promise<CanonicalIngredient | undefined> {
  const ingredients = await getCanonicalIngredients();
  return ingredients.find((ingredient) => ingredient.slug === slug);
}

/**
 * Recettes reliées à une matière première, toutes sources confondues, via
 * liaison directe ou alias — sans jamais modifier les libellés d'origine
 * affichés sur les cartes recette.
 */
export async function getRecipesForCanonicalIngredient(slug: string): Promise<Recipe[]> {
  const ingredient = await getCanonicalIngredientBySlug(slug);
  if (!ingredient) return [];

  if (!hasSupabaseConfig()) {
    const recipeIds = recipeIdsForCanonicalIngredientId(ingredient.id);
    return demoRecipes.filter((recipe) => recipeIds.has(recipe.id));
  }

  const [recipes, recipeSections, recipeIngredients, aliases] = await Promise.all([
    loadRecipes(),
    loadRecipeSections(),
    loadRecipeIngredients(),
    loadIngredientAliases(),
  ]);
  const sectionIdToRecipeId = new Map(recipeSections.map((section) => [section.id, section.recipeId]));
  const recipeIds = new Set<string>();
  for (const recipeIngredient of recipeIngredients) {
    const canonicalId =
      recipeIngredient.canonicalIngredientId ?? resolveCanonicalIngredientId(recipeIngredient.originalName, aliases);
    if (canonicalId !== ingredient.id) continue;
    const recipeId = sectionIdToRecipeId.get(recipeIngredient.recipeSectionId);
    if (recipeId) recipeIds.add(recipeId);
  }
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}

export async function getRecipeCountForCanonicalIngredient(slug: string): Promise<number> {
  const recipes = await getRecipesForCanonicalIngredient(slug);
  return recipes.length;
}
