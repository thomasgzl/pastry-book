"use server";

/**
 * Suppression d'une matière première canonique (page publique, pas de page
 * « modifier » dédiée pour les ingrédients — même contrainte que
 * `recettes/[slug]/modifier/editActions.ts`, seul point d'entrée appelable
 * depuis le navigateur pour cette écriture). `deleteCanonicalIngredient`
 * (`store.ts`) refuse déjà si la matière est utilisée quelque part — cette
 * action ne fait que relayer son message d'erreur, jamais une seconde
 * vérification dupliquée ici.
 *
 * Renvoie l'erreur au lieu de la laisser remonter (throw) : Next.js masque
 * le message des erreurs qui traversent la frontière d'une Server Action en
 * production (React error #441, « message omis en production »), l'appelant
 * ne verrait donc jamais la vraie raison du refus (matière utilisée, etc.).
 *
 * `force` : ne lève l'interdit que si la matière est réellement utilisée
 * dans une recette (`delete_canonical_ingredient` refuse alors quoi qu'il
 * arrive — jamais de perte de tag silencieuse sur une recette, CLAUDE.md).
 * Si le seul blocage venait d'un alias ou d'une sous-matière, `force`
 * supprime l'alias et détache la sous-matière avant de supprimer.
 */

import { revalidatePath } from "next/cache";
import { deleteCanonicalIngredient } from "@/lib/import/store";

export async function deleteCanonicalIngredientAction(
  params: { id: string; force?: boolean },
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  try {
    await deleteCanonicalIngredient(params.id, params.force ?? false);
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : "La suppression a échoué. Réessayez." };
  }

  revalidatePath("/matieres-premieres");
  revalidatePath("/illustrations");
  revalidatePath("/illustrations/manquantes");

  return { ok: true, redirectTo: "/matieres-premieres" };
}
