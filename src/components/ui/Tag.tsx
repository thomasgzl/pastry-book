import type { ReactNode } from "react";

interface TagProps {
  children: ReactNode;
  className?: string;
}

/**
 * Petit tag texte (ex. matière première sur une carte recette). Purement
 * visuel, pas de rôle ARIA imposé : le texte porte déjà le sens dans son
 * contexte (liste, carte…).
 */
export function Tag({ children, className = "" }: TagProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-grise bg-avoine px-2.5 py-1 text-xs font-medium text-cacao ${className}`}
    >
      {children}
    </span>
  );
}
