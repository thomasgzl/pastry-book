"use client";

/**
 * Import manuel d'une illustration (K-import-manuel) — alternative à la
 * génération IA, jamais la seule option : réutilisée par `MissingQueueBrowser`
 * (sujet sans aucun visuel) et `IllustrationEntryCard` (sujet déjà illustré,
 * nouvelle version). Toujours un brouillon (`uploadVisualAction`), jamais
 * approuvé automatiquement — même geste de validation humaine que la
 * génération IA.
 *
 * `showInlinePreview` : la file des manquants n'affiche aucune liste de
 * versions existantes pour un sujet manquant (par définition), donc le
 * brouillon importé doit s'afficher ici même pour être validé
 * (`DraftPreviewCard`, même patron que les brouillons générés). Un sujet déjà
 * illustré (`IllustrationEntryCard`) a lui déjà sa liste de versions
 * au-dessus : le nouveau brouillon y apparaît après rafraîchissement —
 * même comportement que `RegenerateVersionForm`, un simple message suffit ici.
 */

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DraftPreviewCard } from "@/components/ui/DraftPreviewCard";
import type { VisualSubjectKind } from "@/lib/visuals/preset";
import { uploadVisualAction, type UploadVisualState } from "./uploadActions";

const INITIAL_STATE: UploadVisualState = { error: null, success: null };

export function UploadVisualForm({
  subjectType,
  subjectId,
  showInlinePreview = true,
}: {
  subjectType: VisualSubjectKind;
  subjectId: string;
  showInlinePreview?: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadVisualAction, INITIAL_STATE);
  const [resolved, setResolved] = useState(false);

  if (resolved) {
    return <p className="text-sm text-olive">Image importée et validée.</p>;
  }

  if (state.success && showInlinePreview) {
    return (
      <DraftPreviewCard
        assetId={state.success.assetId}
        imageUrl={state.success.imageUrl}
        onResolved={() => setResolved(true)}
      />
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input
        type="file"
        name="file"
        accept="image/png,image/jpeg,image/webp"
        required
        className="min-h-11 max-w-full text-sm text-cacao file:mr-2 file:min-h-11 file:rounded-lg file:border file:border-grise file:bg-ivoire file:px-3 file:py-2 file:text-sm file:text-cacao"
      />
      <Button type="submit" variant="secondary" disabled={pending} className="text-sm">
        {pending ? "Import…" : "Importer cette image"}
      </Button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-brunrouge">
          {state.error}
        </p>
      )}
      {state.success && !showInlinePreview && (
        <p role="status" className="w-full text-sm text-olive">
          Image importée — à vérifier ci-dessus avant approbation.
        </p>
      )}
    </form>
  );
}
