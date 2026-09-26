"use client";

/**
 * Zone de suppression d'une matière première canonique — même patron que
 * `recettes/[slug]/modifier/RecipeEditForm.tsx` (bouton rouge, confirmation
 * nommée, protection double-clic), mais autonome : les matières premières
 * n'ont pas de page « modifier » dédiée, cette zone vit directement en bas
 * de la fiche publique. `deleteCanonicalIngredientAction` refuse déjà côté
 * serveur si la matière est utilisée (recette, alias, sous-matière) —
 * l'erreur renvoyée est affichée telle quelle, jamais reformulée.
 *
 * « Forcer » n'apparaît que lorsque le message de refus l'invite (le seul
 * blocage vient alors d'un alias ou d'une sous-matière, jamais d'une
 * recette — `delete_canonical_ingredient` refuse toujours l'usage réel dans
 * une recette, avec ou sans force, voir la migration
 * `20260926150000_delete_canonical_ingredient_force.sql`).
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

  async function handleConfirm(force = false) {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteCanonicalIngredientAction({ id, force });
      if (!result.ok) {
        setError(result.error);
        setDeleting(false);
        return;
      }
      router.push(result.redirectTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La suppression a échoué. Réessayez.");
      setDeleting(false);
    }
  }

  const canForce = error !== null && error.includes("forcer");

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
        onConfirm={() => handleConfirm(false)}
        onCancel={handleCancel}
        secondaryAction={
          canForce
            ? { label: "Forcer la suppression", onClick: () => handleConfirm(true) }
            : undefined
        }
      />
    </div>
  );
}
