"use server";

/**
 * Action serveur unique de la fiche recette pour créer/réessayer son
 * illustration (F-IA3) — appelée directement depuis `RecipeIllustrationButton`
 * (Client Component), même patron que `src/app/(app)/visuels/actions.ts`.
 * Ne fait que déléguer à `generateMissingRecipeIllustration` (logique
 * partagée avec le déclenchement automatique après import) puis revalider les
 * pages qui affichent cette recette.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { generateMissingRecipeIllustration } from "@/lib/ai/visuals/recipe-illustration";

const inputSchema = z.object({ recipeId: z.uuid(), slug: z.string().min(1) });

export interface GenerateRecipeIllustrationResult {
  ok: boolean;
  message: string | null;
}

export async function generateRecipeIllustrationAction(
  recipeId: string,
  slug: string,
): Promise<GenerateRecipeIllustrationResult> {
  const parsed = inputSchema.safeParse({ recipeId, slug });
  if (!parsed.success) return { ok: false, message: "Requête invalide." };

  const result = await generateMissingRecipeIllustration(parsed.data.recipeId);
  if (!result.ok) return { ok: false, message: result.error.message };

  revalidatePath(`/recettes/${parsed.data.slug}`);
  revalidatePath("/recettes");
  return { ok: true, message: null };
}
