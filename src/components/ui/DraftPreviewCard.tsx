"use client";

/**
 * Validation immédiate d'un brouillon de visuel tout juste créé — extrait de
 * `MissingQueueBrowser` (K9+, éviter l'aller-retour par `/illustrations` pour
 * approuver ou rejeter) pour être réutilisé par `UploadVisualForm` (import
 * manuel) sans dupliquer ce bloc. Mêmes Server Actions que `/illustrations`
 * (`approveAsPrimaryAction`/`rejectAction`, `visuels/actions.ts`) — jamais une
 * logique dupliquée. `onResolved` masque la carte côté appelant dès le clic
 * (mise à jour optimiste) ; la vraie mutation/re-validation des pages
 * publiques reste portée par la Server Action elle-même.
 */

import { Button } from "./Button";
import { ImageWithSkeleton } from "./ImageWithSkeleton";
import { approveAsPrimaryAction, rejectAction } from "@/app/(app)/visuels/actions";

export function DraftPreviewCard({
  assetId,
  imageUrl,
  onResolved,
}: {
  assetId: string;
  imageUrl: string;
  onResolved: (assetId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-grise bg-coquille p-3 sm:flex-row sm:items-center">
      <ImageWithSkeleton
        src={imageUrl}
        alt=""
        className="h-20 w-20 shrink-0 rounded-lg border border-grise bg-ivoire object-contain"
      />
      <div className="flex flex-1 flex-col gap-2">
        <p className="text-sm text-cacao">Brouillon — à valider :</p>
        <div className="flex flex-wrap gap-2">
          <form action={approveAsPrimaryAction} onSubmit={() => onResolved(assetId)}>
            <input type="hidden" name="assetId" value={assetId} />
            <Button type="submit" variant="primary" className="text-sm">
              Approuver et utiliser
            </Button>
          </form>
          <form action={rejectAction} onSubmit={() => onResolved(assetId)}>
            <input type="hidden" name="assetId" value={assetId} />
            <Button type="submit" variant="secondary" className="text-sm">
              Rejeter
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
