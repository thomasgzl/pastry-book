"use server";

/**
 * Action serveur « Générer une nouvelle version » (K11) — un sujet DÉJÀ
 * illustré (brouillon et/ou principal existant), donc structurellement
 * absent de la file des manquants (`getMissingVisualSubjects`, K8 : un sujet
 * avec un visuel `approved`/`isPrimary` en sort). Réutilise le même
 * mécanisme de confirmation que K9 (`runMissingQueueAction`,
 * `MissingQueueBrowser`) — même phrase nommée (`QUEUE_CONFIRMATION_PREFIX`),
 * même garde de coût (`aiCostGuard.ts`), même appel de génération
 * (`generateVisualDraft`) — plutôt que de le reconstruire : un lot de taille
 * 1 pour un sujet précis, sans passer par la liste des manquants qui ne le
 * contient pas.
 *
 * Ne modifie jamais un visuel existant : `generateVisualDraft` crée toujours
 * une nouvelle ligne `draft` à côté (storage.ts, invariant E1), jamais
 * approuvée ni principale automatiquement.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { visualAssetSchema } from "@/lib/domain/schemas";
import { beginAiRequest, completeAiRequest } from "@/lib/domain/aiCostGuard";
import { generateVisualDraft } from "@/lib/ai/visuals/service";
import { getVisualSubject } from "@/lib/visuals/subjects";
import { QUEUE_CONFIRMATION_PREFIX } from "@/lib/visuals/queueConstants";
import type { RecipeVisualMode } from "@/lib/visuals/preset";

const targetSchema = z.object({
  subjectType: visualAssetSchema.shape.subjectType,
  subjectId: z.uuid(),
});

function recipeModeFor(photoUrl: string | null | undefined): RecipeVisualMode {
  return photoUrl ? "photo" : "description";
}

function revalidateAll(): void {
  revalidatePath("/illustrations");
  revalidatePath("/illustrations/manquantes");
  revalidatePath("/visuels");
}

export interface RegenerateVersionState {
  error: string | null;
  success: boolean;
}

export const INITIAL_REGENERATE_STATE: RegenerateVersionState = { error: null, success: false };

export async function regenerateVersionAction(
  _previous: RegenerateVersionState,
  formData: FormData,
): Promise<RegenerateVersionState> {
  const parsed = targetSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Sujet invalide.", success: false };

  const subject = await getVisualSubject(parsed.data.subjectType, parsed.data.subjectId);
  if (!subject) return { error: "Sujet introuvable.", success: false };

  const expected = `${QUEUE_CONFIRMATION_PREFIX} 1`;
  const typed = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (typed !== expected) {
    return { error: `Confirmation invalide. Tapez exactement « ${expected} » pour générer une nouvelle version.`, success: false };
  }

  // Idempotence de la soumission (double-clic) — même patron que `runMissingQueueAction`.
  const requestId = `illustrations-regenerate:${subject.type}:${subject.id}`;
  const guard = beginAiRequest(requestId, "illustration-brouillon", { minDelayMs: 0 });
  if (!guard.ok) {
    return { error: "Une nouvelle version est déjà en cours de génération pour ce sujet.", success: false };
  }

  try {
    await generateVisualDraft({
      subjectType: subject.type,
      subjectId: subject.id,
      subjectLabel: subject.label,
      sourcePhotoUrl: subject.photoUrl,
      categorySlug: subject.categorySlug,
      recipeMode: subject.type === "recipe" ? recipeModeFor(subject.photoUrl) : undefined,
      preparationNames: subject.preparationNames,
      validatedKeyIngredientNames: subject.validatedKeyIngredientNames,
      additionalInformation: subject.additionalInformation,
    });
    revalidateAll();
    return { error: null, success: true };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Échec de génération.", success: false };
  } finally {
    completeAiRequest(requestId);
  }
}
