/**
 * Couche de lecture — recettes (K1). Voir `src/lib/data/sources.ts` pour la
 * règle Supabase/démo/`DataAccessError`. Toutes les fonctions exportées sont
 * asynchrones (y compris le mode démo) pour garder une seule signature
 * d'appel, quel que soit le mode — même convention que
 * `src/lib/visuals/storage.ts` et `src/lib/import/store.ts`.
 */

import {
  canonicalIngredients as demoCanonicalIngredients,
  recipeIngredients as demoRecipeIngredients,
  recipeSections as demoRecipeSections,
  recipes as demoRecipes,
  sourceCategories as demoSourceCategories,
  sources as demoSources,
} from "@/lib/demo/data";
import type {
  CanonicalIngredient,
  Recipe,
  RecipeIngredient,
  RecipeSection,
  Source,
  SourceCategory,
} from "@/lib/domain/schemas";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getSourceBySlug } from "@/lib/data/sources";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";
import {
  loadCanonicalIngredients,
  loadRecipeIngredients,
  loadRecipeSections,
  loadRecipes,
  loadSourceCategories,
  loadSources,
} from "./supabaseSource";

async function allRecipes(): Promise<Recipe[]> {
  return hasSupabaseConfig() ? loadRecipes() : demoRecipes;
}
async function allSources(): Promise<Source[]> {
  return hasSupabaseConfig() ? loadSources() : demoSources;
}
async function allSourceCategories(): Promise<SourceCategory[]> {
  return hasSupabaseConfig() ? loadSourceCategories() : demoSourceCategories;
}
async function allCanonicalIngredients(): Promise<CanonicalIngredient[]> {
  return hasSupabaseConfig() ? loadCanonicalIngredients() : demoCanonicalIngredients;
}
async function allRecipeSections(): Promise<RecipeSection[]> {
  return hasSupabaseConfig() ? loadRecipeSections() : demoRecipeSections;
}
async function allRecipeIngredients(): Promise<RecipeIngredient[]> {
  return hasSupabaseConfig() ? loadRecipeIngredients() : demoRecipeIngredients;
}

