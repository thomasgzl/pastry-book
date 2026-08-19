/**
 * Couche de lecture — matières premières normalisées (K1). Voir
 * `src/lib/data/sources.ts` pour la règle Supabase/démo/`DataAccessError`.
 *
 * Résolution recette ↔ matière canonique : lecture directe de
 * `recipe_key_ingredients` (tags gustatifs curatés, 3 à 6 par recette),
 * jamais une dérivation depuis toutes les lignes de `recipe_ingredients`
 * (farine/beurre/œufs compris — bruit inexploitable comme filtre). Les tags
 * sont déjà résolus vers leur matière canonique au moment de
 * l'enregistrement (import) : aucune résolution par alias nécessaire ici.
 */

import {
  canonicalIngredients as demoCanonicalIngredients,
  ingredientAliases as demoIngredientAliases,
  recipeKeyIngredients as demoRecipeKeyIngredients,
  recipes as demoRecipes,
} from "@/lib/demo/data";
import type { CanonicalIngredient, IngredientAlias, Recipe } from "@/lib/domain/schemas";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { loadCanonicalIngredients, loadIngredientAliases, loadRecipeKeyIngredients, loadRecipes } from "./supabaseSource";

export async function getCanonicalIngredients(): Promise<CanonicalIngredient[]> {
  return hasSupabaseConfig() ? loadCanonicalIngredients() : demoCanonicalIngredients;
}

/** Alias déjà enregistrés (F-KEY1) — dédoublonnage des matières premières principales proposées à l'import, même règle Supabase/démo que les autres lectures de ce fichier. */
export async function getIngredientAliases(): Promise<IngredientAlias[]> {
  return hasSupabaseConfig() ? loadIngredientAliases() : demoIngredientAliases;
}

export async function getCanonicalIngredientBySlug(slug: string): Promise<CanonicalIngredient | undefined> {
  const ingredients = await getCanonicalIngredients();
  return ingredients.find((ingredient) => ingredient.slug === slug);
}

/**
 * Recettes où une matière première est un tag confirmé (`recipe_key_ingredients`),
 * toutes sources confondues — sans jamais modifier les libellés d'origine
 * affichés sur les cartes recette. Une simple mention en ligne d'ingrédient
 * (ex. farine, beurre) ne suffit pas : seuls les tags curatés comptent.
 */
export async function getRecipesForCanonicalIngredient(slug: string): Promise<Recipe[]> {
  const ingredient = await getCanonicalIngredientBySlug(slug);
  if (!ingredient) return [];

  const [recipes, recipeKeyIngredients] = await Promise.all([
    hasSupabaseConfig() ? loadRecipes() : demoRecipes,
    hasSupabaseConfig() ? loadRecipeKeyIngredients() : demoRecipeKeyIngredients,
  ]);
  const recipeIds = new Set(
    recipeKeyIngredients
      .filter((link) => link.canonicalIngredientId === ingredient.id)
      .map((link) => link.recipeId),
  );
  return recipes.filter((recipe) => recipeIds.has(recipe.id));
}

export async function getRecipeCountForCanonicalIngredient(slug: string): Promise<number> {
  const recipes = await getRecipesForCanonicalIngredient(slug);
  return recipes.length;
}
