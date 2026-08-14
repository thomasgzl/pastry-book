"use client";

/**
 * Parcours d'import manuel (D1) — assistant en 5 étapes (source, catégorie,
 * fichiers/texte, informations + correction, vérification) + écran de
 * succès. Aucune sauvegarde automatique avant le clic explicite final sur
 * l'écran de vérification (CLAUDE.md, principe 8 : IA supervisée, jamais de
 * publication sans validation humaine). Entièrement utilisable sans
 * fournisseur IA configuré : les 3 boutons « exemple de démonstration »
 * n'appellent qu'un adaptateur local déterministe (`src/lib/ai/import`),
 * jamais un réseau ni une clé.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Card } from "@/components/ui/Card";
import { getSources } from "@/lib/data/sources";
import type { SourceCategory } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import { importRecipeDraftSchema } from "@/lib/import/schema";
import type { DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import {
  checkDuplicate,
  createImportBatch,
  createLocalCategory,
  getCategoriesForSourceIncludingSession,
  saveImportRecipe,
  type SaveImportRecipeResult,
} from "@/lib/import/store";
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
  const [batchId] = useState(() => createImportBatch().id);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceCategoryId, setSourceCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<SourceCategory[]>([]);
  const [draft, setDraft] = useState<ImportRecipeDraft | null>(null);
  const [providerName, setProviderName] = useState("manual");
  const [rawExtraction, setRawExtraction] = useState<unknown>(null);
  const [acknowledgeDuplicate, setAcknowledgeDuplicate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<SaveImportRecipeResult | null>(null);

  const selectedSource = sources.find((source) => source.id === sourceId) ?? null;
  const selectedCategory = categories.find((category) => category.id === sourceCategoryId) ?? null;

  const validation = useMemo(() => (draft ? importRecipeDraftSchema.safeParse(draft) : null), [draft]);
  const validationErrors = validation && !validation.success ? [...new Set(validation.error.issues.map((i) => i.message))] : [];
  const duplicate = draft ? checkDuplicate(draft.title, draft.sourceId) : null;

  function goTo(next: Step) {
    setStep(next);
  }

  function handleSourceChange(nextSourceId: string) {
    setSourceId(nextSourceId);
    setSourceCategoryId(null);
    setCategories(getCategoriesForSourceIncludingSession(nextSourceId));
  }

  function handleCreateCategory(name: string) {
    if (!sourceId) return;
    const category = createLocalCategory(sourceId, name);
    setCategories(getCategoriesForSourceIncludingSession(sourceId));
    setSourceCategoryId(category.id);
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

  function handleDemoExampleLoaded(extracted: DemoExtractionDraft, provider: string) {
    const base = ensureDraft();
    setDraft(applyDemoExtraction(base, extracted));
    setProviderName(provider);
    setRawExtraction(extracted);
    goTo(3);
  }

  async function handleConfirmSave() {
    if (!draft || !validation?.success) return;
    setSaving(true);
    setSaveError(null);
    try {
      const result = saveImportRecipe({
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
    setDraft(null);
    setProviderName("manual");
    setRawExtraction(null);
    setAcknowledgeDuplicate(false);
    setSaveError(null);
    setSaveResult(null);
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
        <CategoryStep
          categories={categories}
          sourceCategoryId={sourceCategoryId}
          onChange={setSourceCategoryId}
          onCreateCategory={handleCreateCategory}
        />
      )}

      {step === 2 && draft && (
        <FilesStep
          files={draft.originalFiles}
          pastedText={draft.pastedText}
          onFilesChange={(files) => setDraft((d) => (d ? { ...d, originalFiles: files } : d))}
          onPastedTextChange={(text) => setDraft((d) => (d ? { ...d, pastedText: text } : d))}
          onDemoExampleLoaded={handleDemoExampleLoaded}
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
          <Button type="button" onClick={() => goTo(4)}>
            Vérifier
          </Button>
        )}
        {step === 4 && (
          <Button
            type="button"
            onClick={handleConfirmSave}
            disabled={saving || validationErrors.length > 0 || (duplicate !== null && !acknowledgeDuplicate)}
          >
            {saving ? "Enregistrement…" : "Enregistrer la recette"}
          </Button>
        )}
      </div>
    </div>
  );
}
