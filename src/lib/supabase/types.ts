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
 *
 * IMPORTANT (constaté en I5) : chaque ligne de table (`XxxRow`) DOIT rester un
 * `type` (alias d'objet), jamais une `interface`. Avec une `interface`,
 * `@supabase/postgrest-js` (>= v13) résout silencieusement `Insert`/`Update`
 * en `never` pour cette table dès qu'on passe par le générique `Table<>`
 * ci-dessous — aucune erreur au moment de la déclaration, seulement au point
 * d'appel (`.insert(...)`/`.update(...)`), avec un message trompeur
 * (« … does not exist in type 'never[]' »). Confirmé par un test isolé
 * minimal reproduisant exactement ce comportement avec `interface` vs
 * `type`. Si une table est ajoutée ici, utiliser `type NouvelleRow = {...}`.
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

export type SourceRow = {
  id: string;
  name: string;
  slug: string;
  description: Nullable<string>;
  illustration_url: Nullable<string>;
  created_at: string;
};

export type SourceCategoryRow = {
  id: string;
  source_id: string;
  name: string;
  slug: string;
  position: number;
};

export type CanonicalIngredientRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: Nullable<string>;
};

export type IngredientAliasRow = {
  id: string;
  canonical_ingredient_id: string;
  alias: string;
  normalized_alias: string;
  status: AliasStatus;
};

export type AllergenRow = {
  id: string;
  name: string;
  slug: string;
};

export type SpecificityRow = {
  id: string;
  name: string;
  slug: string;
};

export type IngredientAllergenRow = {
  canonical_ingredient_id: string;
  allergen_id: string;
  status: VerificationStatus;
};

export type RecipeRow = {
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
};

export type RecipeSectionRow = {
  id: string;
  recipe_id: string;
  name: Nullable<string>;
  position: number;
  original_text: Nullable<string>;
};

export type RecipeIngredientRow = {
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
};

export type RecipeSpecificityRow = {
  recipe_id: string;
  specificity_id: string;
  status: SpecificityStatus;
  reason: Nullable<string>;
  source: SpecificitySource;
};

export type RecipeAllergenRow = {
  recipe_id: string;
  allergen_id: string;
  status: VerificationStatus;
};

export type ImportBatchRow = {
  id: string;
  status: JobStatus;
  created_at: string;
};

export type ImportItemRow = {
  id: string;
  import_batch_id: string;
  /** Nullable depuis `20260814090200_import_source_file_url_nullable.sql` — la saisie manuelle sans fichier écrit `null` (jamais une URL fictive). */
  source_file_url: Nullable<string>;
  /** SHA-256 hex minuscule du fichier source, depuis `20260815100000_import_source_file_hash.sql` — pour la détection de doublons par fichier identique (K4). Nullable tant qu'aucun fichier n'est associé. */
  source_file_hash: Nullable<string>;
  status: JobStatus;
  raw_extraction: unknown;
  proposed_recipe: unknown;
  errors: string[];
  recipe_id: Nullable<string>;
};

export type VisualAssetRow = {
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
};

/**
 * `Relationships: []` requis depuis `@supabase/postgrest-js` v13 (le type
 * générique `GenericTable` du SDK l'exige, même sans clé étrangère décrite
 * ici) : sans lui, `.from(...)` résout `Insert`/`Update` en `never` côté
 * TypeScript. Aucune relation embarquée utilisée par ce projet (pas de
 * `select("*, autre(*)")`), donc toujours vide.
 */
type Table<Row, DefaultedKeys extends keyof Row> = {
  Row: Row;
  Insert: InsertOf<Row, DefaultedKeys>;
  Update: UpdateOf<Row>;
  Relationships: [];
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
        | "id"
        | "source_file_hash"
        | "status"
        | "raw_extraction"
        | "proposed_recipe"
        | "errors"
        | "recipe_id"
      >;
      visual_assets: Table<
        VisualAssetRow,
        "id" | "status" | "is_primary" | "source_photo_url" | "created_at"
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
