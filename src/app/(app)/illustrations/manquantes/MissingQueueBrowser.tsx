"use client";

/**
 * Partie interactive de la file des illustrations manquantes (K8) :
 * sélection individuelle/par type/désélection, recherche locale, taille de
 * lot plafonnée (5 ou 10, jamais plus), génération d'un seul sujet (bouton
 * immédiat par ligne) et génération en lot (formulaire séparé, phrase de
 * confirmation nommée obligatoire — même patron que `BatchGenerateMissing`
 * de `/visuels`, E3/E4).
 */

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/states/EmptyState";
import { normalizeText } from "@/lib/recipes/search";
import { VISUAL_KIND_LABELS } from "@/lib/visuals/kindLabels";
import type { VisualSubjectKind } from "@/lib/visuals/preset";
import { QUEUE_BATCH_SIZE_OPTIONS, QUEUE_CONFIRMATION_PREFIX, type QueueBatchSize } from "@/lib/visuals/queueConstants";
import { generateSingleMissingAction, runMissingQueueAction, type QueueActionState } from "./actions";

export interface MissingSubjectEntry {
  type: VisualSubjectKind;
  id: string;
  label: string;
  parentLabel?: string;
}

interface MissingQueueBrowserProps {
  entries: MissingSubjectEntry[];
  providerName: string;
  providerModel: string;
  quality: string;
  costPerImageEstimateEur: number | null;
  dimensionsByType: Record<VisualSubjectKind, { ratio: string; size: string }>;
}

const TYPE_ORDER: VisualSubjectKind[] = ["ingredient", "recipe", "source", "sourceCategory"];

const INITIAL_STATE: QueueActionState = { error: null, outcomes: null };

const OUTCOME_LABEL: Record<string, string> = {
  ok: "Généré",
  skipped: "Ignoré (déjà pourvu)",
  error: "Échec",
  not_attempted: "Non tenté (lot arrêté après un échec)",
};

function keyOf(entry: { type: string; id: string }): string {
  return `${entry.type}:${entry.id}`;
}

