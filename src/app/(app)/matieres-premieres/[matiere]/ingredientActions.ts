"use server";

/**
 * Suppression d'une matière première canonique (page publique, pas de page
 * « modifier » dédiée pour les ingrédients — même contrainte que
 * `recettes/[slug]/modifier/editActions.ts`, seul point d'entrée appelable
 * depuis le navigateur pour cette écriture). `deleteCanonicalIngredient`
 * (`store.ts`) refuse déjà si la matière est utilisée quelque part — cette
 * action ne fait que relayer son message d'erreur, jamais une seconde
 * vérification dupliquée ici.
 */

import { revalidatePath } from "next/cache";
import { deleteCanonicalIngredient } from "@/lib/import/store";

export async function deleteCanonicalIngredientAction(params: { id: string }): Promise<{ redirectTo: string }> {
  await deleteCanonicalIngredient(params.id);

  revalidatePath("/matieres-premieres");
  revalidatePath("/illustrations");
  revalidatePath("/illustrations/manquantes");

  return { redirectTo: "/matieres-premieres" };
}
