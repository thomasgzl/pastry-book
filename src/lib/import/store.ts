/**
 * Persistance de l'import (I5) — écritures réelles Supabase
 * (`import_batches`/`import_items`/`recipes`/`recipe_sections`/
 * `recipe_ingredients`/`source_categories`) quand `hasSupabaseConfig()` est
 * vrai, repli en mémoire process sinon (dev local sans Supabase, tests
 * unitaires — jamais de vrai appel réseau dans ces deux cas). Aucun repli
 * silencieux vers la mémoire quand Supabase EST configuré : un échec
 * d'écriture Supabase lève une erreur explicite (CLAUDE.md, règle I5).
 *
 * Toutes les fonctions exportées sont asynchrones (même le repli mémoire) :
 * appelées uniquement depuis les Server Actions de
 * `src/app/(app)/importer/importActions.ts`, jamais directement depuis
 * `ImporterWizard.tsx` (Client Component) — un Client Component ne peut pas
 * attendre une vraie requête Supabase de façon synchrone pendant le rendu.
 *
 * Écritures via `createSupabaseAdminClient()` (service_role, contourne RLS) :
 * même convention que documentée dans
 * `supabase/migrations/20260814090100_rls_policies.sql` (« écritures
 * privilégiées de l'import »).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import type { RecipeRow, SourceCategoryRow } from "@/lib/supabase/types";
import { getCategoriesForSource } from "@/lib/data/categories";
import { getRecipes } from "@/lib/data/recipes";
import type {
  ImportBatch,
  ImportItem,
  Recipe,
  SourceCategory,
} from "@/lib/domain/schemas";
import { combineAdditionalInformation, IMPORT_SCHEMA_VERSION, type ImportRecipeDraft } from "@/lib/import/schema";
import { findDuplicateRecipe, slugify } from "@/lib/import/model";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * Miroir minimal de `PostgrestResponseSuccess<T> | PostgrestResponseFailure`
 * (`@supabase/postgrest-js`) — une union à deux branches discriminées par
 * `error`, jamais un objet unique `{ data: T | null; error: ... | null }` :
 * cette dernière forme empêche TypeScript d'inférer correctement `T` au
 * point d'appel (constaté en I5, `T` résolu en `T | null`).
 */
type SupabaseResult<T> = { data: T; error: null } | { data: null; error: { message: string } };

/** Ne fait jamais confiance à un résultat Supabase silencieusement : une erreur ou une donnée absente devient une exception explicite, jamais un enregistrement partiel non signalé. */
function unwrap<T>(result: SupabaseResult<T>, context: string): T {
  if (result.error) {
    throw new Error(`Écriture ou lecture Supabase échouée (${context}) : ${result.error.message}`);
  }
  return result.data;
}