export function MissingQueueBrowser({
  entries,
  providerName,
  providerModel,
  quality,
  costPerImageEstimateEur,
  dimensionsByType,
}: MissingQueueBrowserProps) {
  const [query, setQuery] = useState("");
  const [batchSize, setBatchSize] = useState<QueueBatchSize>(QUEUE_BATCH_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState(runMissingQueueAction, INITIAL_STATE);

  const totalByType = useMemo(() => {
    const counts = new Map<VisualSubjectKind, number>();
    for (const entry of entries) counts.set(entry.type, (counts.get(entry.type) ?? 0) + 1);
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    if (!query) return entries;
    const needle = normalizeText(query);
    return entries.filter(
      (entry) =>
        normalizeText(entry.label).includes(needle) ||
        (entry.parentLabel ? normalizeText(entry.parentLabel).includes(needle) : false),
    );
  }, [entries, query]);

  const selectedCount = selected.size;
  const capReached = selectedCount >= batchSize;

  function toggle(entry: MissingSubjectEntry) {
    setSelected((previous) => {
      const next = new Set(previous);
      const key = keyOf(entry);
      if (next.has(key)) {
        next.delete(key);
      } else if (next.size < batchSize) {
        next.add(key);
      }
      return next;
    });
  }

  function selectAllInType(type: VisualSubjectKind) {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const entry of entries) {
        if (entry.type !== type) continue;
        if (next.size >= batchSize) break;
        next.add(keyOf(entry));
      }
      return next;
    });
  }

  function deselectType(type: VisualSubjectKind) {
    setSelected((previous) => {
      const next = new Set(previous);
      for (const entry of entries) {
        if (entry.type === type) next.delete(keyOf(entry));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const expectedPhrase = `${QUEUE_CONFIRMATION_PREFIX} ${selectedCount}`;
  const costLabel =
    selectedCount === 0
      ? null
      : costPerImageEstimateEur === null
        ? "Estimation indisponible"
        : `${(costPerImageEstimateEur * selectedCount).toFixed(2)} € estimés`;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-grise bg-coquille p-4">
        <p className="text-sm text-cacao">
          <strong>{entries.length}</strong> sujet{entries.length > 1 ? "s" : ""} sans illustration au total.
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-cacao/80">
          {TYPE_ORDER.filter((type) => (totalByType.get(type) ?? 0) > 0).map((type) => (
            <li key={type}>
              {VISUAL_KIND_LABELS[type]} : {totalByType.get(type)}
            </li>
          ))}
        </ul>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        label="Rechercher un sujet manquant par nom"
        placeholder="Rechercher par nom…"
        className="w-full max-w-md sm:max-w-lg"
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-cacao">Taille de lot :</span>
        {QUEUE_BATCH_SIZE_OPTIONS.map((size) => (
          <label key={size} className="inline-flex min-h-11 items-center gap-2 text-sm text-cacao">
            <input
              type="radio"
              name="batch-size"
              value={size}
              checked={batchSize === size}
              onChange={() => {
                setBatchSize(size);
                setSelected((previous) => new Set([...previous].slice(0, size)));
              }}
              className="h-5 w-5 accent-olive"
            />
            {size}
          </label>
        ))}
        {selectedCount > 0 && (
          <Button type="button" variant="secondary" onClick={clearSelection}>
            Tout désélectionner
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="Aucun sujet ne correspond à cette recherche." />
      ) : (
        <div className="flex flex-col gap-5">
          {TYPE_ORDER.filter((type) => filtered.some((entry) => entry.type === type)).map((type) => (
            <fieldset key={type} className="flex flex-col gap-2 rounded-xl border border-grise p-4">
              <legend className="flex flex-wrap items-center gap-3 px-1 text-sm font-medium text-cacao">
                {VISUAL_KIND_LABELS[type]}
                <Button type="button" variant="secondary" onClick={() => selectAllInType(type)} disabled={capReached}>
                  Tout sélectionner
                </Button>
                <Button type="button" variant="secondary" onClick={() => deselectType(type)}>
                  Désélectionner
                </Button>
              </legend>
              <ul className="flex flex-col gap-2">
                {filtered
                  .filter((entry) => entry.type === type)
                  .map((entry) => {
                    const key = keyOf(entry);
                    const checked = selected.has(key);
                    return (
                      <li
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-grise bg-coquille p-3"
                      >
                        <label className="flex min-h-11 flex-1 items-center gap-3 text-sm text-cacao">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(entry)}
                            disabled={!checked && capReached}
                            className="h-5 w-5 accent-olive"
                          />
                          {entry.label}
                          {entry.parentLabel && <span className="text-xs text-cacao/60">({entry.parentLabel})</span>}
                        </label>
                        <form action={generateSingleMissingAction}>
                          <input type="hidden" name="type" value={entry.type} />
                          <input type="hidden" name="id" value={entry.id} />
                          <Button type="submit" variant="secondary">
                            Générer ce sujet
                          </Button>
                        </form>
                      </li>
                    );
                  })}
              </ul>
            </fieldset>
          ))}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-dashed border-grise p-4">
        {[...selected].map((key) => (
          <input key={key} type="hidden" name="target" value={key} />
        ))}
        <p className="text-sm text-cacao">
          Fournisseur cible : <strong>{providerName}</strong> · Modèle : <strong>{providerModel}</strong> · Qualité :{" "}
          <strong>{quality}</strong>
        </p>
        <ul className="text-xs text-cacao/70">
          {TYPE_ORDER.map((type) => (
            <li key={type}>
              {VISUAL_KIND_LABELS[type]} : ratio {dimensionsByType[type].ratio}, {dimensionsByType[type].size}
            </li>
          ))}
        </ul>
        <p className="text-sm text-cacao">
          <strong>{selectedCount}</strong> sujet{selectedCount > 1 ? "s" : ""} sélectionné
          {selectedCount > 1 ? "s" : ""} · <strong>{selectedCount}</strong> appel{selectedCount > 1 ? "s" : ""} exact
          {selectedCount > 1 ? "s" : ""}
          {costLabel && <> · Coût : {costLabel}</>}
        </p>
        <p className="text-xs text-cacao/60">
          Exécution disponible dans cet écran : mode démonstration (gratuit, aucun appel OpenAI). L&rsquo;écran de
          confirmation avant un appel réel payant, avec ce même nombre d&rsquo;appels et ce même coût, est une étape
          séparée à venir.
        </p>
        {selectedCount > 0 && (
          <>
            <label htmlFor="queue-confirmation" className="text-sm text-cacao/80">
              Pour confirmer, tapez exactement « {expectedPhrase} »
            </label>
            <input
              id="queue-confirmation"
              name="confirmation"
              type="text"
              autoComplete="off"
              placeholder={expectedPhrase}
              className="min-h-11 w-full max-w-sm rounded-lg border border-grise bg-coquille px-3 text-base text-cacao placeholder:text-cacao/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
            />
          </>
        )}
        {state.error && (
          <p role="alert" className="text-sm text-brunrouge">
            {state.error}
          </p>
        )}
        {state.outcomes && (
          <ul className="text-sm text-cacao/80">
            {state.outcomes.map((outcome, index) => (
              <li key={`${outcome.type}-${outcome.id}-${index}`}>
                {OUTCOME_LABEL[outcome.status]}
                {outcome.message ? ` — ${outcome.message}` : ""}
              </li>
            ))}
          </ul>
        )}
        <Button type="submit" variant="secondary" disabled={pending || selectedCount === 0} className="self-start">
          {pending ? "Génération en cours…" : `Générer le lot (${selectedCount})`}
        </Button>
      </form>
    </div>
  );
}
