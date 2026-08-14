"use client";

import { useState } from "react";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { listDemoFixtures, type DemoFixtureId } from "@/lib/ai/import/fixtures";
import { runDemoExtraction, type DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import type { ImportFileRef } from "@/lib/import/schema";
import { PilotExtractionPanel } from "./PilotExtractionPanel";

const ACCEPTED_TYPES = "image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILES = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

interface FilesStepProps {
  files: ImportFileRef[];
  pastedText: string | null;
  onFilesChange: (files: ImportFileRef[]) => void;
  onPastedTextChange: (text: string | null) => void;
  /** Appelé une fois qu'un exemple de démonstration (D3) — ou une extraction réelle du pilote (lot G) — a été chargé et transformé en brouillon pré-rempli. */
  onDemoExampleLoaded: (draft: DemoExtractionDraft, providerName: string) => void;
  /** Clé OpenAI présente côté serveur — affiche les 3 emplacements du pilote réel (lot G, G2). */
  realExtractionAvailable: boolean;
  extractionModel: string;
}

/**
 * Étape 3 — fichiers, texte collé, ou exemple de démonstration (D1 + pont
 * D3). Aucun traitement réel du contenu des fichiers déposés par la
 * personne à cette tranche (pas d'OCR/extraction réelle branchée, aucun
 * appel payant) : seules les métadonnées sont conservées pour traçabilité,
 * la saisie reste manuelle à l'étape suivante. Les 3 exemples de
 * démonstration illustrent ce que l'extraction assistée produirait, mode
 * démonstration déterministe uniquement (aucune clé, aucun appel réseau).
 */
export function FilesStep({
  files,
  pastedText,
  onFilesChange,
  onPastedTextChange,
  onDemoExampleLoaded,
  realExtractionAvailable,
  extractionModel,
}: FilesStepProps) {
  const [loadingFixture, setLoadingFixture] = useState<DemoFixtureId | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const tooMany = files.length + selected.length > MAX_FILES;
    const oversized = selected.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (tooMany) {
      setError(`Trop de fichiers pour un même lot (maximum ${MAX_FILES}).`);
      return;
    }
    if (oversized.length > 0) {
      setError(`Fichier trop volumineux : ${oversized.map((file) => file.name).join(", ")} (limite 20 Mo).`);
      return;
    }
    setError(null);
    onFilesChange([
      ...files,
      ...selected.map((file) => ({ name: file.name, type: file.type, sizeBytes: file.size })),
    ]);
    event.target.value = "";
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  async function loadDemoExample(fixtureId: DemoFixtureId) {
    setError(null);
    setLoadingFixture(fixtureId);
    try {
      const draft = await runDemoExtraction(fixtureId);
      onDemoExampleLoaded(draft, "demo");
    } catch {
      setError("Le chargement de l'exemple de démonstration a échoué. Réessayez.");
    } finally {
      setLoadingFixture(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EditorialTitle as="h2">Fichiers ou texte source</EditorialTitle>
        <p className="text-sm text-cacao/70">
          Image, capture d&rsquo;écran, PDF, DOCX, ou texte collé directement — facultatif, la saisie manuelle seule
          est possible à l&rsquo;étape suivante.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="import-files" className="text-sm font-medium text-cacao">
          Ajouter un ou plusieurs fichiers
        </label>
        <input
          id="import-files"
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleFileInput}
          className="min-h-11 w-full rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-avoine file:px-3 file:py-2 file:text-cacao"
        />
        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-lg border border-grise bg-coquille px-3 py-2 text-sm text-cacao">
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="min-h-11 min-w-11 shrink-0 rounded-lg text-brunrouge underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="import-pasted-text" className="text-sm font-medium text-cacao">
          Ou coller le texte de la recette
        </label>
        <textarea
          id="import-pasted-text"
          value={pastedText ?? ""}
          onChange={(event) => onPastedTextChange(event.target.value || null)}
          rows={5}
          placeholder="Coller ici le texte tel qu'écrit dans la source…"
          className="w-full rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-grise p-3">
        <p className="text-sm font-medium text-cacao">
          Ou charger un exemple de démonstration (mode démo, aucun appel IA réel)
        </p>
        <div className="flex flex-wrap gap-2">
          {listDemoFixtures().map((fixture) => (
            <Button
              key={fixture.id}
              type="button"
              variant="secondary"
              onClick={() => loadDemoExample(fixture.id)}
              disabled={loadingFixture !== null}
            >
              {fixture.label}
            </Button>
          ))}
        </div>
        {loadingFixture && <LoadingState message="Chargement de l'exemple de démonstration…" />}
      </div>

      {realExtractionAvailable && (
        <PilotExtractionPanel extractionModel={extractionModel} onExtracted={onDemoExampleLoaded} />
      )}

      {error && <ErrorState message={error} />}
    </div>
  );
}
