import type { ReactNode } from "react";

interface EditorialTitleProps {
  children: ReactNode;
  /** `h1` pour un titre de page, `h2` pour un titre de section. Un seul
   * endroit pour cette combinaison de classes (Bodoni Moda, poids, taille)
   * plutôt que la même chaîne répétée dans chaque page — voir CBF1. */
  as?: "h1" | "h2";
  className?: string;
}

const SIZE_BY_LEVEL: Record<"h1" | "h2", string> = {
  h1: "text-2xl sm:text-3xl",
  h2: "text-lg sm:text-xl",
};

/** Titre éditorial (typo Bodoni Moda déjà en place, `--font-serif`). */
export function EditorialTitle({ children, as = "h1", className = "" }: EditorialTitleProps) {
  const Tag = as;
  return (
    <Tag className={`font-serif font-semibold text-cacao ${SIZE_BY_LEVEL[as]} ${className}`}>
      {children}
    </Tag>
  );
}
