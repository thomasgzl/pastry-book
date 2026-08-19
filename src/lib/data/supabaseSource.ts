/**
 * Chargement des tables métier depuis Supabase (tâche K1) — consommé
 * uniquement par `src/lib/data/*` quand `hasSupabaseConfig()` est vrai
 * (Preview/Production, ou dev local avec un vrai projet lié). Mode démo
 * géré par chaque fichier appelant, jamais ici.
 *
 * Aucun repli silencieux : toute erreur Supabase devient une
 * `DataAccessError` explicite, jamais un retour aux données de démo
 * (CLAUDE.md, contrat K1 — même principe que `src/lib/visuals/storage.ts`
 * pour les visuels et `src/lib/import/store.ts` pour l'import).
 *
 * Chaque loader charge la table entière puis laisse le filtrage/tri à la
 * charge de l'appelant, pour rester le miroir exact de la logique déjà
 * testée sur les données de démo (mêmes fonctions `filter`/`sort`/`map`,
 * seule la source du tableau change).
 *
 * ponytail: charge la table entière à chaque appel (pas de cache ni de
 * requête filtrée/paginée) ; acceptable tant que le volume reste de l'ordre
 * de quelques centaines de recettes (CLAUDE.md, ~600 recettes visées) —
 * passer à des requêtes filtrées/paginées si ce volume devient un problème
 * mesuré en usage réel.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Allergen,
  CanonicalIngredient,
  IngredientAlias,
  Recipe,
  RecipeAllergen,
  RecipeIngredient,
  RecipeKeyIngredient,
  RecipeSection,
  RecipeSpecificity,
  Source,
  SourceCategory,
  Specificity,
} from "@/lib/domain/schemas";
import type {
  AllergenRow,
  CanonicalIngredientRow,
  IngredientAliasRow,
  RecipeAllergenRow,
  RecipeIngredientRow,
  RecipeKeyIngredientRow,
  RecipeRow,
  RecipeSectionRow,
  RecipeSpecificityRow,
  SourceCategoryRow,
  SourceRow,
  SpecificityRow,
} from "@/lib/supabase/types";

/** Échec d'une lecture Supabase (réseau, contrainte, table absente…) — toujours remonté, jamais avalé ni suivi d'un repli silencieux vers les données de démo (règle non négociable K1). */
export class DataAccessError extends Error {}

function sourceFromRow(row: SourceRow): Source {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    illustrationUrl: row.illustration_url,
    createdAt: row.created_at,
  };
}

function sourceCategoryFromRow(row: SourceCategoryRow): SourceCategory {
  return { id: row.id, sourceId: row.source_id, name: row.name, slug: row.slug, position: row.position };
}

function canonicalIngredientFromRow(row: CanonicalIngredientRow): CanonicalIngredient {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    containsGluten: row.contains_gluten,
    containsLactose: row.contains_lactose,
    containsTreeNuts: row.contains_tree_nuts,
  };
}

function ingredientAliasFromRow(row: IngredientAliasRow): IngredientAlias {
  return {
    id: row.id,
    canonicalIngredientId: row.canonical_ingredient_id,
    alias: row.alias,
    normalizedAlias: row.normalized_alias,
    status: row.status,
  };
}

function allergenFromRow(row: AllergenRow): Allergen {
  return { id: row.id, name: row.name, slug: row.slug };
}

function specificityFromRow(row: SpecificityRow): Specificity {
  return { id: row.id, name: row.name, slug: row.slug };
}

function recipeFromRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceCategoryId: row.source_category_id,
    title: row.title,
    slug: row.slug,
    additionalInformation: row.additional_information,
    originalDocumentUrl: row.original_document_url,
    photoUrl: row.photo_url,
    illustrationUrl: row.illustration_url,
    importStatus: row.import_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function recipeSectionFromRow(row: RecipeSectionRow): RecipeSection {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    name: row.name,
    position: row.position,
    originalText: row.original_text,
  };
}

function recipeIngredientFromRow(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipeSectionId: row.recipe_section_id,
    originalName: row.original_name,
    canonicalIngredientId: row.canonical_ingredient_id,
    originalQuantityText: row.original_quantity_text,
    quantityDecimal: row.quantity_decimal,
    unit: row.unit,
    position: row.position,
    verificationStatus: row.verification_status,
    confidence: row.confidence === null ? null : Number(row.confidence),
  };
}

