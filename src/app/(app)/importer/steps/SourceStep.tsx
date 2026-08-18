"use client";

import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Button } from "@/components/ui/Button";
import type { Source } from "@/lib/domain/schemas";

/** Sélection en attente d'une NOUVELLE entreprise/source, pas encore créée en base — jamais transmis tel quel à Supabase, remplacé par l'id réel uniquement à l'enregistrement final de la recette (voir `ImporterWizard.handleConfirmSave`). */
export const PENDING_NEW_SOURCE_ID = "pending-new-source";

interface SourceStepProps {
  sources: Source[];
  sourceId: string | null;
  onChange: (sourceId: string) => void;
  /** `null` = panneau « nouvelle entreprise » fermé ; chaîne (même vide) = panneau ouvert, valeur conservée par le parent (`ImporterWizard`) pendant les étapes suivantes. */
  newSourceName: string | null;
  onOpenNewSource: () => void;
  onNewSourceNameChange: (name: string) => void;
  onCancelNewSource: () => void;
}

/**
 * Étape 1 — choix de l'entreprise/source (D1) : une source existante, ou la
 * création d'une nouvelle entreprise/source (dernière carte). La nouvelle
 * entreprise n'est JAMAIS créée ici : seul son nom est conservé le temps du
 * parcours, la création réelle a lieu au moment de l'enregistrement final de
 * la recette, dans la même écriture atomique (CLAUDE.md, IA supervisée /
 * jamais de publication sans validation humaine explicite).
 */
export function SourceStep({
  sources,
  sourceId,
  onChange,
  newSourceName,
  onOpenNewSource,
  onNewSourceNameChange,
  onCancelNewSource,
}: SourceStepProps) {
  const addingNewSource = newSourceName !== null;

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
        <button
          type="button"
          role="radio"
          aria-checked={sourceId === PENDING_NEW_SOURCE_ID}
          onClick={onOpenNewSource}
          className={`min-h-11 rounded-lg border border-dashed px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
            sourceId === PENDING_NEW_SOURCE_ID
              ? "border-olive bg-olive text-coquille"
              : "border-grise bg-coquille text-cacao hover:bg-avoine"
          }`}
        >
          + Nouvelle entreprise ou source
        </button>
      </div>

      {addingNewSource && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-grise p-3">
          <label htmlFor="new-source" className="text-sm font-medium text-cacao">
            Nom de l&rsquo;entreprise ou de la source
          </label>
          <div className="flex flex-wrap gap-2">
            <input
              id="new-source"
              type="text"
              value={newSourceName}
              onChange={(event) => onNewSourceNameChange(event.target.value)}
              placeholder="Ex. Maison Durand"
              autoFocus
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
            />
            <Button type="button" variant="secondary" onClick={onCancelNewSource}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
