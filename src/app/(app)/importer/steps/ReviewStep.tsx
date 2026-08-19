"use client";

import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import type { Allergen, CanonicalIngredient, Specificity } from "@/lib/domain/schemas";
import type { ExtractionCompleteness } from "@/lib/ai/import/types";
import type { ImportRecipeDraft } from "@/lib/import/schema";
import type { ImportDuplicateMatch } from "@/lib/import/store";

/** Libellé humain par nature de différence K4 — jamais un identifiant technique affiché tel quel. */
const IMPORT_DUPLICATE_LABEL: Record<ImportDuplicateMatch["kind"], string> = {
  same_title_same_source: "Même titre, même entreprise",
  same_title_other_source: "Même titre dans une autre entreprise",
  same_file_hash: "Fichier source déjà importé (contenu identique)",
  homonymous_preparation: "Préparation du même nom déjà utilisée ailleurs",
};

interface ReviewStepProps {
  draft: ImportRecipeDraft;
  canonicalIngredients: CanonicalIngredient[];
  specificities: Specificity[];
  allergens: Allergen[];
  sourceName: string;
  categoryName: string | null;
  validationErrors: string[];
  duplicate: { title: string; sourceId: string } | null;
  acknowledgeDuplicate: boolean;
  onAcknowledgeDuplicateChange: (value: boolean) => void;
  /** Vrai pendant la vérification réelle de doublon (Server Action) — l'enregistrement reste bloqué jusqu'à son terme (CLAUDE.md, jamais à l'aveugle). */
  duplicateChecking: boolean;
  /** Échec explicite de la vérification de doublon — jamais traité comme « aucun doublon trouvé ». */
  duplicateCheckError: string | null;
  /** Relance la vérification de doublon après un échec (action utilisatrice explicite, jamais une relance automatique). */
  onRetryDuplicateCheck: () => void;
  /** Différences K4 au-delà du cas déjà bloquant ci-dessus — jamais bloquantes, jamais de fusion automatique, purement informatives. */
  importDuplicates: ImportDuplicateMatch[];
  /** Échec explicite de la vérification étendue (K4) — n'empêche pas l'enregistrement (déjà décidé par `duplicate` ci-dessus), affiché tout de même, jamais tu. */
  importDuplicatesError: string | null;
  /** Contrôle de complétude de l'extraction IA réelle (lot G) — `null` en saisie manuelle ou en mode démonstration classique. */
  completeness: ExtractionCompleteness | null;
  acknowledgeIncomplete: boolean;
  onAcknowledgeIncompleteChange: (value: boolean) => void;
  saveError: string | null;
}

/**
 * Étape 5 — écran de vérification récapitulatif (D1). Aucune section vide
 * affichée : chaque bloc facultatif ne se rend que si la donnée existe
 * (CLAUDE.md, principe 2). L'enregistrement réel n'a lieu qu'après le clic
 * explicite porté par `ImporterWizard` (ce composant reste un aperçu
 * jamais auto-soumis).
 */
