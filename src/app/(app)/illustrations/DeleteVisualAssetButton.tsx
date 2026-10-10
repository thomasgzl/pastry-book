"use client";

/**
 * Suppression d'une version non principale (K-delete) — même patron que
 * `DeleteIngredientZone.tsx` (`ConfirmDialog`, protection double-clic), en
 * version compacte pour tenir dans une ligne de `VersionRow`. Jamais affiché
 * pour le visuel principal (`IllustrationEntryCard` ne rend ce bouton que
 * si `!version.isPrimary`) — la garde serveur (`deleteVisualAsset`) refuse
 * de toute façon la suppression du principal, ce bouton n'existe simplement
 * pas pour cette version-là plutôt que d'afficher une erreur prévisible.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteVisualAssetAction } from "../visuels/actions";

export function DeleteVisualAssetButton({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteVisualAssetAction({ assetId });
      if (!result.ok) {
        setError(result.error);
        setDeleting(false);
        return;
      }
      setDialogOpen(false);
      setDeleting(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La suppression a échoué. Réessayez.");
      setDeleting(false);
    }
  }

  function handleCancel() {
    if (deleting) return;
    setDialogOpen(false);
    setError(null);
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setDialogOpen(true)} className="text-sm">
        Supprimer
      </Button>
      <ConfirmDialog
        open={dialogOpen}
        title="Supprimer définitivement cette version ?"
        description="Cette action est irréversible. Le fichier associé est supprimé en plus de la fiche."
        confirmLabel="Supprimer définitivement"
        pendingLabel="Suppression…"
        pending={deleting}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
