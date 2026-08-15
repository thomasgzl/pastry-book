/**
 * Persistance de l'import (I5, durcie en K3-DATA) — écritures réelles
 * Supabase (`import_batches`/`import_items`/`recipes`/`recipe_sections`/
 * `recipe_ingredients`/`recipe_allergens`/`recipe_specificities`/
 * `source_categories`) quand `hasSupabaseConfig()` est vrai, repli en mémoire
 * process sinon (dev local sans Supabase, tests unitaires — jamais de vrai
 * appel réseau dans ces deux cas). Aucun repli silencieux vers la mémoire
 * quand Supabase EST configuré : un échec d'écriture Supabase lève une
 * erreur explicite (CLAUDE.md, règle I5).
 *
 * Atomicité réelle (K3-DATA) : l'écriture multi-tables passe par UNE seule
 * fonction Postgres (`save_import_recipe`, voir
 * `supabase/migrations/20260815110000_save_import_recipe_rpc.sql`), appelée
 * via `client.rpc(...)`. L'API REST de PostgREST ne permet pas de faire
 * tenir plusieurs écritures sur des tables différentes dans une seule
 * transaction ACID (chaque appel REST est sa propre transaction) — une
 * fonction PL/pgSQL, elle, s'exécute dans une seule transaction implicite :
 * toute exception annule automatiquement TOUTES les écritures déjà faites
 * (recette, préparations, ingrédients, allergènes, spécificités, suivi
 * d'import), sans code de compensation côté JS ni demi-recette possible.
 * L'idempotence par `draft.id` (double clic, nouvelle tentative après
 * coupure réseau) est vérifiée À L'INTÉRIEUR de cette même fonction — jamais
 * par un aller-retour séparé avant l'insertion, qui laisserait une fenêtre de
 * compétition entre la vérification et l'écriture.
 *
 * Fichier Storage orphelin après échec (K3-DATA) : si `save_import_recipe`
 * échoue après qu'un fichier source a été réellement archivé (I6), ce
 * fichier n'est **jamais supprimé automatiquement** ici — la correction reste
 * reprenable côté formulaire (même `draft`, même `sourceFileUrl`) et une
 * suppression immédiate casserait cette reprise. Un avertissement structuré
 * (jamais silencieux) est journalisé pour un traitement différé
 * (vérification/suppression manuelle) plutôt qu'une suppression automatique
 * non sûre — voir `logPossiblyOrphanedSourceFile`.
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
 * privilégiées de l'import »). `save_import_recipe` n'est d'ailleurs
 * exécutable QUE par `service_role` (revoke/grant en fin de migration),
 * jamais par `authenticated` depuis le navigateur.
 */

import { createHash } from "node:crypto";
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
import { combineAdditionalInformation, IMPORT_SCHEMA_VERSION, type ImportRecipeDraft, type ImportSectionDraft } from "@/lib/import/schema";
import { findDuplicateRecipe, slugify } from "@/lib/import/model";
import { normalizeText } from "@/lib/recipes/search";
import { SOURCE_BUCKET } from "@/lib/import/sourceUpload";

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

/**
 * Rapport de doublons potentiels (K4) — ne bloque jamais, ne fusionne jamais
 * automatiquement deux recettes : chaque entrée est une différence à
 * présenter à la personne, la décision reste toujours humaine. Complète
 * `checkDuplicate` (même titre + même source, seul cas déjà branché à
 * l'écran de vérification existant) avec les trois autres cas demandés par
 * K4 : même titre dans une AUTRE source, fichier source déjà importé
 * (hash identique), et préparation homonyme (même nom de préparation
 * existant déjà ailleurs — deux préparations homonymes de sources ou
 * recettes différentes restent normales et indépendantes, ceci est
 * seulement informatif).
 */
export interface ImportDuplicateMatch {
  kind: "same_title_same_source" | "same_title_other_source" | "same_file_hash" | "homonymous_preparation";
  recipeId: string | null;
  recipeTitle: string | null;
  sourceId: string | null;
  sectionName?: string | null;
}

export interface CheckImportDuplicatesParams {
  title: string;
  sourceId: string;
  /** SHA-256 hex du fichier source, s'il a déjà été calculé — `null`/absent si aucun fichier ou hash pas encore connu. */
  fileHash?: string | null;
  /** Noms de préparation du brouillon en cours (`section.name`), vides ignorés. */
  sectionNames?: string[];
}

