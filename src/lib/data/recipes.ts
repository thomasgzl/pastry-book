/**
 * Couche de lecture — recettes. Mode démo uniquement pour l'instant, voir
 * `src/lib/data/sources.ts` pour la note sur la future bascule Supabase.
 */

import { canonicalIngredients, recipeIngredients, recipeSections, recipes, sourceCategories, sources } from "@/lib/demo/data";
import type { Recipe } from "@/lib/domain/schemas";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getSourceBySlug } from "@/lib/data/sources";

export function getRecipes(): Recipe[] {
  return recipes;
}

export function getRecipesBySource(sourceSlug: string): Recipe[] {
  const source = getSourceBySlug(sourceSlug);
  if (!source) return [];
  return recipes.filter((recipe) => recipe.sourceId === source.id);
}

export function getRecipesByCategory(sourceSlug: string, categorySlug: string): Recipe[] {
  const source = getSourceBySlug(sourceSlug);
  if (!source) return [];
  const category = getCategoryBySlug(source.id, categorySlug);
  if (!category) return [];
  return recipes.filter((recipe) => recipe.sourceCategoryId === category.id);
}

/** Recettes d'une source sans catégorie locale (`sourceCategoryId` nullable). */
export function getRecipesWithoutCategoryForSource(sourceSlug: string): Recipe[] {
  const source = getSourceBySlug(sourceSlug);
  if (!source) return [];
  return recipes.filter((recipe) => recipe.sourceId === source.id && recipe.sourceCategoryId === null);
}

/**
 * Noms de matière première (canonique si liée, sinon libellé d'origine) pour
 * une recette, dédupliqués et dans l'ordre d'apparition. `RecipeCard` limite
 * déjà l'affichage aux deux premiers — cette fonction n'applique aucune
 * limite pour laisser ce choix au composant.
 */
export function getIngredientTagsForRecipe(recipeId: string): string[] {
  const canonicalNameById = new Map(canonicalIngredients.map((ingredient) => [ingredient.id, ingredient.name]));
  const sectionIds = new Set(
    recipeSections.filter((section) => section.recipeId === recipeId).map((section) => section.id),
  );

  const tags: string[] = [];
  for (const ingredient of recipeIngredients) {
    if (!sectionIds.has(ingredient.recipeSectionId)) continue;
    const name = ingredient.canonicalIngredientId ? canonicalNameById.get(ingredient.canonicalIngredientId) : null;
    if (name && !tags.includes(name)) tags.push(name);
  }
  return tags;
}

export interface RecipeCardData {
  title: string;
  sourceName: string;
  categoryName?: string;
  ingredientTags: string[];
  imageUrl?: string;
  href: string;
}

/**
 * Assemble les props attendues par `RecipeCard` pour une recette — évite de
 * dupliquer la résolution source/catégorie/tags dans chaque page qui affiche
 * des recettes.
 */
export function toRecipeCardData(recipe: Recipe): RecipeCardData {
  // `sourceId` référence toujours une source existante (invariant du jeu de
  // données démo, garanti par data.test.ts) : pas de repli défensif ici.
  const source = sources.find((candidate) => candidate.id === recipe.sourceId)!;
  const category = recipe.sourceCategoryId
    ? sourceCategories.find((candidate) => candidate.id === recipe.sourceCategoryId)
    : undefined;

  return {
    title: recipe.title,
    sourceName: source.name,
    categoryName: category?.name,
    ingredientTags: getIngredientTagsForRecipe(recipe.id),
    imageUrl: recipe.photoUrl ?? undefined,
    href: `/recettes/${recipe.slug}`,
  };
}
