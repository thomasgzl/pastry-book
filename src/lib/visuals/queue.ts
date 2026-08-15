/**
 * File des illustrations manquantes + moteur de lot (tâche K8). Fichier
 * SERVEUR uniquement (importe `storage.ts`/`subjects.ts`, chaîne Supabase
 * `next/headers`) — jamais depuis un Client Component (voir `queueConstants.ts`
 * pour les constantes/types partagés des deux côtés).
 *
 * Deux responsabilités distinctes :
 * 1. `getMissingVisualSubjects` : calcule DYNAMIQUEMENT les sujets sans
 *    visuel principal approuvé (croise `getAllVisualSubjects()`, K6, avec
 *    `getPrimaryVisualAsset`, storage.ts — jamais un simple `status ===
 *    "approved"` : un visuel approuvé non principal ne compte pas comme
 *    « publié », le sujet reste dans la file).
 * 2. `runVisualGenerationQueue` : moteur séquentiel générique, réutilisé par
 *    l'action serveur de `/illustrations/manquantes`. Même patron que
 *    l'ancien pilote lot H (`src/app/(app)/visuels/pilote-lot-h/actions.ts`,
 *    supprimé en K2 mais dont la logique est reprise ici, généralisée) : un
 *    appel par sujet, arrêt immédiat au premier échec, aucune relance
 *    automatique, sujet déjà pourvu jamais rejoué (revérifié juste avant
 *    chaque appel). Le générateur (`generate`) est injecté : ce lot ne
 *    déclenche donc lui-même AUCUN appel OpenAI réel — brancher
 *    `generateRealVisualDraft` (déjà écrit, F-IA2) derrière l'écran de
 *    confirmation de coût revient à K9.
 */

import type { Result } from "@/lib/domain/errors";
import { getPrimaryVisualAsset } from "./storage";
import { getAllVisualSubjects, type VisualSubject } from "./subjects";
import { MAX_QUEUE_BATCH_SIZE, QueueBatchSizeError, type QueueLogEntry, type QueueOutcome, type QueueTarget } from "./queueConstants";

export {
  QUEUE_BATCH_SIZE_OPTIONS,
  QUEUE_CONFIRMATION_PREFIX,
  MAX_QUEUE_BATCH_SIZE,
  QueueBatchSizeError,
} from "./queueConstants";
export type {
  QueueBatchSize,
  QueueTarget,
  QueueOutcome,
  QueueOutcomeStatus,
  QueueLogEntry,
} from "./queueConstants";

/**
 * Sujets sans visuel PRINCIPAL approuvé. Un sujet avec un visuel `approved`
 * qui n'est pas `isPrimary` (deuxième version approuvée jamais mise en
 * avant) reste dans cette liste : seul `isPrimary` vaut « publié ».
 */
export async function getMissingVisualSubjects(): Promise<VisualSubject[]> {
  const subjects = await getAllVisualSubjects();
  const primaries = await Promise.all(
    subjects.map((subject) => getPrimaryVisualAsset(subject.type, subject.id)),
  );
  return subjects.filter((_, index) => !primaries[index]);
}

export interface RunVisualGenerationQueueOptions {
  /** Idempotence : revérifiée juste avant CHAQUE appel (pas seulement au chargement de la page) — défense contre un état obsolu. */
  isAlreadyDone: (target: QueueTarget) => Promise<boolean>;
  /** Un appel par sujet ; jamais rappelé automatiquement après un échec (aucun retry ici, ni chez l'appelant). */
  generate: (target: QueueTarget) => Promise<Result<unknown>>;
  /** Journal optionnel, sans contenu sensible. */
  onEntry?: (entry: QueueLogEntry) => void;
}

/**
 * Moteur de file séquentiel. Un sujet par appel, dans l'ordre fourni, arrêt
 * immédiat au premier échec (les sujets restants deviennent
 * `not_attempted`), aucune relance automatique, sujets déjà pourvus
 * `skipped` sans appel. Refuse tout lot supérieur à `MAX_QUEUE_BATCH_SIZE`
 * (défense en profondeur : la limite doit déjà être appliquée en amont par
 * l'appelant/l'UI, jamais contournable ici).
 */
export async function runVisualGenerationQueue(
  targets: QueueTarget[],
  options: RunVisualGenerationQueueOptions,
): Promise<QueueOutcome[]> {
  if (targets.length > MAX_QUEUE_BATCH_SIZE) {
    throw new QueueBatchSizeError(
      `Lot trop grand (${targets.length} sujets) : maximum ${MAX_QUEUE_BATCH_SIZE} par lot confirmé.`,
    );
  }

  const outcomes: QueueOutcome[] = [];
  let stopped = false;

  for (const target of targets) {
    if (stopped) {
      outcomes.push({ type: target.type, id: target.id, status: "not_attempted" });
      continue;
    }

    const alreadyDone = await options.isAlreadyDone(target);
    if (alreadyDone) {
      const message = "Visuel principal déjà approuvé pour ce sujet — aucun doublon généré.";
      outcomes.push({ type: target.type, id: target.id, status: "skipped", message });
      options.onEntry?.({ type: target.type, id: target.id, status: "skipped", at: new Date().toISOString() });
      continue;
    }

    const result = await options.generate(target);
    if (result.ok) {
      outcomes.push({ type: target.type, id: target.id, status: "ok" });
      options.onEntry?.({ type: target.type, id: target.id, status: "ok", at: new Date().toISOString() });
    } else {
      outcomes.push({ type: target.type, id: target.id, status: "error", message: result.error.message });
      options.onEntry?.({ type: target.type, id: target.id, status: "error", at: new Date().toISOString() });
      stopped = true; // arrêt au premier échec, aucun retry, rien après n'est tenté
    }
  }

  return outcomes;
}