// ============================================================
// Repli en mémoire process — dev local sans Supabase configuré, et tests
// unitaires (`hasSupabaseConfig()` faux dans les deux cas : ni `.env.local`
// ni variables d'environnement Supabase ne sont chargées par `vitest`).
// ============================================================

const CREATED_AT = () => new Date().toISOString();

let memoryBatches: ImportBatch[] = [];
let memoryItems: ImportItem[] = [];
/** `sections` conservé uniquement pour la détection de préparation homonyme (K4) en mode mémoire — jamais persisté tel quel côté Supabase (voir `recipe_sections`, table réelle). */
let memorySavedRecipes: { recipe: Recipe; sections: ImportSectionDraft[] }[] = [];
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

async function getCategoriesForSourceIncludingSessionMemory(sourceId: string): Promise<SourceCategory[]> {
  return [...(await getCategoriesForSource(sourceId)), ...memorySessionCategories.filter((c) => c.sourceId === sourceId)];
}

async function createLocalCategoryMemory(sourceId: string, name: string): Promise<SourceCategory> {
  const trimmed = name.trim();
  const existingCategories = await getCategoriesForSourceIncludingSessionMemory(sourceId);
  const existing = existingCategories.find(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing;

  const category: SourceCategory = {
    id: crypto.randomUUID(),
    sourceId,
    name: trimmed,
    slug: slugify(trimmed),
    position: existingCategories.length,
  };
  memorySessionCategories.push(category);
  return category;
}

async function allKnownRecipesForDuplicateCheckMemory(): Promise<{ title: string; sourceId: string }[]> {
  return [
    ...(await getRecipes()).map((recipe) => ({ title: recipe.title, sourceId: recipe.sourceId })),
    ...memorySavedRecipes.map(({ recipe }) => ({ title: recipe.title, sourceId: recipe.sourceId })),
  ];
}

async function checkDuplicateMemory(title: string, sourceId: string): Promise<{ title: string; sourceId: string } | null> {
  return findDuplicateRecipe(title, sourceId, await allKnownRecipesForDuplicateCheckMemory());
}

/**
 * Repli mémoire de `checkImportDuplicates` (K4) — utilisé en dev local sans
 * Supabase et par les tests unitaires. La détection de préparation homonyme
 * ne porte que sur les recettes enregistrées pendant CETTE session mémoire
 * (`memorySavedRecipes`), pas sur le jeu de données de démonstration
 * (`getRecipes()` n'expose pas les préparations, seulement des recettes déjà
 * assemblées) : limite acceptée du repli mémoire, la détection réelle et
 * complète vit dans `checkImportDuplicatesSupabase` (table
 * `recipe_sections` réelle).
 * ponytail: préparations homonymes non vérifiées contre le jeu de démo en
 * mode mémoire — sans conséquence en Preview (Supabase toujours configuré).
 */
async function checkImportDuplicatesMemory(params: CheckImportDuplicatesParams): Promise<ImportDuplicateMatch[]> {
  const { title, sourceId, sectionNames = [] } = params;
  const normalizedTitle = normalizeText(title);
  const matches: ImportDuplicateMatch[] = [];

  if (normalizedTitle) {
    const demoTitles = (await getRecipes()).map((r) => ({ id: r.id, title: r.title, sourceId: r.sourceId }));
    const savedTitles = memorySavedRecipes.map(({ recipe }) => ({ id: recipe.id, title: recipe.title, sourceId: recipe.sourceId }));
    for (const candidate of [...demoTitles, ...savedTitles]) {
      if (normalizeText(candidate.title) !== normalizedTitle) continue;
      matches.push({
        kind: candidate.sourceId === sourceId ? "same_title_same_source" : "same_title_other_source",
        recipeId: candidate.id,
        recipeTitle: candidate.title,
        sourceId: candidate.sourceId,
      });
    }
  }

  const normalizedSectionNames = sectionNames.map((n) => n.trim().toLowerCase()).filter((n) => n.length > 0);
  if (normalizedSectionNames.length > 0) {
    for (const { recipe, sections } of memorySavedRecipes) {
      for (const section of sections) {
        const name = section.name?.trim().toLowerCase();
        if (name && normalizedSectionNames.includes(name)) {
          matches.push({
            kind: "homonymous_preparation",
            recipeId: recipe.id,
            recipeTitle: recipe.title,
            sourceId: recipe.sourceId,
            sectionName: section.name,
          });
        }
      }
    }
  }

  return matches;
}

async function uniqueSlugMemory(title: string): Promise<string> {
  const base = slugify(title);
  const taken = new Set([...(await getRecipes()).map((r) => r.slug), ...memorySavedRecipes.map((r) => r.recipe.slug)]);
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
async function saveImportRecipeMemory(params: SaveImportRecipeParams): Promise<SaveImportRecipeResult> {
  const { batchId, draft, rawExtraction, providerName, acknowledgeDuplicate = false } = params;

  const alreadySaved = findItemForDraftIdMemory(draft.id);
  if (alreadySaved && alreadySaved.recipeId) {
    const recipe = memorySavedRecipes.find((entry) => entry.recipe.id === alreadySaved.recipeId)!.recipe;
    return { status: "already_saved", recipe, item: alreadySaved };
  }

  const duplicate = await checkDuplicateMemory(draft.title, draft.sourceId);
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
    slug: await uniqueSlugMemory(draft.title),
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
  memorySavedRecipes.push({ recipe, sections: draft.sections });

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

/**
 * Repli Supabase de `checkImportDuplicates` (K4) : couvre les quatre cas
 * demandés — même titre + même source, même titre dans une autre source,
 * hash de fichier identique, préparation homonyme. Ne bloque ni ne fusionne
 * jamais rien automatiquement : retourne seulement des différences à
 * présenter à la personne (l'appelant décide).
 * ponytail: filtre par nom de préparation via `.or(ilike...)` — les noms
 * contenant une virgule casseraient la syntaxe de filtre PostgREST ; aucune
 * préparation démo n'en contient à ce jour, à durcir si ça devient un
 * problème réel (échapper ou passer par une fonction dédiée).
 */
async function checkImportDuplicatesSupabase(
  client: SupabaseAdminClient,
  params: CheckImportDuplicatesParams,
): Promise<ImportDuplicateMatch[]> {
  const { title, sourceId, fileHash, sectionNames = [] } = params;
  const matches: ImportDuplicateMatch[] = [];
  const trimmedTitle = title.trim();

  if (trimmedTitle) {
    const titleResult = await client.from("recipes").select("id, title, source_id").ilike("title", trimmedTitle);
    const titleRows = unwrap(titleResult, "vérification de doublon par titre");
    for (const row of titleRows) {
      matches.push({
        kind: row.source_id === sourceId ? "same_title_same_source" : "same_title_other_source",
        recipeId: row.id,
        recipeTitle: row.title,
        sourceId: row.source_id,
      });
    }
  }

  if (fileHash) {
    const hashResult = await client
      .from("import_items")
      .select("recipe_id")
      .eq("source_file_hash", fileHash)
      .not("recipe_id", "is", null);
    const hashRows = unwrap(hashResult, "vérification de doublon par hash de fichier");
    const recipeIds = [...new Set(hashRows.map((row) => row.recipe_id).filter((id): id is string => id !== null))];
    if (recipeIds.length > 0) {
      const recipesResult = await client.from("recipes").select("id, title, source_id").in("id", recipeIds);
      const recipeRows = unwrap(recipesResult, "lecture des recettes en doublon de fichier");
      for (const row of recipeRows) {
        matches.push({ kind: "same_file_hash", recipeId: row.id, recipeTitle: row.title, sourceId: row.source_id });
      }
    }
  }

  const normalizedSectionNames = sectionNames.map((name) => name.trim()).filter((name) => name.length > 0);
  if (normalizedSectionNames.length > 0) {
    const orFilter = normalizedSectionNames.map((name) => `name.ilike.${name}`).join(",");
    const sectionsResult = await client.from("recipe_sections").select("recipe_id, name").or(orFilter);
    const sectionRows = unwrap(sectionsResult, "vérification de préparations homonymes");
    if (sectionRows.length > 0) {
      const recipeIds = [...new Set(sectionRows.map((row) => row.recipe_id))];
      const recipesResult = await client.from("recipes").select("id, title, source_id").in("id", recipeIds);
      const recipeRows = unwrap(recipesResult, "lecture des recettes pour préparations homonymes");
      const recipeById = new Map(recipeRows.map((row) => [row.id, row]));
      for (const section of sectionRows) {
        const recipe = recipeById.get(section.recipe_id);
        matches.push({
          kind: "homonymous_preparation",
          recipeId: section.recipe_id,
          recipeTitle: recipe?.title ?? null,
          sourceId: recipe?.source_id ?? null,
          sectionName: section.name,
        });
      }
    }
  }

  return matches;
}

/** SHA-256 hex minuscule — même format que la contrainte SQL `import_items_source_file_hash_format`. Pure, testable sans réseau. */
export function computeSha256Hex(bytes: ArrayBuffer | Uint8Array): string {
  return createHash("sha256").update(Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))).digest("hex");
}

/**
 * Télécharge le fichier source réellement archivé (I6) et calcule son
 * empreinte — jamais sur le texte extrait, jamais un hash inventé (K4).
 * Échec de lecture explicite (jamais un hash `null` silencieux qui ferait
 * manquer un doublon réel).
 */
async function fetchAndHashSourceFile(client: SupabaseAdminClient, path: string): Promise<string> {
  const download = await client.storage.from(SOURCE_BUCKET).download(path);
  if (download.error || !download.data) {
    throw new Error(
      `Lecture du fichier source pour calcul du hash échouée (${path}) : ${download.error?.message ?? "réponse vide"}`,
    );
  }
  const buffer = await download.data.arrayBuffer();
  return computeSha256Hex(buffer);
}

/**
 * Fichier Storage potentiellement orphelin après un échec d'enregistrement
 * (K3-DATA) : jamais supprimé automatiquement ici — une nouvelle tentative
 * avec le même `draft` réutilise le même `sourceFileUrl`, une suppression
 * immédiate casserait cette reprise (« la correction reste reprenable côté
 * formulaire »). Marquage pour traitement différé : avertissement structuré
 * et explicite, jamais silencieux, à vérifier/nettoyer manuellement si le
 * fichier reste réellement orphelin (recette jamais réessayée avec succès).
 */
function logPossiblyOrphanedSourceFile(path: string, batchId: string, cause: string): void {
  console.warn(
    "[import] échec d'enregistrement après archivage d'un fichier source — fichier potentiellement orphelin, " +
      "AUCUNE suppression automatique (une nouvelle tentative peut le réutiliser), à vérifier manuellement si l'import n'aboutit jamais",
    { bucket: SOURCE_BUCKET, path, batchId, cause },
  );
}

interface SaveImportRecipeRpcRow {
  outcome: "saved" | "already_saved";
  recipe: RecipeRow;
  item: {
    id: string;
    import_batch_id: string;
    source_file_url: string | null;
    source_file_hash: string | null;
    status: string;
    raw_extraction: unknown;
    proposed_recipe: unknown;
    errors: string[];
    recipe_id: string | null;
  };
}

/**
 * `Database["public"]["Functions"]` du contrat gelé (`src/lib/supabase/types.ts`)
 * ne déclare aucune fonction RPC (`Record<string, never>`) — ce contrat reste
 * intentionnellement intact (gelé pour tout le lot K, `docs/11-TASK_BOARD.md`).
 * Un cast local minimal vers une forme `.rpc()` non typée est donc utilisé ICI
 * SEULEMENT, plutôt que d'élargir le contrat partagé pour un seul appel
 * serveur privilégié. Le comportement réel de `@supabase/supabase-js` au
 * runtime ne dépend jamais de ces génériques TypeScript.
 */
type UntypedRpcClient = {
  rpc(fn: "save_import_recipe", args: { payload: Record<string, unknown> }): Promise<{
    data: SaveImportRecipeRpcRow | null;
    error: { message: string } | null;
  }>;
};

async function callSaveImportRecipeRpc(
  client: SupabaseAdminClient,
  payload: Record<string, unknown>,
): Promise<SaveImportRecipeRpcRow> {
  const { data, error } = await (client as unknown as UntypedRpcClient).rpc("save_import_recipe", { payload });
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Réponse vide de la transaction d'enregistrement de l'import.");
  }
  return data;
}

