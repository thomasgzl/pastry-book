import type { HTMLAttributes } from "react";

/**
 * Conteneur visuel de base : bordure fine, rayon modéré, ombre très légère,
 * surface coquille sur fond ivoire. Voir docs/06-DESIGN_SYSTEM.md.
 * Purement structurel — pas de rôle ARIA imposé, le contenu porte le sens.
 */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-grise bg-coquille p-4 shadow-sm ${className}`}
      {...props}
    />
  );
}