function mapRecipeRow(row: RecipeRow): Recipe {
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

function mapCategoryRow(row: SourceCategoryRow): SourceCategory {
  return { id: row.id, sourceId: row.source_id, name: row.name, slug: row.slug, position: row.position };
}

/**
 * Reconstruit `ImportItem` à partir d'une ligne `import_items`.
 * `sourceFileName` n'a pas de colonne dédiée en base (jamais ajoutée pour
 * cette tâche, migrations hors périmètre) : dérivé du premier fichier
 * conservé dans `proposed_recipe` (JSON déjà persisté), même source que
 * `sourceFileNameFor` en mode mémoire ci-dessous.
 */
function mapImportItemRow(row: {
  id: string;
  import_batch_id: string;
  source_file_url: string | null;
  status: string;
  raw_extraction: unknown;
  proposed_recipe: unknown;
  errors: string[];
  recipe_id: string | null;
}): ImportItem {
  const proposed = row.proposed_recipe as ImportRecipeDraft | null;
  return {
    id: row.id,
    importBatchId: row.import_batch_id,
    sourceFileUrl: row.source_file_url,
    sourceFileName: proposed?.originalFiles?.[0]?.name ?? null,
    status: row.status as ImportItem["status"],
    rawExtraction: row.raw_extraction ?? null,
    proposedRecipe: row.proposed_recipe ?? null,
    errors: row.errors,
    recipeId: row.recipe_id,
  };
}

export type SaveImportRecipeResult =
  | { status: "duplicate"; duplicate: { title: string; sourceId: string } }
  | { status: "already_saved"; recipe: Recipe; item: ImportItem }
  | { status: "saved"; recipe: Recipe; item: ImportItem };

interface SaveImportRecipeParams {
  batchId: string;
  draft: ImportRecipeDraft;
  rawExtraction: unknown;
  providerName: string;
  acknowledgeDuplicate?: boolean;
}

// ============================================================
// Repli en mémoire process — dev local sans Supabase configuré, et tests
// unitaires (`hasSupabaseConfig()` faux dans les deux cas : ni `.env.local`
// ni variables d'environnement Supabase ne sont chargées par `vitest`).
// ============================================================

const CREATED_AT = () => new Date().toISOString();

let memoryBatches: ImportBatch[] = [];
let memoryItems: ImportItem[] = [];
let memorySavedRecipes: { recipe: Recipe }[] = [];
let memorySessionCategories: SourceCategory[] = [];

/** Réinitialise le repli en mémoire — réservé aux tests. */
export function resetImportStoreForTests(): void {
  memoryBatches = [];
  memoryItems = [];
  memorySavedRecipes = [];
  memorySessionCategories = [];
}

function createImportBatchMemory(): ImportBatch {
  const batch: ImportBatch = { id: crypto.randomUUID(), status: "pending", createdAt: CREATED_AT() };
  memoryBatches.push(batch);
  return batch;
}

function getCategoriesForSourceIncludingSessionMemory(sourceId: string): SourceCategory[] {
  return [...getCategoriesForSource(sourceId), ...memorySessionCategories.filter((c) => c.sourceId === sourceId)];
}

function createLocalCategoryMemory(sourceId: string, name: string): SourceCategory {
  const trimmed = name.trim();
  const existing = getCategoriesForSourceIncludingSessionMemory(sourceId).find(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing;

  const category: SourceCategory = {
    id: crypto.randomUUID(),
    sourceId,
    name: trimmed,
    slug: slugify(trimmed),
    position: getCategoriesForSourceIncludingSessionMemory(sourceId).length,
  };
  memorySessionCategories.push(category);
  return category;
}

function allKnownRecipesForDuplicateCheckMemory(): { title: string; sourceId: string }[] {
  return [
    ...getRecipes().map((recipe) => ({ title: recipe.title, sourceId: recipe.sourceId })),
    ...memorySavedRecipes.map(({ recipe }) => ({ title: recipe.title, sourceId: recipe.sourceId })),
  ];
}

function checkDuplicateMemory(title: string, sourceId: string): { title: string; sourceId: string } | null {
  return findDuplicateRecipe(title, sourceId, allKnownRecipesForDuplicateCheckMemory());
}

function uniqueSlugMemory(title: string): string {
  const base = slugify(title);
  const taken = new Set([...getRecipes().map((r) => r.slug), ...memorySavedRecipes.map((r) => r.recipe.slug)]);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Nom du fichier local choisi, le cas échéant — aucun fichier n'étant réellement stocké en mode mémoire, jamais une URL. */
function sourceFileNameFor(draft: ImportRecipeDraft): string | null {
  return draft.originalFiles[0]?.name ?? null;
}

/**
 * Chemin Storage réel du premier fichier source archivé (I6, upload direct
 * navigateur → bucket privé `recipe-sources` déclenché depuis `FilesStep.tsx`)
 * — jamais une URL inventée. `null` tant qu'aucun
 * fichier n'a été réellement archivé (texte collé, saisie manuelle, mode
 * démonstration sans Supabase configuré, ou échec d'archivage non résolu par
 * la personne avant l'enregistrement).
 */
function sourceFileUrlFor(draft: ImportRecipeDraft): string | null {
  return draft.originalFiles[0]?.sourceFileUrl ?? null;
}

function findItemForDraftIdMemory(draftId: string): ImportItem | undefined {
  return memoryItems.find(
    (item) =>
      item.status === "done" &&
      typeof item.proposedRecipe === "object" &&
      item.proposedRecipe !== null &&
      (item.proposedRecipe as { id?: unknown }).id === draftId,
  );
}

/**
 * Enregistre une recette validée par la personne (dernier clic explicite,
 * jamais automatique — CLAUDE.md). Idempotent : ré-invoquer avec le même
 * `draft.id` (ex. double clic, nouvelle tentative après coupure réseau) ne
 * crée jamais une seconde recette, retourne celle déjà enregistrée.
 */
function saveImportRecipeMemory(params: SaveImportRecipeParams): SaveImportRecipeResult {
  const { batchId, draft, rawExtraction, providerName, acknowledgeDuplicate = false } = params;

  const alreadySaved = findItemForDraftIdMemory(draft.id);
  if (alreadySaved && alreadySaved.recipeId) {
    const recipe = memorySavedRecipes.find((entry) => entry.recipe.id === alreadySaved.recipeId)!.recipe;
    return { status: "already_saved", recipe, item: alreadySaved };
  }

  const duplicate = checkDuplicateMemory(draft.title, draft.sourceId);
  if (duplicate && !acknowledgeDuplicate) {
    return { status: "duplicate", duplicate };
  }

  const now = CREATED_AT();
  const recipeId = crypto.randomUUID();

  const recipe: Recipe = {
    id: recipeId,
    sourceId: draft.sourceId,
    sourceCategoryId: draft.sourceCategoryId,
    title: draft.title,
    slug: uniqueSlugMemory(draft.title),
    additionalInformation: combineAdditionalInformation(draft),
    // Chemin Storage réel du premier fichier archivé (I6) — `null` si aucun
    // fichier n'a été uploadé (texte collé, saisie manuelle, ou archivage
    // resté sans Supabase configuré), jamais une URL inventée.
    originalDocumentUrl: sourceFileUrlFor(draft),
    photoUrl: null,
    illustrationUrl: null,
    // Ce clic est l'action de validation humaine explicite (CLAUDE.md) :
    // la recette n'est plus `needs_review` au niveau recette, même si des
    // champs individuels (ingrédients, allergènes…) restent `proposed`/
    // `needs_review` et continueront d'afficher « À vérifier ».
    importStatus: "validated",
    createdAt: now,
    updatedAt: now,
  };
  memorySavedRecipes.push({ recipe });

  const item: ImportItem = {
    id: crypto.randomUUID(),
    importBatchId: batchId,
    sourceFileUrl: sourceFileUrlFor(draft),
    sourceFileName: sourceFileNameFor(draft),
    status: "done",
    rawExtraction,
    proposedRecipe: draft,
    errors: [],
    recipeId,
  };
  memoryItems.push(item);

  const batch = memoryBatches.find((b) => b.id === batchId);
  if (batch) batch.status = "done";

  // Journalisation minimale (règle CLAUDE.md « journaliser modèle, version
  // du schéma et avertissements ») — pas d'infra de logs dédiée en mode
  // mémoire, console structurée suffit ici.
  console.info("[import] recette enregistrée (mémoire)", {
    model: providerName,
    schemaVersion: IMPORT_SCHEMA_VERSION,
    warnings: draft.warnings,
    recipeId,
  });

  return { status: "saved", recipe, item };
}

function getSavedRecipesMemory(): Recipe[] {
  return memorySavedRecipes.map(({ recipe }) => recipe);
}

// ============================================================
// Persistance Supabase réelle
// ============================================================

async function createImportBatchSupabase(client: SupabaseAdminClient): Promise<ImportBatch> {
  const result = await client.from("import_batches").insert({}).select().single();
  const row = unwrap(result, "création du lot d'import");
  return { id: row.id, status: row.status, createdAt: row.created_at };
}

async function getCategoriesForSourceSupabase(client: SupabaseAdminClient, sourceId: string): Promise<SourceCategory[]> {
  const result = await client
    .from("source_categories")
    .select("*")
    .eq("source_id", sourceId)
    .order("position", { ascending: true });
  const rows = unwrap(result, "lecture des catégories locales");
  return rows.map(mapCategoryRow);
}

async function createLocalCategorySupabase(
  client: SupabaseAdminClient,
  sourceId: string,
  name: string,
): Promise<SourceCategory> {
  const trimmed = name.trim();
  // Le résultat est d'abord affecté à une constante avant `unwrap(...)` :
  // passer directement `await chaîne.single()` en argument inline empêche
  // TypeScript d'inférer correctement le type générique de `unwrap` avec
  // cette version de `@supabase/postgrest-js` (constaté en I5).
  const existingResult = await client.from("source_categories").select("*").eq("source_id", sourceId);
  const existingRows = unwrap(existingResult, "lecture des catégories locales existantes");
  const existing = existingRows.find((row) => row.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return mapCategoryRow(existing);

  const insertResult = await client
    .from("source_categories")
    .insert({ source_id: sourceId, name: trimmed, slug: slugify(trimmed), position: existingRows.length })
    .select()
    .single();
  const inserted = unwrap(insertResult, "création de la catégorie locale");
  return mapCategoryRow(inserted);
}

async function checkDuplicateSupabase(
  client: SupabaseAdminClient,
  title: string,
  sourceId: string,
): Promise<{ title: string; sourceId: string } | null> {
  const result = await client.from("recipes").select("title, source_id").eq("source_id", sourceId);
  const rows = unwrap(result, "vérification de doublon");
  return findDuplicateRecipe(
    title,
    sourceId,
    rows.map((row) => ({ title: row.title, sourceId: row.source_id })),
  );
}

async function uniqueSlugSupabase(client: SupabaseAdminClient, sourceId: string, title: string): Promise<string> {
  const base = slugify(title);
  const result = await client.from("recipes").select("slug").eq("source_id", sourceId);
  const rows = unwrap(result, "lecture des slugs existants");
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

async function findItemForDraftIdSupabase(client: SupabaseAdminClient, draftId: string): Promise<ImportItem | null> {
  const result = await client
    .from("import_items")
    .select("*")
    .eq("proposed_recipe->>id", draftId)
    .eq("status", "done")
    .not("recipe_id", "is", null)
    .limit(1)
    .maybeSingle();
  if (result.error) {
    throw new Error(`Vérification d'idempotence de l'import échouée : ${result.error.message}`);
  }
  return result.data ? mapImportItemRow(result.data) : null;
}

/**
 * Enregistre une recette validée par la personne dans Supabase. Idempotent
 * par `draft.id` (même garantie qu'en mémoire). Aucune vraie transaction
 * multi-tables disponible via l'API REST Supabase sans fonction Postgres
 * dédiée (hors périmètre — migrations réservées à `data-security-agent`) :
 * en cas d'échec après la création de la recette, celle-ci est supprimée en
 * compensation (cascade sur `recipe_sections`/`recipe_ingredients`) plutôt
 * que de laisser un enregistrement partiel silencieux.
 * ponytail: nettoyage compensatoire best-effort, pas une transaction ACID
 * réelle — à remplacer par une fonction Postgres (`rpc`) si des écritures
 * concurrentes sur la même recette deviennent un problème réel.
 */
async function saveImportRecipeSupabase(
  client: SupabaseAdminClient,
  params: SaveImportRecipeParams,
): Promise<SaveImportRecipeResult> {
  const { batchId, draft, rawExtraction, providerName, acknowledgeDuplicate = false } = params;

  const alreadySaved = await findItemForDraftIdSupabase(client, draft.id);
  if (alreadySaved && alreadySaved.recipeId) {
    const recipeResult = await client.from("recipes").select("*").eq("id", alreadySaved.recipeId).maybeSingle();
    if (recipeResult.error) {
      throw new Error(`Relecture de la recette déjà enregistrée échouée : ${recipeResult.error.message}`);
    }
    if (!recipeResult.data) {
      throw new Error(
        "Recette déjà enregistrée introuvable en base (incohérence de données) — jamais recréée automatiquement.",
      );
    }
    return { status: "already_saved", recipe: mapRecipeRow(recipeResult.data), item: alreadySaved };
  }

  const duplicate = await checkDuplicateSupabase(client, draft.title, draft.sourceId);
  if (duplicate && !acknowledgeDuplicate) {
    return { status: "duplicate", duplicate };
  }

  const slug = await uniqueSlugSupabase(client, draft.sourceId, draft.title);

  const recipeInsertResult = await client
    .from("recipes")
    .insert({
      source_id: draft.sourceId,
      source_category_id: draft.sourceCategoryId,
      title: draft.title,
      slug,
      additional_information: combineAdditionalInformation(draft),
      original_document_url: sourceFileUrlFor(draft),
      photo_url: null,
      illustration_url: null,
      import_status: "validated",
    })
    .select()
    .single();
  const recipeInsert = unwrap(recipeInsertResult, "création de la recette");
  const recipeId = recipeInsert.id;

  try {
    // L'ordre RETURNING d'un INSERT multi-lignes en une seule instruction
    // suit l'ordre des valeurs fournies (garantie Postgres) : les index
    // ci-dessous restent alignés sans identifiant temporaire supplémentaire.
    const sectionsInsertResult = await client
      .from("recipe_sections")
      .insert(
        draft.sections.map((section, index) => ({
          recipe_id: recipeId,
          name: section.name,
          position: index,
          original_text: section.originalText,
        })),
      )
      .select();
    const sectionsInsert = unwrap(sectionsInsertResult, "création des préparations");

    const ingredientsPayload = draft.sections.flatMap((section, sectionIndex) =>
      section.ingredients.map((ingredient, ingredientIndex) => ({
        recipe_section_id: sectionsInsert[sectionIndex].id,
        original_name: ingredient.originalName,
        canonical_ingredient_id: ingredient.canonicalIngredientId,
        original_quantity_text: ingredient.originalQuantityText,
        quantity_decimal: ingredient.quantityDecimal,
        unit: ingredient.unit,
        position: ingredientIndex,
        verification_status: ingredient.verificationStatus,
        confidence: null,
      })),
    );
    const ingredientsInsertResult = await client.from("recipe_ingredients").insert(ingredientsPayload).select();
    unwrap(ingredientsInsertResult, "création des ingrédients");

    const itemInsertResult = await client
      .from("import_items")
      .insert({
        import_batch_id: batchId,
        source_file_url: sourceFileUrlFor(draft),
        status: "done",
        raw_extraction: rawExtraction,
        proposed_recipe: draft,
        errors: [],
        recipe_id: recipeId,
      })
      .select()
      .single();
    const itemInsert = unwrap(itemInsertResult, "enregistrement du suivi d'import");

    const batchUpdate = await client.from("import_batches").update({ status: "done" }).eq("id", batchId);
    if (batchUpdate.error) {
      throw new Error(`Mise à jour du statut du lot d'import échouée : ${batchUpdate.error.message}`);
    }

    // Journalisation minimale (règle CLAUDE.md « journaliser modèle, version
    // du schéma et avertissements »).
    console.info("[import] recette enregistrée (Supabase)", {
      model: providerName,
      schemaVersion: IMPORT_SCHEMA_VERSION,
      warnings: draft.warnings,
      recipeId,
    });

    return { status: "saved", recipe: mapRecipeRow(recipeInsert), item: mapImportItemRow(itemInsert) };
  } catch (error) {
    const baseMessage = error instanceof Error ? error.message : String(error);
    const cleanup = await client.from("recipes").delete().eq("id", recipeId);
    if (cleanup.error) {
      throw new Error(
        `${baseMessage} — ATTENTION : le nettoyage automatique de la recette partielle a également échoué ` +
          `(${cleanup.error.message}), vérification manuelle requise en base (recette ${recipeId}).`,
      );
    }
    throw new Error(baseMessage);
  }
}

async function getSavedRecipesSupabase(client: SupabaseAdminClient): Promise<Recipe[]> {
  const result = await client.from("recipes").select("*");
  const rows = unwrap(result, "lecture des recettes enregistrées");
  return rows.map(mapRecipeRow);
}

// ============================================================
// API publique — branchement Supabase réel / repli mémoire, jamais l'inverse
// silencieux quand Supabase est configuré (CLAUDE.md, règle I5).
// ============================================================

export async function createImportBatch(): Promise<ImportBatch> {
  if (!hasSupabaseConfig()) return createImportBatchMemory();
  return createImportBatchSupabase(createSupabaseAdminClient());
}

/** Catégories locales à une source : jamais partagées entre entreprises (CLAUDE.md, principe 6). */
export async function getCategoriesForSourceIncludingSession(sourceId: string): Promise<SourceCategory[]> {
  if (!hasSupabaseConfig()) return getCategoriesForSourceIncludingSessionMemory(sourceId);
  return getCategoriesForSourceSupabase(createSupabaseAdminClient(), sourceId);
}

/** Crée une catégorie locale, ou retourne celle qui existe déjà pour ce nom (comparaison insensible casse) — jamais un doublon silencieux. */
export async function createLocalCategory(sourceId: string, name: string): Promise<SourceCategory> {
  if (!hasSupabaseConfig()) return createLocalCategoryMemory(sourceId, name);
  return createLocalCategorySupabase(createSupabaseAdminClient(), sourceId, name);
}

/** Signale un doublon probable (même titre normalisé + même source) sans jamais bloquer silencieusement — l'appelant décide d'exiger une confirmation explicite. */
export async function checkDuplicate(title: string, sourceId: string): Promise<{ title: string; sourceId: string } | null> {
  if (!hasSupabaseConfig()) return checkDuplicateMemory(title, sourceId);
  return checkDuplicateSupabase(createSupabaseAdminClient(), title, sourceId);
}

export async function saveImportRecipe(params: SaveImportRecipeParams): Promise<SaveImportRecipeResult> {
  if (!hasSupabaseConfig()) return saveImportRecipeMemory(params);
  return saveImportRecipeSupabase(createSupabaseAdminClient(), params);
}

export async function getSavedRecipes(): Promise<Recipe[]> {
  if (!hasSupabaseConfig()) return getSavedRecipesMemory();
  return getSavedRecipesSupabase(createSupabaseAdminClient());
}
