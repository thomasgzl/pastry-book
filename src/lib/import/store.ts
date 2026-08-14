/**
 * Stockage de démonstration de l'import (D1) — état en mémoire, propre à
 * l'onglet navigateur courant (uniquement consommé par des composants
 * `"use client"`). Aucun `next dev`/Docker Supabase n'étant câblé pour les
 * écritures nulle part dans l'application (voir `src/lib/data/*`, toutes en
 * lecture seule sur `src/lib/demo/data.ts`), ce module joue le rôle de
 * `import_batches`/`import_items` + recettes enregistrées le temps de la
 * session, avec les mêmes formes que les contrats gelés
 * (`src/lib/domain/schemas.ts`). À remplacer par de vraies écritures
 * Supabase quand ce câblage existera (hors périmètre D1-D3).
 *
 * `sourceFileUrl` reste `null` tant qu'aucun fichier n'a été réellement
 * enregistré (persistance pas encore câblée) — cas normal pour la saisie
 * manuelle sans fichier. `sourceFileName` porte le nom du fichier local
 * choisi par la personne, le cas échéant (voir `src/lib/domain/schemas.ts`).
 */

import { getCategoriesForSource } from "@/lib/data/categories";
import { getRecipes } from "@/lib/data/recipes";
import type {
  ImportBatch,
  ImportItem,
  Recipe,
  RecipeIngredient,
  RecipeSection,
  SourceCategory,
} from "@/lib/domain/schemas";
import { combineAdditionalInformation, IMPORT_SCHEMA_VERSION, type ImportRecipeDraft } from "@/lib/import/schema";
import { findDuplicateRecipe, slugify } from "@/lib/import/model";

const CREATED_AT = () => new Date().toISOString();

let batches: ImportBatch[] = [];
let items: ImportItem[] = [];
let savedRecipes: { recipe: Recipe; sections: RecipeSection[]; ingredients: RecipeIngredient[] }[] = [];
let sessionCategories: SourceCategory[] = [];

/** Réinitialise tout l'état en mémoire — réservé aux tests. */
export function resetImportStoreForTests(): void {
  batches = [];
  items = [];
  savedRecipes = [];
  sessionCategories = [];
}

export function createImportBatch(): ImportBatch {
  const batch: ImportBatch = { id: crypto.randomUUID(), status: "pending", createdAt: CREATED_AT() };
  batches.push(batch);
  return batch;
}

/** Catégories locales à une source : celles déjà connues + celles créées pendant cette session d'import. Jamais partagées entre entreprises (CLAUDE.md, principe 6). */
export function getCategoriesForSourceIncludingSession(sourceId: string): SourceCategory[] {
  return [...getCategoriesForSource(sourceId), ...sessionCategories.filter((c) => c.sourceId === sourceId)];
}

