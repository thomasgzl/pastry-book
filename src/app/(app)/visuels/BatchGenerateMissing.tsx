"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { BATCH_CONFIRMATION_PREFIX } from "@/lib/visuals/batch";
import { generateMissingBatchAction, type BatchActionState } from "./actions";

const INITIAL_STATE: BatchActionState = { error: null, success: null };

interface BatchGenerateMissingProps {
  missingCount: number;
  providerName: string;
  providerModel: string;
  costPerImageEstimateEur: number | null;
}

/**
 * Passerelle coût avant toute génération en lot (E4) : affiche fournisseur,
 * modèle, nombre exact d'images et coût estimé, puis exige une confirmation
 * nommée avant d'agir — jamais un lot silencieux (E3). Ce lot reste en mode
 * démonstration : le coût affiché est toujours 0 € tant qu'aucun adaptateur
 * réel n'est branché (`src/lib/ai/visuals/registry.ts`).
 */
export function BatchGenerateMissing({
  missingCount,
  providerName,
  providerModel,
  costPerImageEstimateEur,
}: BatchGenerateMissingProps) {
  const [state, formAction, pending] = useActionState(generateMissingBatchAction, INITIAL_STATE);

  if (missingCount === 0) {
    return <p className="text-sm text-cacao/70">Aucun visuel manquant : rien à générer en lot.</p>;
  }

  const expectedPhrase = `${BATCH_CONFIRMATION_PREFIX} ${missingCount}`;
  const costLabel =
    costPerImageEstimateEur === null
      ? "estimation indisponible"
      : `${(costPerImageEstimateEur * missingCount).toFixed(2)} € estimés (mode démonstration : toujours 0 €)`;

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-dashed border-grise p-4">
      <p className="text-sm text-cacao">
        Fournisseur : <strong>{providerName}</strong> · Modèle : <strong>{providerModel}</strong> · {missingCount}{" "}
        image{missingCount > 1 ? "s" : ""} à générer · Coût : {costLabel}
      </p>
      <label htmlFor="batch-confirmation" className="text-sm text-cacao/80">
        Pour confirmer, tapez exactement « {expectedPhrase} »
      </label>
      <input
        id="batch-confirmation"
        name="confirmation"
        type="text"
        autoComplete="off"
        placeholder={expectedPhrase}
        className="min-h-11 w-full max-w-sm rounded-lg border border-grise bg-coquille px-3 text-base text-cacao placeholder:text-cacao/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
      />
      {state.error && (
        <p role="alert" className="text-sm text-brunrouge">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-olive">
          {state.success}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {pending ? "Génération en cours…" : `Générer les ${missingCount} visuels manquants`}
      </Button>
    </form>
  );
}
