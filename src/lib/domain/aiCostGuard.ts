/**
 * Garde de coût IA partagée (tâche F-IA4), consommée par les deux
 * adaptateurs OpenAI réels (import et visuels) pour éviter les appels
 * payants dupliqués ou trop rapprochés.
 *
 * Garde-fou pilote : état en mémoire du process Node uniquement, se
 * réinitialise à chaque redémarrage. Ce n'est PAS une solution de
 * production distribuée (pas de Redis, pas de base de données) — à
 * remplacer par un store partagé si l'app tourne un jour sur plusieurs
 * instances.
 *
 * Ne relance JAMAIS automatiquement un appel après une erreur : c'est à
 * l'appelant (l'adaptateur) de ne jamais boucler sur un échec. Ce module se
 * contente de refuser les demandes dupliquées ou trop rapprochées.
 *
 * Ne stocke jamais de contenu (pas de texte de recette, pas de prompt) :
 * uniquement type d'opération, horodatage et identifiant tronqué.
 */

import { type Result, ok, err } from "./errors";

export type AiOperationType =
  | "extraction"
  | "illustration-brouillon"
  | "illustration-finale";

type CallLogEntry = {
  type: AiOperationType;
  at: number;
  requestId: string;
};

const DEFAULT_IDEMPOTENCY_TTL_MS = 5 * 60_000; // 5 minutes

const pendingStartedAt = new Map<string, number>();
const lastCallAtByType = new Map<AiOperationType, number>();
const callLog: CallLogEntry[] = [];

export type GuardOptions = {
  /** Délai minimal obligatoire entre deux demandes du même type (ms). */
  minDelayMs: number;
  /** Durée après laquelle une demande en cours expire (ms). */
  idempotencyTtlMs?: number;
};

/**
 * À appeler avant de lancer un appel IA payant. Refuse (Result d'erreur) si
 * le même requestId est déjà en cours (idempotence) ou si le délai minimal
 * depuis le dernier appel du même type n'est pas écoulé. En cas de succès,
 * verrouille le requestId et journalise l'appel (type + horodatage + id
 * tronqué, jamais de contenu).
 */
export function beginAiRequest(
  requestId: string,
  type: AiOperationType,
  options: GuardOptions,
): Result<void> {
  const now = Date.now();
  const ttl = options.idempotencyTtlMs ?? DEFAULT_IDEMPOTENCY_TTL_MS;

  const startedAt = pendingStartedAt.get(requestId);
  if (startedAt !== undefined && now - startedAt < ttl) {
    return err(
      "conflict",
      `Demande "${requestId}" déjà en cours (idempotence).`,
    );
  }

  const lastCall = lastCallAtByType.get(type);
  if (lastCall !== undefined && now - lastCall < options.minDelayMs) {
    return err(
      "conflict",
      `Délai minimal non écoulé pour l'opération "${type}".`,
    );
  }

  pendingStartedAt.set(requestId, now);
  lastCallAtByType.set(type, now);
  callLog.push({ type, at: now, requestId: requestId.slice(0, 12) });

  return ok(undefined);
}

/**
 * À appeler quand la demande est terminée (succès ou échec) pour libérer
 * le verrou d'idempotence. Ne relance jamais l'appel automatiquement.
 */
export function completeAiRequest(requestId: string): void {
  pendingStartedAt.delete(requestId);
}

/** Nombre d'appels enregistrés pour un type d'opération (pas de contenu). */
export function getAiCallCount(type: AiOperationType): number {
  return callLog.filter((entry) => entry.type === type).length;
}

/** Réservé aux tests : vide tout l'état en mémoire du garde-fou. */
export function resetAiCostGuardForTests(): void {
  pendingStartedAt.clear();
  lastCallAtByType.clear();
  callLog.length = 0;
}