/** Crée une catégorie locale, ou retourne celle qui existe déjà pour ce nom (comparaison insensible casse) — jamais un doublon silencieux. */
export function createLocalCategory(sourceId: string, name: string): SourceCategory {
  const trimmed = name.trim();
  const existing = getCategoriesForSourceIncludingSession(sourceId).find(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (existing) return existing;

  const category: SourceCategory = {
    id: crypto.randomUUID(),
    sourceId,
    name: trimmed,
    slug: slugify(trimmed),
    position: getCategoriesForSourceIncludingSession(sourceId).length,
  };
  sessionCategories.push(category);
  return category;
}

function allKnownRecipesForDuplicateCheck(): { title: string; sourceId: string }[] {
  return [
    ...getRecipes().map((recipe) => ({ title: recipe.title, sourceId: recipe.sourceId })),
    ...savedRecipes.map(({ recipe }) => ({ title: recipe.title, sourceId: recipe.sourceId })),
  ];
}

/** Signale un doublon probable (même titre normalisé + même source) sans jamais bloquer silencieusement — l'appelant décide d'exiger une confirmation explicite. */
export function checkDuplicate(title: string, sourceId: string): { title: string; sourceId: string } | null {
  return findDuplicateRecipe(title, sourceId, allKnownRecipesForDuplicateCheck());
}

function uniqueSlug(title: string): string {
  const base = slugify(title);
  const taken = new Set([...getRecipes().map((r) => r.slug), ...savedRecipes.map((r) => r.recipe.slug)]);
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/** Nom du fichier local choisi, le cas échéant — aucun fichier n'étant réellement stocké, jamais une URL. */
function sourceFileNameFor(draft: ImportRecipeDraft): string | null {
  return draft.originalFiles[0]?.name ?? null;
}

function findItemForDraftId(draftId: string): ImportItem | undefined {
  return items.find(
    (item) =>
      item.status === "done" &&
      typeof item.proposedRecipe === "object" &&
      item.proposedRecipe !== null &&
      (item.proposedRecipe as { id?: unknown }).id === draftId,
  );
}

export type SaveImportRecipeResult =
  | { status: "duplicate"; duplicate: { title: string; sourceId: string } }
  | { status: "already_saved"; recipe: Recipe; item: ImportItem }
  | { status: "saved"; recipe: Recipe; item: ImportItem };

/**
 * Enregistre une recette validée par la personne (dernier clic explicite,
 * jamais automatique — CLAUDE.md). Idempotent : ré-invoquer avec le même
 * `draft.id` (ex. double clic, nouvelle tentative après coupure réseau) ne
 * crée jamais une seconde recette, retourne celle déjà enregistrée.
 */
export function saveImportRecipe(params: {
  batchId: string;
  draft: ImportRecipeDraft;
  rawExtraction: unknown;
  providerName: string;
  acknowledgeDuplicate?: boolean;
}): SaveImportRecipeResult {
  const { batchId, draft, rawExtraction, providerName, acknowledgeDuplicate = false } = params;

  const alreadySaved = findItemForDraftId(draft.id);
  if (alreadySaved && alreadySaved.recipeId) {
    const recipe = savedRecipes.find((entry) => entry.recipe.id === alreadySaved.recipeId)!.recipe;
    return { status: "already_saved", recipe, item: alreadySaved };
  }

  const duplicate = checkDuplicate(draft.title, draft.sourceId);
  if (duplicate && !acknowledgeDuplicate) {
    return { status: "duplicate", duplicate };
  }

  const now = CREATED_AT();
  const recipeId = crypto.randomUUID();
  const sections: RecipeSection[] = draft.sections.map((section, index) => ({
    id: crypto.randomUUID(),
    recipeId,
    name: section.name,
    position: index,
    originalText: section.originalText,
  }));
  const ingredients: RecipeIngredient[] = draft.sections.flatMap((section, sectionIndex) =>
    section.ingredients.map((ingredient, ingredientIndex) => ({
      id: crypto.randomUUID(),
      recipeSectionId: sections[sectionIndex].id,
      originalName: ingredient.originalName,
      canonicalIngredientId: ingredient.canonicalIngredientId,
      originalQuantityText: ingredient.originalQuantityText,
      quantityDecimal: ingredient.quantityDecimal,
      unit: ingredient.unit,
      position: ingredientIndex,
      verificationStatus: ingredient.verificationStatus,
      confidence: null,
    })),
  );

  const recipe: Recipe = {
    id: recipeId,
    sourceId: draft.sourceId,
    sourceCategoryId: draft.sourceCategoryId,
    title: draft.title,
    slug: uniqueSlug(draft.title),
    additionalInformation: combineAdditionalInformation(draft),
    originalDocumentUrl: null,
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
  savedRecipes.push({ recipe, sections, ingredients });

  const item: ImportItem = {
    id: crypto.randomUUID(),
    importBatchId: batchId,
    sourceFileUrl: null,
    sourceFileName: sourceFileNameFor(draft),
    status: "done",
    rawExtraction,
    proposedRecipe: draft,
    errors: [],
    recipeId,
  };
  items.push(item);

  const batch = batches.find((b) => b.id === batchId);
  if (batch) batch.status = "done";

  // Journalisation minimale (règle CLAUDE.md « journaliser modèle, version
  // du schéma et avertissements ») — pas d'infra de logs dédiée dans cette
  // application en mode démonstration, console structurée suffit ici.
  console.info("[import] recette enregistrée", {
    model: providerName,
    schemaVersion: IMPORT_SCHEMA_VERSION,
    warnings: draft.warnings,
    recipeId,
  });

  return { status: "saved", recipe, item };
}

export function getSavedRecipes(): Recipe[] {
  return savedRecipes.map(({ recipe }) => recipe);
}
