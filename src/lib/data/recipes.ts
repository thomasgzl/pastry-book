/**
 * Couche de lecture — recettes. Mode démo uniquement pour l'instant, voir
 * `src/lib/data/sources.ts` pour la note sur la future bascule Supabase.
 */

import { canonicalIngredients, recipeIngredients, recipeSections, recipes, sourceCategories, sources } from "@/lib/demo/data";
import type { Recipe, RecipeIngredient } from "@/lib/domain/schemas";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getSourceBySlug } from "@/lib/data/sources";

export function getRecipes(): Recipe[] {
  return recipes;
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((recipe) => recipe.slug === slug);
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

export interface RecipeSectionWithIngredients {
  id: string;
  name: string | null;
  /** Ingrédients de la section, dans leur ordre `position` d'origine. */
  ingredients: RecipeIngredient[];
}

export interface RecipeKeyIngredient {
  name: string;
  slug: string;
}

export interface RecipeDetail {
  recipe: Recipe;
  sourceName: string;
  sourceSlug: string;
  categoryName?: string;
  categorySlug?: string;
  /** Préparations dans leur ordre `position` d'origine, chacune avec ses
   * propres ingrédients (CLAUDE.md, principe 7 : une préparation
   * appartient à une recette précise, jamais globalisée entre entreprises). */
  sections: RecipeSectionWithIngredients[];
  /** Matières premières canoniques résolues pour cette recette,
   * dédupliquées et dans l'ordre d'apparition — pour les liens vers
   * `/matieres-premieres/[slug]`. Vide si aucun ingrédient n'est relié à une
   * matière canonique. */
  keyIngredients: RecipeKeyIngredient[];
}

/**
 * Assemble la fiche recette complète (C5) : recette, source, catégorie
 * locale (si présente), préparations ordonnées avec leurs ingrédients
 * ordonnés, et matières premières clés. Ne construit aucune section vide —
 * cette responsabilité reste dans la page, qui décide de rendre ou non
 * chaque bloc selon ces données (CLAUDE.md, principe 2).
 */
export function getRecipeDetail(slug: string): RecipeDetail | undefined {
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return undefined;

  // Invariants garantis par le jeu de données démo (data.test.ts) : pas de
  // repli défensif ici, voir `toRecipeCardData` ci-dessus pour le même choix.
  const source = sources.find((candidate) => candidate.id === recipe.sourceId)!;
  const category = recipe.sourceCategoryId
    ? sourceCategories.find((candidate) => candidate.id === recipe.sourceCategoryId)
    : undefined;

  const sections = recipeSections
    .filter((section) => section.recipeId === recipe.id)
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      id: section.id,
      name: section.name,
      ingredients: recipeIngredients
        .filter((ingredient) => ingredient.recipeSectionId === section.id)
        .sort((a, b) => a.position - b.position),
    }));

  const canonicalById = new Map(canonicalIngredients.map((ingredient) => [ingredient.id, ingredient]));
  const keyIngredients: RecipeKeyIngredient[] = [];
  for (const section of sections) {
    for (const ingredient of section.ingredients) {
      if (!ingredient.canonicalIngredientId) continue;
      const canonical = canonicalById.get(ingredient.canonicalIngredientId);
      if (canonical && !keyIngredients.some((entry) => entry.slug === canonical.slug)) {
        keyIngredients.push({ name: canonical.name, slug: canonical.slug });
      }
    }
  }

  return {
    recipe,
    sourceName: source.name,
    sourceSlug: source.slug,
    categoryName: category?.name,
    categorySlug: category?.slug,
    sections,
    keyIngredients,
  };
}
