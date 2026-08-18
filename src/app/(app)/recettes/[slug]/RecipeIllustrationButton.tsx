"use client";

/**
 * Action « Créer l'illustration » / « Réessayer » de la fiche recette
 * (F-IA3) : affichée uniquement tant qu'aucun visuel principal n'existe,
 * jamais depuis la carte de catégorie. Un seul appel réel par clic — pas de
 * relance automatique au chargement/rechargement de la page (CLAUDE.md).
 */

import { useState, useTransition } from "react";
import { generateRecipeIllustrationAction } from "./illustrationActions";

interface RecipeIllustrationButtonProps {
  recipeId: string;
  slug: string;
  className?: string;
}

export function RecipeIllustrationButton({ recipeId, slug, className = "" }: RecipeIllustrationButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateRecipeIllustrationAction(recipeId, slug);
      if (!result.ok) setError(result.message ?? "Illustration non créée.");
    });
  }

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm text-cacao/60 underline hover:text-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-wait disabled:text-cacao/40"
      >
        {isPending ? "Création de l'illustration…" : error ? "Réessayer" : "Créer l'illustration"}
      </button>
      {error && <p className="text-sm text-brunrouge">{error}</p>}
    </div>
  );
}
