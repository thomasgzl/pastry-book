/**
 * Convention d'erreur commune (tâche B2). Les services (accès données,
 * ports IA) retournent un `Result` plutôt que de lever une exception à
 * travers les frontières de couche — l'appelant décide comment afficher
 * l'état `error`.
 */

export type DomainErrorCode =
  | "not_found"
  | "validation_failed"
  | "unauthorized"
  | "conflict"
  | "provider_unavailable"
  | "unknown";

export type DomainError = {
  code: DomainErrorCode;
  message: string;
  cause?: unknown;
};

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DomainError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(
  code: DomainErrorCode,
  message: string,
  cause?: unknown,
): Result<never> {
  return { ok: false, error: { code, message, cause } };
}
