"use client";

/**
 * Parcours d'import manuel (D1) — assistant en 5 étapes (source, catégorie,
 * fichiers/texte, informations + correction, vérification) + écran de
 * succès. Aucune sauvegarde automatique avant le clic explicite final sur
 * l'écran de vérification (CLAUDE.md, principe 8 : IA supervisée, jamais de
 * publication sans validation humaine). Les boutons « exemple de
 * démonstration » (mode démo local, sans clé ni réseau) ont été retirés de
 * l'interface de production — les fixtures restent disponibles pour le
 * développement (`src/lib/ai/import/fixtures.ts`), simplement plus
 * importées/affichées ici. L'extraction IA réelle (fournisseur OpenAI) sera
 * branchée dans ce parcours par K3-IMPORT, hors périmètre ici.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import type { SourceCategory } from "@/lib/domain/schemas";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import { importRecipeDraftSchema } from "@/lib/import/schema";
import type { ExtractionCompleteness } from "@/lib/ai/import/types";
import type { ImportDuplicateMatch } from "@/lib/import/store";
import {
  checkDuplicateAction,
  checkImportDuplicatesAction,
  createCategoryAction,
  createImportBatchAction,
  getCategoriesAction,
  getImportReferenceDataAction,
  saveImportRecipeAction,
  type ImportReferenceData,
  type SaveImportRecipeResult,
} from "./importActions";
import { createEmptyDraft } from "./draftFactory";
import { PENDING_NEW_SOURCE_ID, SourceStep } from "./steps/SourceStep";
import { CategoryStep } from "./steps/CategoryStep";
import { FilesStep } from "./steps/FilesStep";
import { RecipeDetailsStep } from "./steps/RecipeDetailsStep";
import { ReviewStep } from "./steps/ReviewStep";

const STEP_LABELS = ["Entreprise", "Catégorie", "Fichiers", "Informations", "Vérification"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

export function ImporterWizard() {
  const [step, setStep] = useState<Step>(0);
  const [reference, setReference] = useState<ImportReferenceData | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchAttempt, setBatchAttempt] = useState(0);
  const [sourceId, setSourceId] = useState<string | null>(null);
  /** `null` = panneau « + Nouvelle entreprise » fermé. Conservé pendant tout le parcours (D3, exigence explicite) même une fois l'étape 0 quittée. */
  const [newSourceName, setNewSourceName] = useState<string | null>(null);
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
  /** Différences K4 (titre autre entreprise, hash identique, préparation homonyme) — informatif uniquement, jamais bloquant. */
  const [importDuplicates, setImportDuplicates] = useState<ImportDuplicateMatch[]>([]);
  const [importDuplicatesError, setImportDuplicatesError] = useState<string | null>(null);

  const selectedSource = reference?.sources.find((source) => source.id === sourceId) ?? null;
  const selectedCategory = categories.find((category) => category.id === sourceCategoryId) ?? null;
  const isPendingNewSource = sourceId === PENDING_NEW_SOURCE_ID;
  const trimmedNewSourceName = newSourceName?.trim() ?? "";
  const sourceStepValid = sourceId !== null && (!isPendingNewSource || trimmedNewSourceName.length > 0);

  const validation = useMemo(() => (draft ? importRecipeDraftSchema.safeParse(draft) : null), [draft]);
  const validationErrors = validation && !validation.success ? [...new Set(validation.error.issues.map((i) => i.message))] : [];

  // Référentiels (sources, matières premières canoniques, spécificités,
  // allergènes) chargés une seule fois au montage — jamais un repli
  // silencieux vers la démo si Supabase est configuré et échoue (K1).
  useEffect(() => {
    let cancelled = false;
    getImportReferenceDataAction()
      .then((data) => {
        if (!cancelled) setReference(data);
      })
      .catch(() => {
        if (!cancelled) setReferenceError("Impossible de charger les référentiels (entreprises, matières premières, spécificités, allergènes). Réessayez.");
      });
    return () => {
      cancelled = true;
    };
  }, [referenceAttempt]);

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
    setNewSourceName(null);
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

  /** Ouvre le panneau « + Nouvelle entreprise ou source » — aucune écriture, seule la sélection en attente change (CLAUDE.md, création seulement à la confirmation finale). */
  function handleOpenNewSource() {
    setSourceId(PENDING_NEW_SOURCE_ID);
    setNewSourceName("");
    setSourceCategoryId(null);
    setCategories([]);
    setCategoriesError(null);
  }

  function handleCancelNewSource() {
    setNewSourceName(null);
    if (sourceId === PENDING_NEW_SOURCE_ID) {
      setSourceId(null);
      setSourceCategoryId(null);
      setCategories([]);
      setCategoriesError(null);
    }
  }

  /** Détection d'une entreprise déjà existante, insensible à la casse (D1) — la sélectionne au lieu de préparer une création en double. */
  function handleNewSourceNameChange(name: string) {
    setNewSourceName(name);
    const trimmed = name.trim();
    if (!trimmed) {
      setSourceId(PENDING_NEW_SOURCE_ID);
      setSourceCategoryId(null);
      setCategories([]);
      setCategoriesError(null);
      return;
    }
    const existing = reference?.sources.find((source) => source.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      void handleSourceChange(existing.id);
      return;
    }
    setSourceId(PENDING_NEW_SOURCE_ID);
    setSourceCategoryId(null);
    setCategories([]);
    setCategoriesError(null);
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
    // Pour une nouvelle entreprise en attente, `sourceId` vaut PENDING_NEW_SOURCE_ID
    // (pas un UUID valide, rejeté par `sourceSchema`) : un UUID local est généré
    // ici uniquement pour satisfaire la validation du brouillon et les
    // vérifications de doublon (qui ne trouveront jamais rien pour une entreprise
    // qui n'existe pas encore, ce qui est correct) — jamais transmis tel quel à
    // Supabase, remplacé par le vrai id à l'enregistrement final (`newSourceName`).
    const effectiveSourceId = sourceId === PENDING_NEW_SOURCE_ID ? crypto.randomUUID() : sourceId;
    const created = createEmptyDraft(effectiveSourceId);
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

    // K4 — différences purement informatives (titre autre entreprise, hash
    // de fichier identique, préparation homonyme) : jamais bloquantes,
    // jamais de fusion automatique. Un échec ici n'empêche pas
    // l'enregistrement (le blocage réel reste `checkDuplicateAction`
    // ci-dessus), mais reste affiché explicitement, jamais tu.
    try {
      const matches = await checkImportDuplicatesAction({
        title: current.title,
        sourceId: current.sourceId,
        sectionNames: current.sections.map((section) => section.name).filter((name): name is string => Boolean(name)),
      });
      setImportDuplicates(matches);
      setImportDuplicatesError(null);
    } catch {
      setImportDuplicates([]);
      setImportDuplicatesError("Impossible de vérifier les différences avec des recettes déjà enregistrées (titre autre entreprise, fichier déjà importé, préparation homonyme).");
    }
  }

  /** Seul point d'entrée vers l'étape 4 (vérification) : déclenche la vérification de doublon réelle à cet instant précis. */
  async function handleGoToReview() {
    if (!draft) return;
    goTo(4);
    await checkForDuplicate(draft);
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
        newSourceName: isPendingNewSource ? trimmedNewSourceName : null,
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
    setNewSourceName(null);
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
    setImportDuplicates([]);
    setImportDuplicatesError(null);
    // Le lot précédent est déjà marqué « terminé » côté serveur — un nouveau
    // lot est requis pour le prochain import, jamais réutilisé silencieusement.
    setBatchId(null);
    setBatchError(null);
    setBatchAttempt((n) => n + 1);
    // Recharge les référentiels : une entreprise créée pendant l'import qui
    // vient de se terminer doit apparaître dans la liste des sources dès le
    // prochain import (CLAUDE.md).
    setReference(null);
    setReferenceAttempt((n) => n + 1);
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
            <Link href={`/recettes/${saveResult.recipe.slug}`}>
              <Button type="button">Voir la fiche recette</Button>
            </Link>
            <Button type="button" variant="secondary" onClick={handleImportAnother}>
              Importer une autre recette
            </Button>
            <Link href="/recettes">
              <Button type="button" variant="secondary">
                Retour aux recettes
              </Button>
            </Link>
          </div>
          {/* K13 — proposition FACULTATIVE, jamais cochée/déclenchée
              automatiquement : simple lien vers la file des illustrations
              manquantes, aucune génération pendant l'import lui-même. Le
              nouvel ingrédient canonique éventuellement validé ci-dessus y
              apparaît déjà automatiquement (K6/K8, voir queue.ts). */}
          <p className="border-t border-grise pt-3 text-sm text-cacao/70">
            Facultatif —{" "}
            <Link href="/illustrations/manquantes" className="font-medium text-olive underline hover:text-olive/80">
              Créer une illustration
            </Link>{" "}
            pour cette recette ou ses matières premières. Vous pouvez aussi y revenir plus tard depuis la fiche
            recette ou depuis <Link href="/illustrations" className="underline hover:text-olive/80">Illustrations</Link>.
          </p>
        </Card>
      </div>
    );
  }

  if (referenceError) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Importer" }]} />
        <ErrorState
          message={referenceError}
          onRetry={() => {
            setReferenceError(null);
            setReferenceAttempt((n) => n + 1);
          }}
        />
      </div>
    );
  }

  if (!reference) {
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Importer" }]} />
        <LoadingState message="Chargement des référentiels…" />
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

      {step === 0 && (
        <SourceStep
          sources={reference.sources}
          sourceId={sourceId}
          onChange={handleSourceChange}
          newSourceName={newSourceName}
          onOpenNewSource={handleOpenNewSource}
          onNewSourceNameChange={handleNewSourceNameChange}
          onCancelNewSource={handleCancelNewSource}
        />
      )}

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
              canCreateCategory={!isPendingNewSource}
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
          importBatchId={batchId}
        />
      )}

      {step === 3 && draft && (
        <RecipeDetailsStep
          draft={draft}
          canonicalIngredients={reference.canonicalIngredients}
          specificities={reference.specificities}
          allergens={reference.allergens}
          onChange={(updater) => setDraft((d) => (d ? updater(d) : d))}
        />
      )}

      {step === 4 && draft && (
        <ReviewStep
          draft={draft}
          canonicalIngredients={reference.canonicalIngredients}
          specificities={reference.specificities}
          allergens={reference.allergens}
          sourceName={selectedSource?.name || (isPendingNewSource ? trimmedNewSourceName : "") || "À vérifier"}
          categoryName={selectedCategory?.name ?? null}
          validationErrors={validationErrors}
          duplicate={duplicate}
          acknowledgeDuplicate={acknowledgeDuplicate}
          onAcknowledgeDuplicateChange={setAcknowledgeDuplicate}
          duplicateChecking={duplicateChecking}
          duplicateCheckError={duplicateCheckError}
          onRetryDuplicateCheck={() => checkForDuplicate(draft)}
          importDuplicates={importDuplicates}
          importDuplicatesError={importDuplicatesError}
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
          <Button type="button" disabled={!sourceStepValid} onClick={() => goTo(1)}>
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
