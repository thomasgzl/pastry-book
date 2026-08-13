/**
 * Décision d'accès pure (B4), utilisée par `middleware.ts`. Isolée dans un
 * module sans dépendance à l'environnement Next.js Edge pour rester testable
 * avec Vitest. Toutes les pages métier sont privées ; seule la connexion
 * (`docs/08-ACCEPTANCE_CRITERIA.md`, route `/connexion`) reste publique,
 * même si la page elle-même n'est pas encore construite.
 */

export const PUBLIC_PATHS = ["/connexion"] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`),
  );
}
