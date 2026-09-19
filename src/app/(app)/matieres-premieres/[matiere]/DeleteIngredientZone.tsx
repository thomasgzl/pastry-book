"use client";

/**
 * Zone de suppression d'une matière première canonique — même patron que
 * `recettes/[slug]/modifier/RecipeEditForm.tsx` (bouton rouge, confirmation
 * nommée, protection double-clic), mais autonome : les matières premières
 * n'ont pas de page « modifier » dédiée, cette zone vit directement en bas
 * de la fiche publique. `deleteCanonicalIngredientAction` refuse déjà côté
 * serveur si la matière est utilisée (recette, alias, sous-matière) —
 * l'erreur renvoyée est affichée telle quelle, jamais reformulée.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { deleteCanonicalIngredientAction } from "./ingredientActions";

export function DeleteIngredientZone({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const { redirectTo } = await deleteCanonicalIngredientAction({ id });
      router.push(redirectTo);
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
    <div className="flex flex-col gap-2 border-t border-grise pt-4">
      <p className="text-sm font-medium text-brunrouge">Zone de suppression</p>
      <Button
        type="button"
        variant="danger"
        onClick={() => setDialogOpen(true)}
        className="w-full sm:w-auto"
      >
        Supprimer cette matière première
      </Button>

      <ConfirmDialog
        open={dialogOpen}
        title={`Supprimer définitivement « ${name} » ?`}
        description="Cette action est irréversible. Impossible si cette matière première est encore utilisée par une recette, un alias ou une sous-matière."
        confirmLabel="Supprimer définitivement"
        pendingLabel="Suppression…"
        pending={deleting}
        error={error}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
