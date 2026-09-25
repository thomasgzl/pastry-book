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
 * Pagination obligatoire (`fetchAllRows`) : l'API Supabase plafonne chaque
 * réponse à 1000 lignes par défaut, silencieusement (pas d'erreur, juste une
 * page tronquée). Constaté en usage réel sur `recipe_ingredients` (dépassé le
 * cap avec plus de 600 recettes visées, CLAUDE.md) : des préparations
 * s'affichaient sans aucun ingrédient, sans qu'aucune erreur ne soit
 * remontée nulle part. `fetchAllRows` boucle avec `.range()` jusqu'à
 * récupérer la table entière, quelle que soit sa taille.
 */

import { cache } from "react";
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

/** Cap par page de l'API Supabase (PostgREST `max-rows`, 1000 par défaut) — jamais dépassé en un seul aller-retour, d'où la boucle de `fetchAllRows`. */
const PAGE_SIZE = 1000;

/**
 * Récupère la table entière par pages de `PAGE_SIZE` lignes (`.range()`),
 * jamais une seule page qui se ferait tronquer silencieusement au-delà du cap
 * de l'API Supabase. Chaque loader ci-dessous ne fournit que la fonction de
 * page ; la boucle et la gestion d'erreur restent ici, une seule fois.
 */
async function fetchAllRows<Row>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
  errorMessage: string,
): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new DataAccessError(`${errorMessage} : ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

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

export function recipeIngredientFromRow(row: RecipeIngredientRow): RecipeIngredient {
  return {
    id: row.id,
    recipeSectionId: row.recipe_section_id,
    originalName: row.original_name,
    canonicalIngredientId: row.canonical_ingredient_id,
    originalQuantityText: row.original_quantity_text,
    // `quantity_decimal` est une colonne SQL `numeric` : PostgREST la sérialise
    // en nombre JSON, jamais en chaîne, malgré le type `Nullable<string>`
    // déclaré côté TS (`RecipeIngredientRow`, non vérifié au runtime). Jamais
    // remarqué avant K21 (suppression de recette) : partout ailleurs (affichage,
    // coefficient) un nombre JS se coerce silencieusement en chaîne ; seule la
    // validation stricte `z.string().regex(...)` du formulaire de modification
    // (`importRecipeDraftSchema`) le détecte réellement.
    quantityDecimal: row.quantity_decimal === null ? null : String(row.quantity_decimal),
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

/**
 * Chaque loader est mémoïsé pour la durée d'une seule requête (`cache()`,
 * React) : plusieurs appels au même loader pendant le rendu d'une page
 * (ex. `toRecipeCardData` appelé une fois par recette d'une liste)
 * partagent désormais un seul aller-retour Supabase au lieu d'en refaire un
 * par appel — cause principale des lenteurs de navigation constatées (K-perf,
 * ~30 requêtes Supabase mesurées pour un seul rendu de `/recettes` avec
 * quelques recettes/entreprises). Sans effet sur le résultat (mêmes données,
 * même requête), jamais partagé entre deux requêtes HTTP différentes (portée
 * de `cache()` = un seul rendu serveur).
 */

export const loadSources = cache(async (): Promise<Source[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<SourceRow>(
    (from, to) => supabase.from("sources").select("*").range(from, to),
    "Lecture des entreprises impossible",
  );
  return rows.map(sourceFromRow);
});

export const loadSourceCategories = cache(async (): Promise<SourceCategory[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<SourceCategoryRow>(
    (from, to) => supabase.from("source_categories").select("*").range(from, to),
    "Lecture des catégories impossible",
  );
  return rows.map(sourceCategoryFromRow);
});

export const loadCanonicalIngredients = cache(async (): Promise<CanonicalIngredient[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<CanonicalIngredientRow>(
    (from, to) => supabase.from("canonical_ingredients").select("*").range(from, to),
    "Lecture des matières premières impossible",
  );
  return rows.map(canonicalIngredientFromRow);
});

export const loadIngredientAliases = cache(async (): Promise<IngredientAlias[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<IngredientAliasRow>(
    (from, to) => supabase.from("ingredient_aliases").select("*").range(from, to),
    "Lecture des alias d'ingrédients impossible",
  );
  return rows.map(ingredientAliasFromRow);
});

export const loadAllergens = cache(async (): Promise<Allergen[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<AllergenRow>(
    (from, to) => supabase.from("allergens").select("*").range(from, to),
    "Lecture des allergènes impossible",
  );
  return rows.map(allergenFromRow);
});

export const loadSpecificities = cache(async (): Promise<Specificity[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<SpecificityRow>(
    (from, to) => supabase.from("specificities").select("*").range(from, to),
    "Lecture des spécificités impossible",
  );
  return rows.map(specificityFromRow);
});

export const loadRecipes = cache(async (): Promise<Recipe[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<RecipeRow>(
    (from, to) => supabase.from("recipes").select("*").range(from, to),
    "Lecture des recettes impossible",
  );
  return rows.map(recipeFromRow);
});

export const loadRecipeSections = cache(async (): Promise<RecipeSection[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<RecipeSectionRow>(
    (from, to) => supabase.from("recipe_sections").select("*").range(from, to),
    "Lecture des préparations impossible",
  );
  return rows.map(recipeSectionFromRow);
});

export const loadRecipeIngredients = cache(async (): Promise<RecipeIngredient[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<RecipeIngredientRow>(
    (from, to) => supabase.from("recipe_ingredients").select("*").range(from, to),
    "Lecture des ingrédients impossible",
  );
  return rows.map(recipeIngredientFromRow);
});

/** Tags de matière première principale curatés (recipe_key_ingredients) — voir `20260819110000_recipe_key_ingredients.sql` : distinct de `loadRecipeIngredients` (chaque ligne d'ingrédient). */
export const loadRecipeKeyIngredients = cache(async (): Promise<RecipeKeyIngredient[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<RecipeKeyIngredientRow>(
    (from, to) => supabase.from("recipe_key_ingredients").select("*").range(from, to),
    "Lecture des matières premières principales impossible",
  );
  return rows.map(recipeKeyIngredientFromRow);
});

export const loadRecipeAllergens = cache(async (): Promise<RecipeAllergen[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<RecipeAllergenRow>(
    (from, to) => supabase.from("recipe_allergens").select("*").range(from, to),
    "Lecture des allergènes de recette impossible",
  );
  return rows.map(recipeAllergenFromRow);
});

export const loadRecipeSpecificities = cache(async (): Promise<RecipeSpecificity[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAllRows<RecipeSpecificityRow>(
    (from, to) => supabase.from("recipe_specificities").select("*").range(from, to),
    "Lecture des spécificités de recette impossible",
  );
  return rows.map(recipeSpecificityFromRow);
});
