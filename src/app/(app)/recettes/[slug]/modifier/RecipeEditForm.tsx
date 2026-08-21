"use client";

/**
 * Formulaire de modification manuelle d'une recette déjà enregistrée.
 * Réutilise `RecipeDetailsStep` (formulaire déjà utilisé par `/importer`
 * pour titre/procédé/température/informations complémentaires/préparations/
 * ingrédients/spécificités) et `CategoryStep` (choix de la catégorie locale,
 * propre à l'entreprise sélectionnée) — un seul formulaire de recette
 * maintenu pour les deux parcours, pas un second écrit à côté.
 *
 * Le choix de l'entreprise/source reste limité aux entreprises déjà
 * existantes (pas de « + Nouvelle entreprise » ici, contrairement à
 * `/importer`) : ce cas ajouterait une création de source transactionnelle
 * à `update_recipe` pour un besoin non demandé pour cette tâche.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import type { CanonicalIngredient, Source, SourceCategory, Specificity } from "@/lib/domain/schemas";
import { importRecipeDraftSchema, type ImportRecipeDraft } from "@/lib/import/schema";
import { CategoryStep } from "@/app/(app)/importer/steps/CategoryStep";
import { RecipeDetailsStep } from "@/app/(app)/importer/steps/RecipeDetailsStep";
import { createEditCategoryAction, deleteRecipeAction, getEditCategoriesAction, updateRecipeAction } from "./editActions";

interface RecipeEditFormProps {
  recipeId: string;
  slug: string;
  initialDraft: ImportRecipeDraft;
  initialCategories: SourceCategory[];
  sources: Source[];
  canonicalIngredients: CanonicalIngredient[];
  specificities: Specificity[];
}

const selectClasses =
  "min-h-11 w-full min-w-0 max-w-md rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive";

export function RecipeEditForm({
  recipeId,
  slug,
  initialDraft,
  initialCategories,
  sources,
  canonicalIngredients,
  specificities,
}: RecipeEditFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [dirty, setDirty] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const validation = useMemo(() => importRecipeDraftSchema.safeParse(draft), [draft]);
  const validationErrors = validation.success ? [] : [...new Set(validation.error.issues.map((issue) => issue.message))];

  // Modifications non enregistrées : avertit avant une fermeture/rechargement
  // d'onglet (CLAUDE.md, jamais une perte de saisie silencieuse). Le clic
  // sur « Annuler » gère, lui, la navigation interne (voir `handleCancel`).
  useEffect(() => {
    if (!dirty) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function updateDraft(updater: (current: ImportRecipeDraft) => ImportRecipeDraft) {
    setDraft(updater);
    setDirty(true);
  }

  async function handleSourceChange(nextSourceId: string) {
    updateDraft((current) => ({ ...current, sourceId: nextSourceId, sourceCategoryId: null }));
    setCategories([]);
    setCategoriesError(null);
    setCategoriesLoading(true);
    try {
      setCategories(await getEditCategoriesAction(nextSourceId));
    } catch {
      setCategoriesError("Impossible de charger les catégories de cette entreprise. Réessayez.");
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function handleCreateCategory(name: string) {
    setCategoryError(null);
    setCategoryCreating(true);
    try {
      const category = await createEditCategoryAction(draft.sourceId, name);
      setCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
      updateDraft((current) => ({ ...current, sourceCategoryId: category.id }));
    } catch {
      setCategoryError("Impossible de créer cette catégorie. Réessayez.");
    } finally {
      setCategoryCreating(false);
    }
  }

  async function handleSave() {
    if (!validation.success || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const recipe = await updateRecipeAction({ recipeId, slug, draft: validation.data });
      setDirty(false);
      router.push(`/recettes/${recipe.slug}`);
    } catch {
      setSaveError("L'enregistrement a échoué. Vos modifications restent affichées, réessayez.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty && !window.confirm("Des modifications non enregistrées seront perdues. Continuer ?")) return;
    router.push(`/recettes/${slug}`);
  }

  async function handleConfirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { redirectTo } = await deleteRecipeAction({ recipeId, slug });
      router.push(redirectTo);
    } catch {
      setDeleteError("La suppression a échoué. La recette n'a pas été supprimée, réessayez.");
      setDeleting(false);
    }
  }

  function handleCancelDelete() {
    if (deleting) return;
    setDeleteDialogOpen(false);
    setDeleteError(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <EditorialTitle>Modifier la recette</EditorialTitle>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="edit-source" className="text-sm font-medium text-cacao">
            Entreprise ou source
          </label>
          <select
            id="edit-source"
            value={draft.sourceId}
            onChange={(event) => handleSourceChange(event.target.value)}
            className={selectClasses}
          >
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </div>

        {categoriesLoading && <LoadingState message="Chargement des catégories…" />}
        {categoriesError && <ErrorState message={categoriesError} onRetry={() => handleSourceChange(draft.sourceId)} />}
        {!categoriesLoading && !categoriesError && (
          <CategoryStep
            categories={categories}
            sourceCategoryId={draft.sourceCategoryId}
            onChange={(sourceCategoryId) => updateDraft((current) => ({ ...current, sourceCategoryId }))}
            onCreateCategory={handleCreateCategory}
            creating={categoryCreating}
            error={categoryError}
          />
        )}
      </Card>

      <RecipeDetailsStep
        draft={draft}
        canonicalIngredients={canonicalIngredients}
        specificities={specificities}
        allergens={[]}
        showAllergens={false}
        onChange={updateDraft}
      />

      {validationErrors.length > 0 && <ErrorState message={validationErrors.join(" ")} />}
      {saveError && <ErrorState message={saveError} />}

      <div className="flex flex-wrap justify-end gap-2 border-t border-grise pt-4">
        <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
          Annuler
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || !validation.success}>
          {saving ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t border-grise pt-4">
        <p className="text-sm font-medium text-brunrouge">Zone de suppression</p>
        <Button
          type="button"
          variant="danger"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          Supprimer cette recette
        </Button>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={`Supprimer définitivement « ${initialDraft.title} » ?`}
        description="Cette action est irréversible. La recette, ses préparations et ses données associées seront supprimées."
        confirmLabel="Supprimer définitivement"
        pendingLabel="Suppression…"
        pending={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}
