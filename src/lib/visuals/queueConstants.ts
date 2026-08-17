import type { VisualSubjectKind } from "./preset";

/**
 * Constantes/types de la file des illustrations manquantes (K8), séparés de
 * `queue.ts` volontairement : `queue.ts` importe `storage.ts`/`subjects.ts`
 * (chaîne serveur uniquement, `next/headers` via Supabase) et ne doit donc
 * jamais être importé depuis un Client Component — même raison que la
 * séparation `kindLabels.ts`/`subjects.ts` (K5). Ces constantes, elles, sont
 * de la donnée pure et doivent rester utilisables des deux côtés (ex.
 * `MissingQueueBrowser.tsx`).
 */

/** Tailles de lot autorisées (K8) — jamais plus, jamais un bouton qui lance silencieusement des centaines d'appels. */
export const QUEUE_BATCH_SIZE_OPTIONS = [5, 10] as const;
export type QueueBatchSize = (typeof QUEUE_BATCH_SIZE_OPTIONS)[number];
export const MAX_QUEUE_BATCH_SIZE: QueueBatchSize = 10;

/** Phrase de confirmation nommée exigée avant tout lot (même patron que `BATCH_CONFIRMATION_PREFIX`, E3/E4) — jamais un lot silencieux, quel que soit le nombre de sujets sélectionnés. */
export const QUEUE_CONFIRMATION_PREFIX = "GENERER LOT";

export interface QueueTarget {
  type: VisualSubjectKind;
  id: string;
  label: string;
}

export type QueueOutcomeStatus = "ok" | "skipped" | "error" | "not_attempted";

export interface QueueOutcome {
  type: VisualSubjectKind;
  id: string;
  status: QueueOutcomeStatus;
  /** Présent uniquement pour `status: "skipped" | "error"` — jamais de contenu sensible (prompt, texte source). */
  message?: string;
}

/** Journal structuré (jamais de contenu sensible : type + id + statut + horodatage uniquement). */
export interface QueueLogEntry {
  type: VisualSubjectKind;
  id: string;
  status: QueueOutcomeStatus;
  at: string;
}

export class QueueBatchSizeError extends Error {}
