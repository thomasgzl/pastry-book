"use server";

/**
 * Frontière Server Action de la modification manuelle d'une recette déjà
 * enregistrée — même patron que `src/app/(app)/importer/importActions.ts`
 * (seul point d'entrée appelé par un Client Component pour toute
 * écriture Supabase). Les référentiels (entreprises, catégories, matières
 * premières canoniques, spécificités) et la création de catégorie locale
 * réutilisent directement les Server Actions déjà existantes de l'import —
 * même logique, pas de second chemin de lecture/écriture à maintenir.
 */

import { revalidatePath } from "next/cache";
import { createCategoryAction, getCategoriesAction } from "@/app/(app)/importer/importActions";
import { getCategoriesForSource } from "@/lib/data/categories";
import { getSources } from "@/lib/data/sources";
import type { SourceCategory, Recipe } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import { deleteRecipe, updateRecipe } from "@/lib/import/store";

export async function getEditCategoriesAction(sourceId: string): Promise<SourceCategory[]> {
  return getCategoriesAction(sourceId);
}

export async function createEditCategoryAction(sourceId: string, name: string): Promise<SourceCategory> {
  return createCategoryAction(sourceId, name);
}

/**
 * Enregistre la modification (dernier clic explicite) et revalide toutes
 * les pages où cette recette peut apparaître — même liste que
 * `triggerRecipeIllustration`/`generateMissingRecipeIllustration`
 * (`src/lib/ai/visuals/recipe-illustration.ts`) : titre, catégorie,
 * ingrédients et spécificités peuvent changer ce qu'affichent les listes de
 * recettes, d'entreprises, de matières premières et de spécificités. Le
 * slug ne change jamais (voir `update_recipe`), la fiche reste donc à la
 * même URL après l'enregistrement.
 */
export async function updateRecipeAction(params: { recipeId: string; slug: string; draft: ImportRecipeDraft }): Promise<Recipe> {
  const recipe = await updateRecipe({ recipeId: params.recipeId, draft: params.draft });
  revalidatePath(`/recettes/${params.slug}`);
  revalidatePath("/recettes");
  revalidatePath("/specificites");
  revalidatePath("/entreprises");
  revalidatePath("/matieres-premieres");
  return recipe;
}

/**
 * Supprime définitivement une recette (dernier clic explicite, après
 * confirmation côté formulaire — jamais automatique). Résout la destination
 * de redirection (catégorie de l'entreprise si elle existe, sinon
 * `/recettes`) à partir de l'entreprise/catégorie AUXQUELLES LA RECETTE
 * APPARTENAIT réellement en base (retournées par `deleteRecipe`), jamais
 * depuis un brouillon de formulaire potentiellement modifié sans avoir été
 * enregistré. Revalide toutes les pages où la recette supprimée pouvait
 * apparaître — même liste que `updateRecipeAction`, plus la page
 * d'entreprise et, si elle existe, la page de catégorie concernées.
 */
export async function deleteRecipeAction(params: { recipeId: string; slug: string }): Promise<{ redirectTo: string }> {
  const { sourceId, sourceCategoryId } = await deleteRecipe(params.recipeId);

  const [sources, categories] = await Promise.all([
    getSources(),
    sourceCategoryId ? getCategoriesForSource(sourceId) : Promise.resolve<SourceCategory[]>([]),
  ]);
  const source = sources.find((candidate) => candidate.id === sourceId);
  const category = sourceCategoryId ? categories.find((candidate) => candidate.id === sourceCategoryId) : undefined;
  const redirectTo = source && category ? `/entreprises/${source.slug}/${category.slug}` : "/recettes";

  revalidatePath(`/recettes/${params.slug}`);
  revalidatePath("/recettes");
  revalidatePath("/specificites");
  revalidatePath("/entreprises");
  revalidatePath("/matieres-premieres");
  if (source) {
    revalidatePath(`/entreprises/${source.slug}`);
    if (category) revalidatePath(`/entreprises/${source.slug}/${category.slug}`);
  }

  return { redirectTo };
}