export async function getRecipes(): Promise<Recipe[]> {
  return allRecipes();
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | undefined> {
  const recipes = await allRecipes();
  return recipes.find((recipe) => recipe.slug === slug);
}

export async function getRecipesBySource(sourceSlug: string): Promise<Recipe[]> {
  const source = await getSourceBySlug(sourceSlug);
  if (!source) return [];
  const recipes = await allRecipes();
  return recipes.filter((recipe) => recipe.sourceId === source.id);
}

export async function getRecipesByCategory(sourceSlug: string, categorySlug: string): Promise<Recipe[]> {
  const source = await getSourceBySlug(sourceSlug);
  if (!source) return [];
  const category = await getCategoryBySlug(source.id, categorySlug);
  if (!category) return [];
  const recipes = await allRecipes();
  return recipes.filter((recipe) => recipe.sourceCategoryId === category.id);
}

/** Recettes d'une source sans catégorie locale (`sourceCategoryId` nullable). */
export async function getRecipesWithoutCategoryForSource(sourceSlug: string): Promise<Recipe[]> {
  const source = await getSourceBySlug(sourceSlug);
  if (!source) return [];
  const recipes = await allRecipes();
  return recipes.filter((recipe) => recipe.sourceId === source.id && recipe.sourceCategoryId === null);
}

/**
 * Noms de matière première (canonique si liée, sinon libellé d'origine) pour
 * une recette, dédupliqués et dans l'ordre d'apparition. `RecipeCard` limite
 * déjà l'affichage aux deux premiers — cette fonction n'applique aucune
 * limite pour laisser ce choix au composant.
 */
export async function getIngredientTagsForRecipe(recipeId: string): Promise<string[]> {
  const [canonicalIngredients, recipeSections, recipeIngredients] = await Promise.all([
    allCanonicalIngredients(),
    allRecipeSections(),
    allRecipeIngredients(),
  ]);
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
  /** Visuel IA approuvé (jamais la photo source brute) — résolu par
   * `toRecipeCardData` elle-même (`getApprovedVisualUrl`, seule source de ce
   * champ pour toute page listant des recettes) ; `null`/absent tant
   * qu'aucun visuel principal n'existe, jamais un repli erreur bloquant. */
  imageUrl?: string | null;
  href: string;
}

/**
 * Assemble les props attendues par `RecipeCard` pour une recette — évite de
 * dupliquer la résolution source/catégorie/tags/visuel dans chaque page qui
 * affiche des recettes. Seule source de `imageUrl` (`getApprovedVisualUrl`) :
 * un appelant ne doit jamais le résoudre une deuxième fois séparément, pour
 * éviter deux lectures divergentes du même visuel.
 */
export async function toRecipeCardData(recipe: Recipe): Promise<RecipeCardData> {
  const [sources, sourceCategories, ingredientTags, imageUrl] = await Promise.all([
    allSources(),
    allSourceCategories(),
    getIngredientTagsForRecipe(recipe.id),
    getApprovedVisualUrl("recipe", recipe.id).catch(() => null),
  ]);
  // `sourceId` référence toujours une source existante (invariant garanti en
  // démo par data.test.ts, et par la contrainte de clé étrangère côté
  // Supabase) : pas de repli défensif ici.
  const source = sources.find((candidate) => candidate.id === recipe.sourceId)!;
  const category = recipe.sourceCategoryId
    ? sourceCategories.find((candidate) => candidate.id === recipe.sourceCategoryId)
    : undefined;

  return {
    title: recipe.title,
    sourceName: source.name,
    categoryName: category?.name,
    ingredientTags,
    imageUrl,
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

export interface RecipeEditData {
  recipe: Recipe;
  /** Préparations complètes (avec `originalText`, jamais tronquées) dans
   * leur ordre `position` d'origine — distinct de `RecipeSectionWithIngredients`
   * (assemblage d'affichage de `getRecipeDetail`, qui omet `originalText`) :
   * la modification manuelle doit pouvoir reconduire ce texte source
   * inchangé si la personne ne le touche pas (CLAUDE.md, principe 4). */
  sections: RecipeSection[];
  /** Ingrédients de toutes les préparations ci-dessus, dans leur ordre `position` d'origine. */
  ingredients: RecipeIngredient[];
}

/**
 * Données brutes nécessaires à la modification manuelle d'une recette déjà
 * enregistrée — distinct de `getRecipeDetail` (assemblage d'AFFICHAGE de la
 * fiche, pas d'édition). Le brouillon d'édition proprement dit
 * (`ImportRecipeDraft`) est construit à partir de ceci par
 * `src/lib/recipes/editDraft.ts` (hors de cette couche de lecture, pour ne
 * pas faire dépendre `src/lib/data/*` du module d'import).
 */
export async function getRecipeEditData(slug: string): Promise<RecipeEditData | undefined> {
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return undefined;

  const [allSections, allIngredients] = await Promise.all([allRecipeSections(), allRecipeIngredients()]);
  const sections = allSections.filter((section) => section.recipeId === recipe.id).sort((a, b) => a.position - b.position);
  const sectionIds = new Set(sections.map((section) => section.id));
  const ingredients = allIngredients
    .filter((ingredient) => sectionIds.has(ingredient.recipeSectionId))
    .sort((a, b) => a.position - b.position);

  return { recipe, sections, ingredients };
}

/**
 * Assemble la fiche recette complète (C5) : recette, source, catégorie
 * locale (si présente), préparations ordonnées avec leurs ingrédients
 * ordonnés, et matières premières clés. Ne construit aucune section vide —
 * cette responsabilité reste dans la page, qui décide de rendre ou non
 * chaque bloc selon ces données (CLAUDE.md, principe 2).
 */
export async function getRecipeDetail(slug: string): Promise<RecipeDetail | undefined> {
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return undefined;

  const [sources, sourceCategories, allSections, allIngredients, canonicalIngredients] = await Promise.all([
    allSources(),
    allSourceCategories(),
    allRecipeSections(),
    allRecipeIngredients(),
    allCanonicalIngredients(),
  ]);

  // Invariants garantis en démo par data.test.ts, et par les clés étrangères
  // côté Supabase : pas de repli défensif ici, voir `toRecipeCardData`.
  const source = sources.find((candidate) => candidate.id === recipe.sourceId)!;
  const category = recipe.sourceCategoryId
    ? sourceCategories.find((candidate) => candidate.id === recipe.sourceCategoryId)
    : undefined;

  const sections = allSections
    .filter((section) => section.recipeId === recipe.id)
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      id: section.id,
      name: section.name,
      ingredients: allIngredients
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