function recipeKeyIngredientFromRow(row: RecipeKeyIngredientRow): RecipeKeyIngredient {
  return { recipeId: row.recipe_id, canonicalIngredientId: row.canonical_ingredient_id, position: row.position };
}

function recipeAllergenFromRow(row: RecipeAllergenRow): RecipeAllergen {
  return { recipeId: row.recipe_id, allergenId: row.allergen_id, status: row.status };
}

function recipeSpecificityFromRow(row: RecipeSpecificityRow): RecipeSpecificity {
  return {
    recipeId: row.recipe_id,
    specificityId: row.specificity_id,
    status: row.status,
    reason: row.reason,
    source: row.source,
  };
}

export async function loadSources(): Promise<Source[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("sources").select("*");
  if (error) throw new DataAccessError(`Lecture des entreprises impossible : ${error.message}`);
  return (data ?? []).map(sourceFromRow);
}

export async function loadSourceCategories(): Promise<SourceCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("source_categories").select("*");
  if (error) throw new DataAccessError(`Lecture des catégories impossible : ${error.message}`);
  return (data ?? []).map(sourceCategoryFromRow);
}

export async function loadCanonicalIngredients(): Promise<CanonicalIngredient[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("canonical_ingredients").select("*");
  if (error) throw new DataAccessError(`Lecture des matières premières impossible : ${error.message}`);
  return (data ?? []).map(canonicalIngredientFromRow);
}

export async function loadIngredientAliases(): Promise<IngredientAlias[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("ingredient_aliases").select("*");
  if (error) throw new DataAccessError(`Lecture des alias d'ingrédients impossible : ${error.message}`);
  return (data ?? []).map(ingredientAliasFromRow);
}

export async function loadAllergens(): Promise<Allergen[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("allergens").select("*");
  if (error) throw new DataAccessError(`Lecture des allergènes impossible : ${error.message}`);
  return (data ?? []).map(allergenFromRow);
}

export async function loadSpecificities(): Promise<Specificity[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("specificities").select("*");
  if (error) throw new DataAccessError(`Lecture des spécificités impossible : ${error.message}`);
  return (data ?? []).map(specificityFromRow);
}

export async function loadRecipes(): Promise<Recipe[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipes").select("*");
  if (error) throw new DataAccessError(`Lecture des recettes impossible : ${error.message}`);
  return (data ?? []).map(recipeFromRow);
}

export async function loadRecipeSections(): Promise<RecipeSection[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipe_sections").select("*");
  if (error) throw new DataAccessError(`Lecture des préparations impossible : ${error.message}`);
  return (data ?? []).map(recipeSectionFromRow);
}

export async function loadRecipeIngredients(): Promise<RecipeIngredient[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipe_ingredients").select("*");
  if (error) throw new DataAccessError(`Lecture des ingrédients impossible : ${error.message}`);
  return (data ?? []).map(recipeIngredientFromRow);
}

/** Tags de matière première principale curatés (recipe_key_ingredients) — voir `20260819110000_recipe_key_ingredients.sql` : distinct de `loadRecipeIngredients` (chaque ligne d'ingrédient). */
export async function loadRecipeKeyIngredients(): Promise<RecipeKeyIngredient[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipe_key_ingredients").select("*");
  if (error) throw new DataAccessError(`Lecture des matières premières principales impossible : ${error.message}`);
  return (data ?? []).map(recipeKeyIngredientFromRow);
}

export async function loadRecipeAllergens(): Promise<RecipeAllergen[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipe_allergens").select("*");
  if (error) throw new DataAccessError(`Lecture des allergènes de recette impossible : ${error.message}`);
  return (data ?? []).map(recipeAllergenFromRow);
}

export async function loadRecipeSpecificities(): Promise<RecipeSpecificity[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("recipe_specificities").select("*");
  if (error) throw new DataAccessError(`Lecture des spécificités de recette impossible : ${error.message}`);
  return (data ?? []).map(recipeSpecificityFromRow);
}
