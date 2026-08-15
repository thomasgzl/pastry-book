"use server";

/**
 * Actions serveur de la file des illustrations manquantes (K8). Seul point
 * d'entrée appelable depuis le navigateur pour cette page. Exécution
 * DÉMONSTRATION uniquement dans ce lot (`generateVisualDraft`, gratuit,
 * aucun réseau, aucune clé) — le moteur de file (`runVisualGenerationQueue`,
 * `src/lib/visuals/queue.ts`) est générique : brancher `generateRealVisualDraft`
 * (F-IA2) derrière un écran de confirmation de coût revient à K9, sans
 * réécrire ce fichier ni le moteur lui-même.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { visualAssetSchema } from "@/lib/domain/schemas";
import { beginAiRequest, completeAiRequest } from "@/lib/domain/aiCostGuard";
import { generateVisualDraft } from "@/lib/ai/visuals/service";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { getVisualSubject } from "@/lib/visuals/subjects";
import type { RecipeVisualMode } from "@/lib/visuals/preset";
import {
  MAX_QUEUE_BATCH_SIZE,
  QUEUE_CONFIRMATION_PREFIX,
  getMissingVisualSubjects,
  runVisualGenerationQueue,
  type QueueOutcome,
} from "@/lib/visuals/queue";

const subjectTypeSchema = visualAssetSchema.shape.subjectType;
const targetSchema = z.object({ type: subjectTypeSchema, id: z.uuid() });

function recipeModeFor(photoUrl: string | null | undefined): RecipeVisualMode {
  return photoUrl ? "photo" : "description";
}

function revalidateAll(): void {
  revalidatePath("/illustrations");
  revalidatePath("/illustrations/manquantes");
  revalidatePath("/visuels");
}

/** Génération d'un seul sujet, immédiate, sans phrase de confirmation (même patron que `generateAction` de `/visuels`). */
export async function generateSingleMissingAction(formData: FormData): Promise<void> {
  const parsed = targetSchema.safeParse({ type: formData.get("type"), id: formData.get("id") });
  if (!parsed.success) return;

  // Revérifié juste avant l'appel (idempotence) : un sujet déjà pourvu entre-temps n'est jamais régénéré ici.
  if (await getPrimaryVisualAsset(parsed.data.type, parsed.data.id)) return;

  const subject = await getVisualSubject(parsed.data.type, parsed.data.id);
  if (!subject) return;

  await generateVisualDraft({
    subjectType: subject.type,
    subjectId: subject.id,
    subjectLabel: subject.label,
    sourcePhotoUrl: subject.photoUrl,
    categorySlug: subject.categorySlug,
    recipeMode: subject.type === "recipe" ? recipeModeFor(subject.photoUrl) : undefined,
  });
  revalidateAll();
}

export interface QueueActionState {
  error: string | null;
  outcomes: QueueOutcome[] | null;
}

function parseTargets(formData: FormData): z.infer<typeof targetSchema>[] {
  return formData
    .getAll("target")
    .map((raw) => String(raw).split(":"))
    .filter((parts): parts is [string, string] => parts.length === 2)
    .map(([type, id]) => targetSchema.safeParse({ type, id }))
    .filter((result) => result.success)
    .map((result) => result.data);
}

/**
 * Génère un lot capé (≤ `MAX_QUEUE_BATCH_SIZE`) après phrase de confirmation
 * nommée — jamais un lot silencieux, quel que soit le nombre choisi (E3/E4).
 * Chaque sujet est revérifié « toujours manquant » côté serveur juste avant
 * exécution (idempotence, défense contre une sélection client obsolète).
 */
export async function runMissingQueueAction(
  _previous: QueueActionState,
  formData: FormData,
): Promise<QueueActionState> {
  const parsedTargets = parseTargets(formData);
  if (parsedTargets.length === 0) {
    return { error: "Aucun sujet sélectionné.", outcomes: null };
  }
  if (parsedTargets.length > MAX_QUEUE_BATCH_SIZE) {
    return {
      error: `Lot trop grand (${parsedTargets.length} sujets) : maximum ${MAX_QUEUE_BATCH_SIZE} par lot confirmé.`,
      outcomes: null,
    };
  }

  const expected = `${QUEUE_CONFIRMATION_PREFIX} ${parsedTargets.length}`;
  const typed = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (typed !== expected) {
    return {
      error: `Confirmation invalide. Tapez exactement « ${expected} » pour lancer la génération de ${parsedTargets.length} visuel(s).`,
      outcomes: null,
    };
  }

  // Défense contre une sélection obsolète : seuls les sujets toujours manquants sont retenus.
  const stillMissing = await getMissingVisualSubjects();
  const stillMissingByKey = new Map(stillMissing.map((subject) => [`${subject.type}:${subject.id}`, subject]));
  const targets = parsedTargets
    .map((target) => stillMissingByKey.get(`${target.type}:${target.id}`))
    .filter((subject): subject is NonNullable<typeof subject> => Boolean(subject));

  if (targets.length === 0) {
    return { error: null, outcomes: [] };
  }

  // Idempotence de la SOUMISSION elle-même (double-clic/double envoi de formulaire) — jamais de contenu dans l'identifiant.
  const requestId = `illustrations-queue:${targets.map((t) => `${t.type}:${t.id}`).sort().join(",")}`;
  const guard = beginAiRequest(requestId, "illustration-brouillon", { minDelayMs: 0 });
  if (!guard.ok) {
    return { error: "Cette même sélection est déjà en cours de traitement.", outcomes: null };
  }

  try {
    const outcomes = await runVisualGenerationQueue(
      targets.map((subject) => ({ type: subject.type, id: subject.id, label: subject.label })),
      {
        isAlreadyDone: async (target) => Boolean(await getPrimaryVisualAsset(target.type, target.id)),
        generate: async (target) => {
          const subject = stillMissingByKey.get(`${target.type}:${target.id}`);
          if (!subject) return { ok: false, error: { code: "not_found", message: "Sujet introuvable." } };
          try {
            await generateVisualDraft({
              subjectType: subject.type,
              subjectId: subject.id,
              subjectLabel: subject.label,
              sourcePhotoUrl: subject.photoUrl,
              categorySlug: subject.categorySlug,
              recipeMode: subject.type === "recipe" ? recipeModeFor(subject.photoUrl) : undefined,
            });
            return { ok: true, data: undefined };
          } catch (cause) {
            return {
              ok: false,
              error: { code: "unknown", message: cause instanceof Error ? cause.message : "Échec de génération.", cause },
            };
          }
        },
        // Journal serveur sans contenu sensible : type + id + statut uniquement (jamais le prompt ni le libellé).
        onEntry: (entry) => {
          console.info(`[visuals:queue] ${entry.type}:${entry.id} -> ${entry.status}`);
        },
      },
    );

    revalidateAll();
    return { error: null, outcomes };
  } finally {
    completeAiRequest(requestId);
  }
}