/**
 * Enregistre une recette validée par la personne dans Supabase — écriture
 * unique via `save_import_recipe` (fonction Postgres, voir l'en-tête de ce
 * fichier), réellement atomique et idempotente par `draft.id` (vérifié à
 * l'intérieur de la fonction, pas par un aller-retour séparé).
 */
async function saveImportRecipeSupabase(
  client: SupabaseAdminClient,
  params: SaveImportRecipeParams,
): Promise<SaveImportRecipeResult> {
  const { batchId, draft, rawExtraction, providerName, acknowledgeDuplicate = false } = params;

  const duplicate = await checkDuplicateSupabase(client, draft.title, draft.sourceId);
  if (duplicate && !acknowledgeDuplicate) {
    return { status: "duplicate", duplicate };
  }

  const sourceFileUrl = sourceFileUrlFor(draft);
  const sourceFileHash = sourceFileUrl ? await fetchAndHashSourceFile(client, sourceFileUrl) : null;

  const payload: Record<string, unknown> = {
    draftId: draft.id,
    batchId,
    sourceId: draft.sourceId,
    sourceCategoryId: draft.sourceCategoryId,
    title: draft.title,
    slugBase: slugify(draft.title),
    additionalInformation: combineAdditionalInformation(draft),
    sourceFileUrl,
    sourceFileHash,
    rawExtraction,
    proposedRecipe: draft,
    sections: draft.sections.map((section) => ({
      name: section.name,
      originalText: section.originalText,
      ingredients: section.ingredients.map((ingredient, index) => ({
        originalName: ingredient.originalName,
        canonicalIngredientId: ingredient.canonicalIngredientId,
        originalQuantityText: ingredient.originalQuantityText,
        quantityDecimal: ingredient.quantityDecimal,
        unit: ingredient.unit,
        position: index,
        verificationStatus: ingredient.verificationStatus,
      })),
    })),
    allergens: draft.allergens.map((entry) => ({ allergenId: entry.allergenId, status: entry.status })),
    specificities: draft.specificities.map((entry) => ({
      specificityId: entry.specificityId,
      status: entry.status,
      reason: entry.reason,
      source: entry.source,
    })),
  };

  let rpcResult: SaveImportRecipeRpcRow;
  try {
    rpcResult = await callSaveImportRecipeRpc(client, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (sourceFileUrl) {
      logPossiblyOrphanedSourceFile(sourceFileUrl, batchId, message);
    }
    // Aucune écriture partielle à nettoyer côté base : la transaction
    // Postgres a déjà tout annulé (voir en-tête de fichier). Le message
    // reste lisible pour l'appelant (CLAUDE.md, jamais une erreur brute).
    throw new Error(`Enregistrement de la recette échoué, aucune donnée partielle conservée : ${message}`);
  }

  const recipe = mapRecipeRow(rpcResult.recipe);
  const item = mapImportItemRow(rpcResult.item);

  if (rpcResult.outcome === "already_saved") {
    return { status: "already_saved", recipe, item };
  }

  // Journalisation minimale (règle CLAUDE.md « journaliser modèle, version
  // du schéma et avertissements »).
  console.info("[import] recette enregistrée (Supabase, transaction atomique)", {
    model: providerName,
    schemaVersion: IMPORT_SCHEMA_VERSION,
    warnings: draft.warnings,
    recipeId: recipe.id,
  });

  return { status: "saved", recipe, item };
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

/**
 * Rapport complet des doublons potentiels (K4) : même titre + même source
 * (déjà couvert par `checkDuplicate`, repris ici), même titre dans une autre
 * source, hash de fichier identique, préparation homonyme. Jamais bloquant,
 * jamais de fusion automatique — une liste de différences à présenter à la
 * personne avant enregistrement. Fonction disponible pour l'écran de
 * vérification complet (K3-IMPORT/K3-UI) ; `saveImportRecipe` continue de
 * n'utiliser que le cas même titre + même source (comportement inchangé).
 */
export async function checkImportDuplicates(params: CheckImportDuplicatesParams): Promise<ImportDuplicateMatch[]> {
  if (!hasSupabaseConfig()) return checkImportDuplicatesMemory(params);
  return checkImportDuplicatesSupabase(createSupabaseAdminClient(), params);
}

export async function getSavedRecipes(): Promise<Recipe[]> {
  if (!hasSupabaseConfig()) return getSavedRecipesMemory();
  return getSavedRecipesSupabase(createSupabaseAdminClient());
}
