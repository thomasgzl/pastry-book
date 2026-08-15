"use client";

import { EditorialTitle } from "@/components/ui/EditorialTitle";
import type { Source } from "@/lib/domain/schemas";

interface SourceStepProps {
  sources: Source[];
  sourceId: string | null;
  onChange: (sourceId: string) => void;
}

/**
 * Étape 1 — choix de l'entreprise/source existante (D1). Aucune création de
 * nouvelle source ici : seules les catégories locales sont créables à
 * l'étape suivante, jamais une entreprise (hors périmètre du formulaire
 * d'import, CLAUDE.md § Architecture fonctionnelle).
 */
export function SourceStep({ sources, sourceId, onChange }: SourceStepProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <EditorialTitle as="h2">Entreprise ou source</EditorialTitle>
        <p className="text-sm text-cacao/70">D&rsquo;où provient cette recette ?</p>
      </div>

      <div role="radiogroup" aria-label="Entreprise ou source" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sources.map((source) => {
          const selected = source.id === sourceId;
          return (
            <button
              key={source.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(source.id)}
              className={`min-h-11 rounded-lg border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
                selected ? "border-olive bg-olive text-coquille" : "border-grise bg-coquille text-cacao hover:bg-avoine"
              }`}
            >
              {source.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
