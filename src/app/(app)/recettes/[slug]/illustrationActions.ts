"use server";

/**
 * Action serveur unique de la fiche recette pour créer/réessayer son
 * illustration (F-IA3) — appelée directement depuis `RecipeIllustrationButton`
 * (Client Component), même patron que `src/app/(app)/visuels/actions.ts`.
 * Ne fait que déléguer à `generateMissingRecipeIllustration`, qui gère elle-
 * même la revalidation des pages affichant des cartes recette (seul endroit
 * qui le fait, voir sa documentation).
 */

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

  return { ok: true, message: null };
}
