/**
 * Normalisation et recherche — logique pure, sans effet de bord, testée
 * unitairement. `searchAll`/`recipeIdsForCanonicalIngredientId` opèrent sur
 * un `SearchDataset` explicite ; le paramètre par défaut reste les données
 * démo (compatibilité des appels existants et des tests), mais l'appelant
 * réel (`src/lib/data/search.ts`) fournit toujours les données Supabase en
 * production — jamais un mélange silencieux des deux (CLAUDE.md).
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
import type {
  CanonicalIngredient,
  IngredientAlias,
  Recipe,
  RecipeIngredient,
  RecipeKeyIngredient,
  RecipeSection,
  Source,
  SourceCategory,
} from "@/lib/domain/schemas";

/** Jeu de données complet sur lequel porte la recherche/résolution — un seul jeu à la fois, jamais démo + réel combinés. */
export interface SearchDataset {
  sources: Source[];
  sourceCategories: SourceCategory[];
  recipes: Recipe[];
  canonicalIngredients: CanonicalIngredient[];
  recipeSections: RecipeSection[];
  recipeIngredients: RecipeIngredient[];
  ingredientAliases: IngredientAlias[];
  /** Tags de matière première principale curatés (`recipe_key_ingredients`) —
   * signal plus fort qu'une simple mention en ligne d'ingrédient, voir
   * `searchAll`. */
  recipeKeyIngredients: RecipeKeyIngredient[];
}

const DEMO_DATASET: SearchDataset = {
  sources: demoSources,
  sourceCategories: demoSourceCategories,
  recipes: demoRecipes,
  canonicalIngredients: demoCanonicalIngredients,
  recipeSections: demoRecipeSections,
  recipeIngredients: demoRecipeIngredients,
  ingredientAliases: demoIngredientAliases,
  recipeKeyIngredients: demoRecipeKeyIngredients,
};

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
  aliases: IngredientAlias[] = demoIngredientAliases,
): string | null {
  const normalized = normalizeText(label);
  const match = aliases.find((alias) => alias.normalizedAlias === normalized);
  return match?.canonicalIngredientId ?? null;
}

/** Vrai si `haystack` contient `needle`, comparaison insensible accent/casse. */
function includesNormalized(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}

/** Ids de recettes utilisant, directement ou via ses alias, une matière canonique donnée. */
export function recipeIdsForCanonicalIngredientId(
  canonicalIngredientId: string,
  dataset: Pick<SearchDataset, "recipeSections" | "recipeIngredients" | "ingredientAliases"> = DEMO_DATASET,
): Set<string> {
  const sectionIdToRecipeId = new Map(dataset.recipeSections.map((section) => [section.id, section.recipeId]));
  const matches = new Set<string>();

  for (const ingredient of dataset.recipeIngredients) {
    if (
      (ingredient.canonicalIngredientId ?? resolveCanonicalIngredientId(ingredient.originalName, dataset.ingredientAliases)) !==
      canonicalIngredientId
    )
      continue;
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
 * Fonction pure : le `dataset` fourni (démo par défaut, réel en production
 * via `src/lib/data/search.ts`) détermine entièrement le résultat, aucun
 * effet de bord, jamais démo et réel mélangés.
 */
export function searchAll(query: string, dataset: SearchDataset = DEMO_DATASET): SearchResults {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_RESULTS;

  const { sources, sourceCategories, recipes, canonicalIngredients } = dataset;

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

  const matchedCanonicalIngredientIds = new Set(matchedCanonicalIngredients.map((ingredient) => ingredient.id));

  // Tags curatés (`recipe_key_ingredients`) : signal d'identité gustative
  // plus fort qu'une simple ligne d'ingrédient (ex. farine reliée à un
  // canonique technique) — priorisés dans le tri des résultats ci-dessous.
  const recipeIdsFromKeyIngredients = new Set(
    dataset.recipeKeyIngredients
      .filter((link) => matchedCanonicalIngredientIds.has(link.canonicalIngredientId))
      .map((link) => link.recipeId),
  );

  const recipeIdsFromIngredients = new Set<string>();
  for (const ingredient of matchedCanonicalIngredients) {
    for (const recipeId of recipeIdsForCanonicalIngredientId(ingredient.id, dataset)) {
      recipeIdsFromIngredients.add(recipeId);
    }
  }

  const matchedRecipes = recipes
    .filter(
      (recipe) =>
        includesNormalized(recipe.title, trimmed) ||
        recipeIdsFromKeyIngredients.has(recipe.id) ||
        recipeIdsFromIngredients.has(recipe.id),
    )
    // Tags curatés d'abord, puis titre/ligne d'ingrédient — tri stable
    // (`Array.prototype.sort` est stable depuis ES2019), donc l'ordre relatif
    // des autres résultats reste l'ordre d'apparition d'origine.
    .sort((a, b) => Number(recipeIdsFromKeyIngredients.has(b.id)) - Number(recipeIdsFromKeyIngredients.has(a.id)))
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
