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
import type { SourceCategory, Recipe } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import { updateRecipe } from "@/lib/import/store";

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
