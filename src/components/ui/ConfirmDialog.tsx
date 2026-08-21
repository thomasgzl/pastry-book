"use client";

/**
 * Confirmation générique pour une action destructive (CLAUDE.md, « toute
 * suppression doit demander confirmation ») — première utilisation :
 * suppression d'une recette (`/recettes/[slug]/modifier`). Volontairement
 * distinct de `window.confirm` (déjà utilisé pour « Annuler » dans
 * `RecipeEditForm`) : `window.confirm` est bloquant et ne peut pas afficher
 * d'état « en cours »/désactivé pendant une requête serveur en vol, requis
 * ici pour empêcher un double clic.
 *
 * Ne se ferme jamais tout seul : c'est l'appelant (`open`) qui décide quand
 * la fermer, y compris après un échec (pour permettre de réessayer).
 */

import { useEffect } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-cacao/50 p-4 sm:items-center"
      onClick={() => !pending && onCancel()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-coquille p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="confirm-dialog-title" className="text-base font-medium text-cacao">
          {title}
        </p>
        {description && <p className="text-sm text-legende">{description}</p>}
        {error && <p className="text-sm text-brunrouge">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? (pendingLabel ?? "Chargement…") : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
