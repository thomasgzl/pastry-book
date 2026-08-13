/**
 * Types du client Supabase typé (tâche B4).
 * Miroir exact du schéma SQL de `supabase/migrations/20260814090000_schema.sql`.
 *
 * Convention : colonnes en snake_case, identiques à la base — la conversion
 * vers les contrats camelCase de `src/lib/domain/schemas.ts` (source de
 * vérité fonctionnelle) est à la charge de la couche d'accès métier qui
 * consomme ce client, pas de ce fichier.
 *
 * Écrit à la main : `supabase gen types typescript --local` n'a pas pu être
 * exécuté dans cet environnement (Docker indisponible — voir rapport de
 * livraison B3/B4). À régénérer avec cette commande dès qu'un environnement
 * Docker est disponible, pour remplacer ce fichier par la version générée.
 */

type Nullable<T> = T | null;

/** Insert : les colonnes avec valeur par défaut en base deviennent optionnelles. */
type InsertOf<Row, DefaultedKeys extends keyof Row> = Omit<Row, DefaultedKeys> &
  Partial<Pick<Row, DefaultedKeys>>;
type UpdateOf<Row> = Partial<Row>;

export type VerificationStatus = "confirmed" | "proposed" | "needs_review";
export type ImportStatus = "draft" | "needs_review" | "validated";
export type SpecificityStatus = "confirmed" | "proposed" | "rejected";
export type SpecificitySource = "manual" | "rule" | "ai";
export type VisualAssetStatus = "draft" | "approved" | "rejected";
export type AliasStatus = "confirmed" | "proposed";
export type JobStatus = "pending" | "processing" | "needs_review" | "done" | "error";
/** `source_category` en snake_case côté base ; `sourceCategory` côté contrat Zod (schemas.ts). */
export type VisualSubjectType = "ingredient" | "recipe" | "source" | "source_category";

export interface SourceRow {
  id: string;
  name: string;
  slug: string;
  description: Nullable<string>;
  illustration_url: Nullable<string>;
  created_at: string;
}

export interface SourceCategoryRow {
  id: string;
  source_id: string;
  name: string;
  slug: string;
  position: number;
}

export interface CanonicalIngredientRow {
  id: string;
  name: string;
  slug: string;
  parent_id: Nullable<string>;
}

export interface IngredientAliasRow {
  id: string;
  canonical_ingredient_id: string;
  alias: string;
  normalized_alias: string;
  status: AliasStatus;
}

export interface AllergenRow {
  id: string;
  name: string;
  slug: string;
}

export interface SpecificityRow {
  id: string;
  name: string;
  slug: string;
}

export interface IngredientAllergenRow {
  canonical_ingredient_id: string;
  allergen_id: string;
  status: VerificationStatus;
}

export interface RecipeRow {
  id: string;
  source_id: string;
  source_category_id: Nullable<string>;
  title: string;
  slug: string;
  additional_information: Nullable<string>;
  original_document_url: Nullable<string>;
  photo_url: Nullable<string>;
  illustration_url: Nullable<string>;
  import_status: ImportStatus;
  created_at: string;
  updated_at: string;
}

export interface RecipeSectionRow {
  id: string;
  recipe_id: string;
  name: Nullable<string>;
  position: number;
  original_text: Nullable<string>;
}

export interface RecipeIngredientRow {
  id: string;
  recipe_section_id: string;
  original_name: string;
  canonical_ingredient_id: Nullable<string>;
  original_quantity_text: Nullable<string>;
  /** Décimal PostgreSQL sérialisé en chaîne côté client JS, jamais `number`. */
  quantity_decimal: Nullable<string>;
  unit: Nullable<string>;
  position: number;
  verification_status: VerificationStatus;
  confidence: Nullable<string>;
}

export interface RecipeSpecificityRow {
  recipe_id: string;
  specificity_id: string;
  status: SpecificityStatus;
  reason: Nullable<string>;
  source: SpecificitySource;
}

export interface RecipeAllergenRow {
  recipe_id: string;
  allergen_id: string;
  status: VerificationStatus;
}

export interface ImportBatchRow {
  id: string;
  status: JobStatus;
  created_at: string;
}

export interface ImportItemRow {
  id: string;
  import_batch_id: string;
  source_file_url: string;
  status: JobStatus;
  raw_extraction: unknown;
  proposed_recipe: unknown;
  errors: string[];
  recipe_id: Nullable<string>;
}

export interface VisualAssetRow {
  id: string;
  subject_type: VisualSubjectType;
  subject_id: string;
  status: VisualAssetStatus;
  is_primary: boolean;
  image_url: string;
  source_photo_url: Nullable<string>;
  prompt: string;
  preset_version: string;
  created_at: string;
}

type Table<Row, DefaultedKeys extends keyof Row> = {
  Row: Row;
  Insert: InsertOf<Row, DefaultedKeys>;
  Update: UpdateOf<Row>;
};

export interface Database {
  public: {
    Tables: {
      sources: Table<SourceRow, "id" | "created_at">;
      source_categories: Table<SourceCategoryRow, "id" | "position">;
      canonical_ingredients: Table<CanonicalIngredientRow, "id">;
      ingredient_aliases: Table<IngredientAliasRow, "id" | "status">;
      allergens: Table<AllergenRow, "id">;
      specificities: Table<SpecificityRow, "id">;
      ingredient_allergens: Table<IngredientAllergenRow, "status">;
      recipes: Table<
        RecipeRow,
        "id" | "import_status" | "created_at" | "updated_at" | "source_category_id"
      >;
      recipe_sections: Table<RecipeSectionRow, "id" | "position" | "name" | "original_text">;
      recipe_ingredients: Table<
        RecipeIngredientRow,
        | "id"
        | "canonical_ingredient_id"
        | "original_quantity_text"
        | "quantity_decimal"
        | "unit"
        | "position"
        | "verification_status"
        | "confidence"
      >;
      recipe_specificities: Table<RecipeSpecificityRow, "status" | "reason" | "source">;
      recipe_allergens: Table<RecipeAllergenRow, "status">;
      import_batches: Table<ImportBatchRow, "id" | "status" | "created_at">;
      import_items: Table<
        ImportItemRow,
        "id" | "status" | "raw_extraction" | "proposed_recipe" | "errors" | "recipe_id"
      >;
      visual_assets: Table<
        VisualAssetRow,
        "id" | "status" | "is_primary" | "source_photo_url" | "created_at"
      >;
    };
  };
}
