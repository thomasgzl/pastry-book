/**
 * Normalisation et recherche — logique pure, sans effet de bord, testée
 * unitairement. Recherche 100 % locale sur les données démo (aucun appel
 * réseau/IA), conformément au périmètre de la tâche C9.
 */

import {
  canonicalIngredients,
  ingredientAliases,
  recipeIngredients,
  recipeSections,
  recipes,
  sourceCategories,
  sources,
} from "@/lib/demo/data";
import type { IngredientAlias } from "@/lib/domain/schemas";

/**
 * Normalise un libellé pour comparaison : minuscules, accents retirés,
 * espaces superflus réduits. Ne modifie jamais le libellé original affiché
 * ailleurs — sert uniquement à la comparaison interne.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Résout un libellé d'ingrédient (ex. « Zeste de citron ») vers l'id de sa
 * matière première canonique via `ingredient_aliases`, en comparant les
 * formes normalisées (accent/casse). Retourne `null` si aucun alias ne
 * correspond. Le libellé original n'est jamais modifié par cette fonction.
 */
export function resolveCanonicalIngredientId(
  label: string,
  aliases: IngredientAlias[] = ingredientAliases,
): string | null {
  const normalized = normalizeText(label);
  const match = aliases.find((alias) => alias.normalizedAlias === normalized);
  return match?.canonicalIngredientId ?? null;
}

/** Vrai si `haystack` contient `needle`, comparaison insensible accent/casse. */
function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

/**
 * Matière canonique reliée à un ingrédient de recette, par liaison directe
 * (`canonicalIngredientId`) ou, à défaut, par résolution de son libellé
 * d'origine via les alias. Ne modifie jamais `originalName`.
 */
function canonicalIdForIngredient(ingredient: {
  originalName: string;
  canonicalIngredientId: string | null;
}): string | null {
  return ingredient.canonicalIngredientId ?? resolveCanonicalIngredientId(ingredient.originalName);
}

/** Ids de recettes utilisant, directement ou via ses alias, une matière canonique donnée. */
export function recipeIdsForCanonicalIngredientId(canonicalIngredientId: string): Set<string> {
  const sectionIdToRecipeId = new Map(recipeSections.map((section) => [section.id, section.recipeId]));
  const matches = new Set<string>();

  for (const ingredient of recipeIngredients) {
    if (canonicalIdForIngredient(ingredient) !== canonicalIngredientId) continue;
    const recipeId = sectionIdToRecipeId.get(ingredient.recipeSectionId);
    if (recipeId) matches.add(recipeId);
  }

  return matches;
}

export interface SearchResultSource {
  id: string;
  name: string;
  slug: string;
  href: string;
}

export interface SearchResultCategory {
  id: string;
  name: string;
  slug: string;
  sourceName: string;
  sourceSlug: string;
  href: string;
}

export interface SearchResultRecipe {
  id: string;
  title: string;
  slug: string;
  sourceName: string;
  categoryName?: string;
  href: string;
}

export interface SearchResultCanonicalIngredient {
  id: string;
  name: string;
  slug: string;
  href: string;
}

export interface SearchResults {
  sources: SearchResultSource[];
  recipes: SearchResultRecipe[];
  canonicalIngredients: SearchResultCanonicalIngredient[];
  categories: SearchResultCategory[];
}

const EMPTY_RESULTS: SearchResults = { sources: [], recipes: [], canonicalIngredients: [], categories: [] };

/**
 * Recherche globale groupée (C9) : cherche par titre/nom, et pour les
 * recettes, retrouve aussi via une matière première canonique correspondante
 * (ex. « citron » retrouve les recettes utilisant jus/zeste/purée de
 * citron). Chaque résultat de catégorie indique son entreprise parente.
 * Fonction pure : mêmes données démo à chaque appel, aucun effet de bord.
 */
export function searchAll(query: string): SearchResults {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_RESULTS;

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const categoryById = new Map(sourceCategories.map((category) => [category.id, category]));

  const matchedSources = sources.filter((source) => includesNormalized(source.name, trimmed));

  const matchedCategories = sourceCategories
    .filter((category) => includesNormalized(category.name, trimmed))
    .map((category) => {
      const source = sourceById.get(category.sourceId)!;
      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        sourceName: source.name,
        sourceSlug: source.slug,
        href: `/entreprises/${source.slug}/${category.slug}`,
      };
    });

  const matchedCanonicalIngredients = canonicalIngredients.filter((ingredient) =>
    includesNormalized(ingredient.name, trimmed),
  );

  const recipeIdsFromIngredients = new Set<string>();
  for (const ingredient of matchedCanonicalIngredients) {
    for (const recipeId of recipeIdsForCanonicalIngredientId(ingredient.id)) {
      recipeIdsFromIngredients.add(recipeId);
    }
  }

  const matchedRecipes = recipes
    .filter((recipe) => includesNormalized(recipe.title, trimmed) || recipeIdsFromIngredients.has(recipe.id))
    .map((recipe) => {
      const source = sourceById.get(recipe.sourceId)!;
      const category = recipe.sourceCategoryId ? categoryById.get(recipe.sourceCategoryId) : undefined;
      return {
        id: recipe.id,
        title: recipe.title,
        slug: recipe.slug,
        sourceName: source.name,
        categoryName: category?.name,
        href: `/recettes/${recipe.slug}`,
      };
    });

  return {
    sources: matchedSources.map((source) => ({
      id: source.id,
      name: source.name,
      slug: source.slug,
      href: `/entreprises/${source.slug}`,
    })),
    recipes: matchedRecipes,
    canonicalIngredients: matchedCanonicalIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      slug: ingredient.slug,
      href: `/matieres-premieres/${ingredient.slug}`,
    })),
    categories: matchedCategories,
  };
}
