"use client";

/**
 * Partie interactive de la file des illustrations manquantes (K8/K9) :
 * sélection individuelle/par type/désélection, recherche locale, taille de
 * lot plafonnée (5 ou 10, jamais plus), et un ÉCRAN DE CONFIRMATION UNIQUE
 * avant toute génération — individuelle ou groupée (K9). Un sujet unique
 * n'est qu'un lot de taille 1 : cliquer « Générer ce sujet » sur une ligne ne
 * lance plus rien immédiatement, il présélectionne ce seul sujet et ramène
 * vers l'écran de confirmation ci-dessous (même formulaire, même phrase de
 * confirmation nommée que pour un lot de plusieurs sujets — même patron que
 * `BatchGenerateMissing` de `/visuels`, E3/E4, étendu ici au cas à 1 sujet).
 */

import { useActionState, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/states/EmptyState";
import { normalizeText } from "@/lib/recipes/search";
import { VISUAL_KIND_LABELS } from "@/lib/visuals/kindLabels";
import { buildVisualPrompt, PRESET_EXCLUSIONS, VISUAL_PRESET_VERSION, type VisualSubjectKind } from "@/lib/visuals/preset";
import { QUEUE_BATCH_SIZE_OPTIONS, QUEUE_CONFIRMATION_PREFIX, type QueueBatchSize } from "@/lib/visuals/queueConstants";
import { runMissingQueueAction, type QueueActionState } from "./actions";

export interface MissingSubjectEntry {
  type: VisualSubjectKind;
  id: string;
  label: string;
  parentLabel?: string;
  /** Recette uniquement : présence d'une photo -> mode « photo vers illustration » (K7/K9, mêmes champs que `VisualSubject`). */
  photoUrl?: string | null;
  categorySlug?: string;
  preparationNames?: string[];
  validatedKeyIngredientNames?: string[];
  additionalInformation?: string | null;
}

interface MissingQueueBrowserProps {
  entries: MissingSubjectEntry[];
  providerName: string;
  providerModel: string;
  quality: string;
  costPerImageEstimateEur: number | null;
  /** Lien documentaire officiel affiché à la place d'un prix inventé quand l'estimation n'est pas fiable (K9). */
  costDocUrl: string;
  dimensionsByType: Record<VisualSubjectKind, { ratio: string; size: string }>;
  /** Pré-remplit la recherche depuis `?q=` (K12, deep-link approché depuis une
   * carte/fiche métier vers son sujet précis) — reste une recherche normale,
   * modifiable, jamais une présélection automatique du sujet. */
  initialQuery?: string;
}

/** Prompt final EXACT tel qu'il sera envoyé au fournisseur — même appel que `generateVisualDraft`/`buildVisualPrompt` côté serveur (`service.ts`), jamais un exemple générique (K9). */
function promptFor(entry: MissingSubjectEntry): string {
  return buildVisualPrompt({
    kind: entry.type,
    subjectLabel: entry.label,
    categorySlug: entry.categorySlug,
    recipeMode: entry.type === "recipe" ? (entry.photoUrl ? "photo" : "description") : undefined,
    preparationNames: entry.preparationNames,
    validatedKeyIngredientNames: entry.validatedKeyIngredientNames,
    additionalInformation: entry.additionalInformation,
  });
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
  costDocUrl,
  dimensionsByType,
  initialQuery = "",
}: MissingQueueBrowserProps) {
  const [query, setQuery] = useState(initialQuery);
  const [batchSize, setBatchSize] = useState<QueueBatchSize>(QUEUE_BATCH_SIZE_OPTIONS[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, formAction, pending] = useActionState(runMissingQueueAction, INITIAL_STATE);
  const confirmationPanelRef = useRef<HTMLFormElement>(null);

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

  /** Sujet unique (K9) : présélectionne CE sujet et ramène vers l'écran de confirmation partagé — jamais de génération immédiate. */
  function selectOnlyAndConfirm(entry: MissingSubjectEntry) {
    setSelected(new Set([keyOf(entry)]));
    confirmationPanelRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selected.has(keyOf(entry))),
    [entries, selected],
  );

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
                        <Button type="button" variant="secondary" onClick={() => selectOnlyAndConfirm(entry)}>
                          Générer ce sujet…
                        </Button>
                      </li>
                    );
                  })}
              </ul>
            </fieldset>
          ))}
        </div>
      )}

      <form
        ref={confirmationPanelRef}
        action={formAction}
        aria-label="Confirmation avant génération"
        className="flex flex-col gap-3 rounded-xl border border-dashed border-grise p-4"
      >
        {[...selected].map((key) => (
          <input key={key} type="hidden" name="target" value={key} />
        ))}

        {selectedCount === 0 ? (
          <p className="text-sm text-cacao/70">
            Sélectionnez un ou plusieurs sujets ci-dessus (individuellement, par type, ou « Générer ce sujet… ») pour
            afficher l&rsquo;écran de confirmation avant génération.
          </p>
        ) : (
          <>
            <p className="text-sm text-cacao">
              <strong>Opération :</strong> génération de {selectedCount} brouillon{selectedCount > 1 ? "s" : ""}
              d&rsquo;illustration, preset « Botanique éditorial — {VISUAL_PRESET_VERSION} ».
            </p>

            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-cacao">
                Sujet{selectedCount > 1 ? "s" : ""} concerné{selectedCount > 1 ? "s" : ""} :
              </span>
              <ul className="flex flex-col gap-1 text-sm text-cacao/80">
                {selectedEntries.map((entry) => (
                  <li key={keyOf(entry)}>
                    {entry.label} — {VISUAL_KIND_LABELS[entry.type]}
                    {entry.parentLabel && <span className="text-cacao/60"> ({entry.parentLabel})</span>}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-sm text-cacao">
              Fournisseur : <strong>{providerName}</strong> · Modèle : <strong>{providerModel}</strong> · Qualité :{" "}
              <strong>{quality}</strong>
            </p>
            <ul className="text-xs text-cacao/70">
              {TYPE_ORDER.filter((type) => selectedEntries.some((entry) => entry.type === type)).map((type) => (
                <li key={type}>
                  {VISUAL_KIND_LABELS[type]} : ratio {dimensionsByType[type].ratio}, {dimensionsByType[type].size}
                </li>
              ))}
            </ul>
            <p className="text-sm text-cacao">
              Nombre d&rsquo;images : <strong>{selectedCount}</strong> · Nombre d&rsquo;appels :{" "}
              <strong>{selectedCount}</strong> (un appel par sujet, jamais de lot réel groupé) · Coût estimé :{" "}
              {costPerImageEstimateEur === null ? (
                <>
                  <strong>Estimation indisponible</strong> — voir le{" "}
                  <a href={costDocUrl} target="_blank" rel="noreferrer" className="underline">
                    barème tarifaire officiel du fournisseur
                  </a>
                  , jamais un prix inventé.
                </>
              ) : (
                <strong>{costLabel}</strong>
              )}
            </p>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-cacao">Prompt final par sujet (tel qu&rsquo;envoyé au fournisseur) :</span>
              {selectedEntries.map((entry) => (
                <details key={keyOf(entry)} className="rounded-lg border border-grise bg-coquille p-3">
                  <summary className="cursor-pointer text-sm text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
                    {entry.label} — {VISUAL_KIND_LABELS[entry.type]}
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-cacao/80">{promptFor(entry)}</pre>
                </details>
              ))}
            </div>

            <details className="rounded-lg border border-grise bg-coquille p-3">
              <summary className="cursor-pointer text-sm text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
                Exclusions du preset « Botanique éditorial — {VISUAL_PRESET_VERSION} »
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-cacao/80">
                {PRESET_EXCLUSIONS.map((exclusion) => (
                  <li key={exclusion}>{exclusion}</li>
                ))}
              </ul>
            </details>

            <p className="text-xs text-cacao/60">
              Exécution disponible dans cet écran : mode démonstration (gratuit, aucun appel OpenAI). Cet écran est
              celui qui précédera tout futur appel réel payant, avec ce même nombre d&rsquo;appels et ce même coût.
            </p>

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
          {pending
            ? "Génération en cours…"
            : selectedCount <= 1
              ? "Générer ce sujet"
              : `Générer le lot (${selectedCount})`}
        </Button>
      </form>
    </div>
  );
}