export function ReviewStep({
  draft,
  canonicalIngredients,
  specificities,
  allergens,
  sourceName,
  categoryName,
  validationErrors,
  duplicate,
  acknowledgeDuplicate,
  onAcknowledgeDuplicateChange,
  duplicateChecking,
  duplicateCheckError,
  onRetryDuplicateCheck,
  importDuplicates,
  importDuplicatesError,
  completeness,
  acknowledgeIncomplete,
  onAcknowledgeIncompleteChange,
  saveError,
}: ReviewStepProps) {
  const canonicalById = new Map(canonicalIngredients.map((c) => [c.id, c]));
  const hasAdditional = Boolean(draft.additionalInformation || draft.procedure || draft.temperature);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EditorialTitle as="h2">Vérification avant enregistrement</EditorialTitle>
        <p className="text-sm text-cacao/70">Original et proposition, champs incertains mis en évidence.</p>
      </div>

      {validationErrors.length > 0 && (
        <ErrorState message={`Corrigez avant de continuer : ${validationErrors.join(" · ")}`} />
      )}

      {duplicateChecking && <LoadingState message="Vérification des doublons…" />}

      {!duplicateChecking && duplicateCheckError && (
        <ErrorState message={duplicateCheckError} onRetry={onRetryDuplicateCheck} />
      )}

      {!duplicateChecking && duplicate && (
        <Card className="flex flex-col gap-3 border-brunrouge/40 bg-brunrouge/10">
          <p className="font-medium text-brunrouge">
            Une recette « {duplicate.title} » existe déjà pour cette entreprise. Enregistrer quand même créera une
            deuxième recette distincte.
          </p>
          <label className="flex min-h-11 items-center gap-2 text-sm text-cacao">
            <input
              type="checkbox"
              checked={acknowledgeDuplicate}
              onChange={(event) => onAcknowledgeDuplicateChange(event.target.checked)}
              className="h-5 w-5"
            />
            Je confirme vouloir enregistrer quand même, en connaissance de ce doublon probable.
          </label>
        </Card>
      )}

      {importDuplicatesError && <ErrorState message={importDuplicatesError} />}

      {importDuplicates.length > 0 && (
        <Card className="flex flex-col gap-2 border-avoine bg-avoine/30">
          <p className="text-sm font-medium text-cacao">
            Différences trouvées avec des recettes déjà enregistrées — à vérifier, aucune fusion automatique.
          </p>
          <ul className="flex flex-col gap-1">
            {importDuplicates.map((match, index) => (
              <li key={index} className="text-sm text-cacao">
                {IMPORT_DUPLICATE_LABEL[match.kind]}
                {match.recipeTitle ? ` — « ${match.recipeTitle} »` : ""}
                {match.sectionName ? ` (préparation « ${match.sectionName} »)` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {completeness && (
        <Card className={`flex flex-col gap-2 ${completeness.status !== "complete" ? "border-brunrouge/40 bg-brunrouge/10" : ""}`}>
          <p className="text-sm font-medium text-cacao">
            {completeness.detectedPreparationTitles.length} préparation{completeness.detectedPreparationTitles.length > 1 ? "s" : ""} détectée
            {completeness.detectedPreparationTitles.length > 1 ? "s" : ""} — {completeness.extractedPreparationTitles.length} préparation
            {completeness.extractedPreparationTitles.length > 1 ? "s" : ""} extraite{completeness.extractedPreparationTitles.length > 1 ? "s" : ""}
          </p>
          {completeness.status !== "complete" && (
            <>
              <p className="font-medium text-brunrouge">Extraction potentiellement incomplète</p>
              {completeness.missingOrUnclearSections.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-brunrouge">
                  {completeness.missingOrUnclearSections.map((section, index) => (
                    <li key={index}>{section}</li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-cacao/70">
                Complétez manuellement ci-dessus (« Ajouter une préparation »), ou revenez à l&rsquo;étape Fichiers pour une nouvelle
                extraction explicitement demandée.
              </p>
              <label className="flex min-h-11 items-center gap-2 text-sm text-cacao">
                <input
                  type="checkbox"
                  checked={acknowledgeIncomplete}
                  onChange={(event) => onAcknowledgeIncompleteChange(event.target.checked)}
                  className="h-5 w-5"
                />
                Je confirme avoir vérifié et complété manuellement malgré cette extraction potentiellement incomplète.
              </label>
            </>
          )}
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <EditorialTitle as="h2">{draft.title}</EditorialTitle>
        <p className="text-sm text-cacao/70">
          {sourceName}
          {categoryName ? ` · ${categoryName}` : ""}
        </p>
      </Card>

      {draft.warnings.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cacao">Avertissements</p>
          <ul className="flex flex-col gap-1">
            {draft.warnings.map((warning, index) => (
              <li key={index} className="text-sm text-brunrouge">
                {warning}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {draft.sections.map((section) => (
          <Card key={section.id} className="flex flex-col gap-2">
            {section.name && <EditorialTitle as="h2">{section.name}</EditorialTitle>}
            <ul className="flex flex-col divide-y divide-grise">
              {section.ingredients.map((ingredient) => {
                const canonical = ingredient.canonicalIngredientId ? canonicalById.get(ingredient.canonicalIngredientId) : null;
                const needsReview = ingredient.verificationStatus === "needs_review";
                return (
                  <li key={ingredient.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-cacao">
                      {ingredient.originalName}
                      {canonical && <span className="ml-2 text-cacao/60">→ {canonical.name}</span>}
                    </span>
                    {needsReview ? (
                      <Badge>À vérifier</Badge>
                    ) : (
                      <span className="tabular-nums text-cacao">
                        {ingredient.originalQuantityText ?? "—"}
                        {ingredient.unit ? ` ${ingredient.unit}` : ""}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>

      {draft.proposedKeyIngredients.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cacao">Matières premières principales</p>
          <div className="flex flex-wrap gap-2 text-sm text-cacao">
            {draft.proposedKeyIngredients.map((tag, index) => (
              <span
                key={tag.kind === "existing" ? tag.canonicalIngredientId : `new-${index}`}
                className="flex items-center gap-1.5 rounded-full border border-grise bg-avoine px-2.5 py-1"
              >
                {tag.name}
                {tag.kind === "new" && <Badge className="px-1.5 py-0.5 text-xs">Nouvelle matière première proposée</Badge>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {draft.allergens.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cacao">Allergènes détectés</p>
          <div className="flex flex-wrap gap-2 text-sm text-cacao">
            {draft.allergens.map((entry) => {
              const allergen = allergens.find((a) => a.id === entry.allergenId);
              return (
                <span key={entry.allergenId} className="rounded-full border border-grise bg-avoine px-2.5 py-1">
                  {allergen?.name} ({entry.status === "confirmed" ? "confirmé" : "à vérifier"})
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {draft.specificities.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cacao">Spécificités</p>
          <div className="flex flex-wrap gap-2 text-sm text-cacao">
            {draft.specificities.map((entry) => {
              const specificity = specificities.find((s) => s.id === entry.specificityId);
              return (
                <span key={entry.specificityId} className="rounded-full border border-grise bg-avoine px-2.5 py-1">
                  {specificity?.name} ({entry.status === "confirmed" ? "confirmé" : entry.status === "rejected" ? "rejeté" : "à vérifier"})
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {hasAdditional && (
        <Card className="flex flex-col gap-2 whitespace-pre-line text-cacao">
          <p className="text-sm font-medium text-cacao">Informations complémentaires</p>
          {draft.procedure && <p>Procédé : {draft.procedure}</p>}
          {draft.temperature && <p>Température : {draft.temperature}</p>}
          {draft.additionalInformation && <p>{draft.additionalInformation}</p>}
        </Card>
      )}

      {draft.originalFiles.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-medium text-cacao">Fichiers d&rsquo;origine</p>
          <ul className="text-sm text-cacao/80">
            {draft.originalFiles.map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </Card>
      )}

      {saveError && <ErrorState message={saveError} />}
    </div>
  );
}
