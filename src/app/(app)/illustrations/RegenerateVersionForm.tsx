"use client";

/**
 * « Générer une nouvelle version » (K11) — écran de confirmation compact pour
 * UN sujet déjà illustré, même mécanisme que la file des manquants (K9,
 * `MissingQueueBrowser`) : fournisseur/modèle/qualité/dimensions/coût, prompt
 * final repliable, exclusions du preset, phrase de confirmation nommée.
 * Repliée par défaut (`<details>` natif) — jamais affichée ouverte, jamais de
 * génération déclenchée sans ce geste explicite.
 */

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { buildVisualPrompt, PRESET_EXCLUSIONS, VISUAL_PRESET_VERSION, type VisualSubjectKind } from "@/lib/visuals/preset";
import { QUEUE_CONFIRMATION_PREFIX } from "@/lib/visuals/queueConstants";
import { regenerateVersionAction, INITIAL_REGENERATE_STATE } from "./regenerateActions";

export interface RegenerateVersionFormProps {
  subjectType: VisualSubjectKind;
  subjectId: string;
  subjectLabel: string;
  photoUrl?: string | null;
  categorySlug?: string;
  preparationNames?: string[];
  validatedKeyIngredientNames?: string[];
  additionalInformation?: string | null;
  providerName: string;
  providerModel: string;
  quality: string;
  costPerImageEstimateEur: number | null;
  costDocUrl: string;
  ratio: string;
  size: string;
}

const EXPECTED_PHRASE = `${QUEUE_CONFIRMATION_PREFIX} 1`;

export function RegenerateVersionForm(props: RegenerateVersionFormProps) {
  const [state, formAction, pending] = useActionState(regenerateVersionAction, INITIAL_REGENERATE_STATE);

  const prompt = buildVisualPrompt({
    kind: props.subjectType,
    subjectLabel: props.subjectLabel,
    categorySlug: props.categorySlug,
    recipeMode: props.subjectType === "recipe" ? (props.photoUrl ? "photo" : "description") : undefined,
    preparationNames: props.preparationNames,
    validatedKeyIngredientNames: props.validatedKeyIngredientNames,
    additionalInformation: props.additionalInformation,
  });

  return (
    <details className="rounded-lg border border-dashed border-grise bg-coquille p-3">
      <summary className="cursor-pointer text-sm font-medium text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
        Générer une nouvelle version…
      </summary>

      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="subjectType" value={props.subjectType} />
        <input type="hidden" name="subjectId" value={props.subjectId} />

        <p className="text-sm text-cacao">
          <strong>Opération :</strong> génération d&rsquo;un nouveau brouillon d&rsquo;illustration pour «{" "}
          {props.subjectLabel} », preset « Botanique éditorial — {VISUAL_PRESET_VERSION} ». Le visuel actuellement
          principal n&rsquo;est ni modifié ni remplacé tant que ce nouveau brouillon n&rsquo;est pas explicitement
          approuvé.
        </p>

        <p className="text-sm text-cacao">
          Fournisseur : <strong>{props.providerName}</strong> · Modèle : <strong>{props.providerModel}</strong> ·
          Qualité : <strong>{props.quality}</strong> · Format : ratio {props.ratio}, {props.size}
        </p>

        <p className="text-sm text-cacao">
          Nombre d&rsquo;images : <strong>1</strong> · Nombre d&rsquo;appels : <strong>1</strong> · Coût estimé :{" "}
          {props.costPerImageEstimateEur === null ? (
            <>
              <strong>Estimation indisponible</strong> — voir le{" "}
              <a href={props.costDocUrl} target="_blank" rel="noreferrer" className="underline">
                barème tarifaire officiel du fournisseur
              </a>
              , jamais un prix inventé.
            </>
          ) : (
            <strong>{props.costPerImageEstimateEur.toFixed(2)} € estimés</strong>
          )}
        </p>

        <details className="rounded-lg border border-grise bg-ivoire p-3">
          <summary className="cursor-pointer text-sm text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
            Prompt final (tel qu&rsquo;envoyé au fournisseur)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-cacao/80">{prompt}</pre>
        </details>

        <details className="rounded-lg border border-grise bg-ivoire p-3">
          <summary className="cursor-pointer text-sm text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
            Exclusions du preset « Botanique éditorial — {VISUAL_PRESET_VERSION} »
          </summary>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-cacao/80">
            {PRESET_EXCLUSIONS.map((exclusion) => (
              <li key={exclusion}>{exclusion}</li>
            ))}
          </ul>
        </details>

        <label htmlFor={`regen-confirmation-${props.subjectId}`} className="text-sm text-cacao/80">
          Pour confirmer, tapez exactement « {EXPECTED_PHRASE} »
        </label>
        <input
          id={`regen-confirmation-${props.subjectId}`}
          name="confirmation"
          type="text"
          autoComplete="off"
          placeholder={EXPECTED_PHRASE}
          className="min-h-11 w-full max-w-sm rounded-lg border border-grise bg-ivoire px-3 text-base text-cacao placeholder:text-cacao/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
        />

        {state.error && (
          <p role="alert" className="text-sm text-brunrouge">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-sm text-olive">
            Nouveau brouillon généré — à vérifier ci-dessus avant approbation.
          </p>
        )}

        <Button type="submit" variant="secondary" disabled={pending} className="self-start">
          {pending ? "Génération en cours…" : "Générer une nouvelle version"}
        </Button>
      </form>
    </details>
  );
}
