"use client";

/**
 * Parcours d'import manuel (D1) — assistant en 5 étapes (source, catégorie,
 * fichiers/texte, informations + correction, vérification) + écran de
 * succès. Aucune sauvegarde automatique avant le clic explicite final sur
 * l'écran de vérification (CLAUDE.md, principe 8 : IA supervisée, jamais de
 * publication sans validation humaine). Entièrement utilisable sans
 * fournisseur IA configuré : les 3 boutons « exemple de démonstration »
 * n'appellent qu'un adaptateur local déterministe (`src/lib/ai/import`),
 * jamais un réseau ni une clé. L'extraction IA réelle (fournisseur OpenAI)
 * sera branchée dans ce parcours par K3-IMPORT, hors périmètre ici.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { getSources } from "@/lib/data/sources";
import type { SourceCategory } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import { importRecipeDraftSchema } from "@/lib/import/schema";
import type { DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import type { ExtractionCompleteness } from "@/lib/ai/import/types";
import {
  checkDuplicateAction,
  createCategoryAction,
  createImportBatchAction,
  getCategoriesAction,
  saveImportRecipeAction,
  type SaveImportRecipeResult,
} from "./importActions";
import { createEmptyDraft } from "./draftFactory";
import { SourceStep } from "./steps/SourceStep";
import { CategoryStep } from "./steps/CategoryStep";
import { FilesStep } from "./steps/FilesStep";
import { RecipeDetailsStep } from "./steps/RecipeDetailsStep";
import { ReviewStep } from "./steps/ReviewStep";

const STEP_LABELS = ["Entreprise", "Catégorie", "Fichiers", "Informations", "Vérification"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

function applyDemoExtraction(draft: ImportRecipeDraft, extracted: DemoExtractionDraft): ImportRecipeDraft {
  return {
    ...draft,
    title: extracted.title,
    procedure: extracted.procedure,
    temperature: extracted.temperature,
    additionalInformation: extracted.additionalInformation,
    sections: extracted.sections,
    specificities: extracted.specificities,
    allergens: extracted.allergens,
    originalFiles: [...draft.originalFiles, ...extracted.originalFiles],
    warnings: extracted.warnings,
  };
}

export function ImporterWizard() {
  const sources = getSources();

  const [step, setStep] = useState<Step>(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchAttempt, setBatchAttempt] = useState(0);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [categoryCreating, setCategoryCreating] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ImportRecipeDraft | null>(null);
  const [providerName, setProviderName] = useState("manual");
  const [rawExtraction, setRawExtraction] = useState<unknown>(null);
  const [acknowledgeDuplicate, setAcknowledgeDuplicate] = useState(false);
  const [completeness, setCompleteness] = useState<ExtractionCompleteness | null>(null);
  const [acknowledgeIncomplete, setAcknowledgeIncomplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<SaveImportRecipeResult | null>(null);
  const [duplicate, setDuplicate] = useState<{ title: string; sourceId: string } | null>(null);
  const [duplicateChecking, setDuplicateChecking] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState<string | null>(null);

  const selectedSource = sources.find((source) => source.id === sourceId) ?? null;
  const selectedCategory = categories.find((category) => category.id === sourceCategoryId) ?? null;

  const validation = useMemo(() => (draft ? importRecipeDraftSchema.safeParse(draft) : null), [draft]);
  const validationErrors = validation && !validation.success ? [...new Set(validation.error.issues.map((i) => i.message))] : [];

  // Le lot d'import doit exister côté serveur avant tout enregistrement —
  // créé une seule fois au montage, jamais recréé silencieusement (un échec
  // bloque explicitement le parcours, voir le rendu d'erreur plus bas).
  useEffect(() => {
    let cancelled = false;
    createImportBatchAction()
      .then((batch) => {
        if (!cancelled) setBatchId(batch.id);
      })
      .catch(() => {
        if (!cancelled) setBatchError("Impossible de démarrer l'import (connexion au serveur). Réessayez.");
      });
    return () => {
      cancelled = true;
    };
  }, [batchAttempt]);

  function goTo(next: Step) {
    setStep(next);
  }

  async function handleSourceChange(nextSourceId: string) {
    setSourceId(nextSourceId);
    setSourceCategoryId(null);
    setCategories([]);
    setCategoriesError(null);
    setCategoriesLoading(true);
    try {
      const result = await getCategoriesAction(nextSourceId);
      setCategories(result);
    } catch {
      setCategoriesError("Impossible de charger les catégories de cette entreprise. Réessayez.");
    } finally {
      setCategoriesLoading(false);
    }
  }

  async function handleCreateCategory(name: string) {
    if (!sourceId) return;
    setCategoryError(null);
    setCategoryCreating(true);
    try {
      const category = await createCategoryAction(sourceId, name);
      setCategories((prev) => (prev.some((c) => c.id === category.id) ? prev : [...prev, category]));
      setSourceCategoryId(category.id);
    } catch {
      setCategoryError("Impossible de créer cette catégorie. Réessayez.");
    } finally {
      setCategoryCreating(false);
    }
  }

  function ensureDraft(): ImportRecipeDraft {
    if (draft) return draft;
    if (!sourceId) throw new Error("Source non sélectionnée.");
    const created = createEmptyDraft(sourceId);
    const withCategory = { ...created, sourceCategoryId };
    setDraft(withCategory);
    return withCategory;
  }

  function handleGoToFiles() {
    ensureDraft();
    goTo(2);
  }

  function handleGoToDetails() {
    ensureDraft();
    goTo(3);
  }

  /** Jamais un repli silencieux vers « aucun doublon » en cas d'échec réseau (CLAUDE.md) — réutilisée à l'entrée de l'étape 4 et pour une nouvelle tentative explicite depuis `ReviewStep`. */
  async function checkForDuplicate(current: ImportRecipeDraft) {
    setDuplicateChecking(true);
    try {
      const result = await checkDuplicateAction(current.title, current.sourceId);
      setDuplicate(result);
      setDuplicateCheckError(null);
    } catch {
      setDuplicateCheckError("Impossible de vérifier les doublons. Réessayez avant d'enregistrer.");
    } finally {
      setDuplicateChecking(false);
    }
  }

  /** Seul point d'entrée vers l'étape 4 (vérification) : déclenche la vérification de doublon réelle à cet instant précis. */
  async function handleGoToReview() {
    if (!draft) return;
    goTo(4);
    await checkForDuplicate(draft);
  }

  function handleDemoExampleLoaded(extracted: DemoExtractionDraft, provider: string) {
    const base = ensureDraft();
    setDraft(applyDemoExtraction(base, extracted));
    setProviderName(provider);
    setRawExtraction(extracted);
    setCompleteness(extracted.completeness);
    setAcknowledgeIncomplete(false);
    goTo(3);
  }

  async function handleConfirmSave() {
    if (!draft || !validation?.success || !batchId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveImportRecipeAction({
        batchId,
        draft: validation.data,
        rawExtraction,
        providerName,
        acknowledgeDuplicate,
      });
      if (result.status === "duplicate") {
        // Le doublon est déjà affiché par ReviewStep ; rien d'autre à faire
        // ici, l'enregistrement reste bloqué tant que la case n'est pas cochée.
        return;
      }
      setSaveResult(result);
    } catch {
      setSaveError("L'enregistrement a échoué. Vos saisies restent affichées, réessayez.");
    } finally {
      setSaving(false);
    }
  }

  function handleImportAnother() {
    setStep(0);
    setSourceId(null);
    setSourceCategoryId(null);
    setCategories([]);
    setCategoriesError(null);
    setCategoryError(null);
    setDraft(null);
    setProviderName("manual");
    setRawExtraction(null);
    setAcknowledgeDuplicate(false);
    setCompleteness(null);
    setAcknowledgeIncomplete(false);
    setSaveError(null);
    setSaveResult(null);
    setDuplicate(null);
    setDuplicateCheckError(null);
    // Le lot précédent est déjà marqué « terminé » côté serveur — un nouveau
    // lot est requis pour le prochain import, jamais réutilisé silencieusement.
    setBatchId(null);
    setBatchError(null);
    setBatchAttempt((n) => n + 1);
  }

  if (saveResult && (saveResult.status === "saved" || saveResult.status === "already_saved")) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Importer" }]} />
        <Card className="flex flex-col gap-3">
          <EditorialTitle>Recette enregistrée</EditorialTitle>
          <p className="text-cacao">
            « {saveResult.recipe.title} » a bien été enregistrée
            {saveResult.status === "already_saved" ? " (déjà enregistrée précédemment — aucun doublon créé)" : ""}. Elle
            reste marquée « à vérifier » sur les champs proposés tant qu&rsquo;ils ne sont pas confirmés.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleImportAnother}>
              Importer une autre recette
            </Button>
            <Link href="/recettes">
              <Button type="button" variant="secondary">
                Retour aux recettes
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (batchError) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Importer" }]} />
        <ErrorState
          message={batchError}
          onRetry={() => {
            setBatchError(null);
            setBatchAttempt((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (!batchId) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Importer" }]} />
        <LoadingState message="Préparation de l'import…" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Importer" }]} />

      <div>
        <EditorialTitle>Importer une recette</EditorialTitle>
        <p aria-live="polite" className="text-sm text-cacao/70">
          Étape {step + 1} sur {STEP_LABELS.length} — {STEP_LABELS[step]}
        </p>
      </div>

      {step === 0 && <SourceStep sourceId={sourceId} onChange={handleSourceChange} />}

      {step === 1 && sourceId && (
        <>
          {categoriesLoading && <LoadingState message="Chargement des catégories…" />}
          {categoriesError && <ErrorState message={categoriesError} onRetry={() => handleSourceChange(sourceId)} />}
          {!categoriesLoading && !categoriesError && (
            <CategoryStep
              categories={categories}
              sourceCategoryId={sourceCategoryId}
              onChange={setSourceCategoryId}
              onCreateCategory={handleCreateCategory}
              creating={categoryCreating}
              error={categoryError}
            />
          )}
        </>
      )}

      {step === 2 && draft && (
        <FilesStep
          files={draft.originalFiles}
          pastedText={draft.pastedText}
          onFilesChange={(files) => setDraft((d) => (d ? { ...d, originalFiles: files } : d))}
          onPastedTextChange={(text) => setDraft((d) => (d ? { ...d, pastedText: text } : d))}
          onDemoExampleLoaded={handleDemoExampleLoaded}
          importBatchId={batchId}
        />
      )}

      {step === 3 && draft && (
        <RecipeDetailsStep draft={draft} onChange={(updater) => setDraft((d) => (d ? updater(d) : d))} />
      )}

      {step === 4 && draft && (
        <ReviewStep
          draft={draft}
          sourceName={selectedSource?.name ?? "À vérifier"}
          categoryName={selectedCategory?.name ?? null}
          validationErrors={validationErrors}
          duplicate={duplicate}
          acknowledgeDuplicate={acknowledgeDuplicate}
          onAcknowledgeDuplicateChange={setAcknowledgeDuplicate}
          duplicateChecking={duplicateChecking}
          duplicateCheckError={duplicateCheckError}
          onRetryDuplicateCheck={() => checkForDuplicate(draft)}
          completeness={completeness}
          acknowledgeIncomplete={acknowledgeIncomplete}
          onAcknowledgeIncompleteChange={setAcknowledgeIncomplete}
          saveError={saveError}
        />
      )}

      <div className="flex flex-wrap justify-between gap-2 border-t border-grise pt-4">
        <Button type="button" variant="secondary" disabled={step === 0} onClick={() => goTo((step - 1) as Step)}>
          Précédent
        </Button>

        {step === 0 && (
          <Button type="button" disabled={!sourceId} onClick={() => goTo(1)}>
            Suivant
          </Button>
        )}
        {step === 1 && (
          <Button type="button" onClick={handleGoToFiles}>
            Suivant
          </Button>
        )}
        {step === 2 && (
          <Button type="button" onClick={handleGoToDetails}>
            Suivant
          </Button>
        )}
        {step === 3 && (
          <Button type="button" onClick={handleGoToReview}>
            Vérifier
          </Button>
        )}
        {step === 4 && (
          <Button
            type="button"
            onClick={handleConfirmSave}
            disabled={
              saving ||
              duplicateChecking ||
              duplicateCheckError !== null ||
              validationErrors.length > 0 ||
              (duplicate !== null && !acknowledgeDuplicate) ||
              (completeness !== null && completeness.status !== "complete" && !acknowledgeIncomplete)
            }
          >
            {saving ? "Enregistrement…" : duplicateChecking ? "Vérification…" : "Enregistrer la recette"}
          </Button>
        )}
      </div>
    </div>
  );
}
