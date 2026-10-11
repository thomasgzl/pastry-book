"use client";

/**
 * Vue d'ensemble des versions fond-transparent (K-BG) en attente d'un choix
 * humain, pour éviter de déplier chaque sujet un par un juste pour vérifier
 * qu'un lot de nettoyage est satisfaisant. Miniatures en lecture seule
 * (même rôle que les vignettes de `VersionRow`/`EntryHeader`, pas la
 * comparaison détaillée de `BackgroundRemovalPreview`) + un bouton de
 * validation en lot avec confirmation nommée — même garde que
 * `BatchGenerateMissing` (E3/E4), jamais une bascule silencieuse.
 */

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
import { BACKGROUND_REMOVAL_BATCH_CONFIRMATION_PREFIX } from "@/lib/visuals/batch";
import { applyAllBackgroundRemovedBatchAction, type BatchActionState } from "../visuels/actions";

const INITIAL_STATE: BatchActionState = { error: null, success: null };

export interface PendingBackgroundRemovalItem {
  id: string;
  label: string;
  originalUrl: string | null;
  cleanedUrl: string;
}

interface BackgroundRemovalReviewPanelProps {
  items: PendingBackgroundRemovalItem[];
}

export function BackgroundRemovalReviewPanel({ items }: BackgroundRemovalReviewPanelProps) {
  const [state, formAction, pending] = useActionState(applyAllBackgroundRemovedBatchAction, INITIAL_STATE);

  if (items.length === 0) return null;

  const expectedPhrase = `${BACKGROUND_REMOVAL_BATCH_CONFIRMATION_PREFIX} ${items.length}`;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-grise bg-coquille p-4">
      <p className="text-sm text-cacao">
        <strong>{items.length}</strong> version{items.length > 1 ? "s" : ""} fond-transparent en attente de
        validation — original à gauche, nettoyé à droite, pour chaque image.
      </p>

      <ul className="flex flex-wrap gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-1 rounded-lg border border-grise bg-ivoire p-1.5">
            {item.originalUrl && (
              <ImageWithSkeleton
                src={item.originalUrl}
                alt=""
                className="h-14 w-14 rounded-md border border-grise bg-coquille object-contain"
              />
            )}
            <ImageWithSkeleton
              src={item.cleanedUrl}
              alt=""
              className="h-14 w-14 rounded-md border border-grise bg-coquille object-contain"
            />
            <span className="max-w-20 truncate px-1 text-xs text-cacao/70" title={item.label}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="background-batch-confirmation" className="text-sm text-cacao/80">
          Pour valider les {items.length} version{items.length > 1 ? "s" : ""} nettoyée{items.length > 1 ? "s" : ""}{" "}
          d'un coup (au lieu d'image par image), tapez exactement « {expectedPhrase} »
        </label>
        <input
          id="background-batch-confirmation"
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
          {pending ? "Validation en cours…" : `Valider les ${items.length} versions nettoyées`}
        </Button>
      </form>
    </div>
  );
}
