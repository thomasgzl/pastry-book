/**
 * Couche de lecture — recherche globale (C9). Assemble le `SearchDataset`
 * réel (Supabase) ou démo selon `hasSupabaseConfig()`, jamais les deux
 * mélangés (CLAUDE.md), puis délègue le calcul pur à `searchAll`
 * (`src/lib/recipes/search.ts`). Voir `src/lib/data/sources.ts` pour la
 * règle Supabase/démo/`DataAccessError` (K1) : un échec Supabase remonte une
 * erreur explicite, jamais un repli silencieux vers la démo.
 */

import {
  canonicalIngredients as demoCanonicalIngredients,
  ingredientAliases as demoIngredientAliases,
  recipeIngredients as demoRecipeIngredients,
  recipeKeyIngredients as demoRecipeKeyIngredients,
  recipeSections as demoRecipeSections,
  recipes as demoRecipes,
  sourceCategories as demoSourceCategories,
  sources as demoSources,
} from "@/lib/demo/data";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { searchAll, type SearchDataset, type SearchResults } from "@/lib/recipes/search";
import {
  loadCanonicalIngredients,
  loadIngredientAliases,
  loadRecipeIngredients,
  loadRecipeKeyIngredients,
  loadRecipeSections,
  loadRecipes,
  loadSourceCategories,
  loadSources,
} from "./supabaseSource";

async function loadSearchDataset(): Promise<SearchDataset> {
  if (!hasSupabaseConfig()) {
    return {
      sources: demoSources,
      sourceCategories: demoSourceCategories,
      recipes: demoRecipes,
      canonicalIngredients: demoCanonicalIngredients,
      recipeSections: demoRecipeSections,
      recipeIngredients: demoRecipeIngredients,
      ingredientAliases: demoIngredientAliases,
      recipeKeyIngredients: demoRecipeKeyIngredients,
    };
  }

  const [
    sources,
    sourceCategories,
    recipes,
    canonicalIngredients,
    recipeSections,
    recipeIngredients,
    ingredientAliases,
    recipeKeyIngredients,
  ] = await Promise.all([
    loadSources(),
    loadSourceCategories(),
    loadRecipes(),
    loadCanonicalIngredients(),
    loadRecipeSections(),
    loadRecipeIngredients(),
    loadIngredientAliases(),
    loadRecipeKeyIngredients(),
  ]);

  return {
    sources,
    sourceCategories,
    recipes,
    canonicalIngredients,
    recipeSections,
    recipeIngredients,
    ingredientAliases,
    recipeKeyIngredients,
  };
}

/** Point d'entrée réel de la recherche globale — toujours le jeu de données courant (Supabase en production), jamais figé/caché au-delà de la requête en cours. */
export async function searchAllData(query: string): Promise<SearchResults> {
  const dataset = await loadSearchDataset();
  return searchAll(query, dataset);
}
