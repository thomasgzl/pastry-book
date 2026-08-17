"use client";

import { useEffect, useState } from "react";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { listDemoFixtures, type DemoFixtureId } from "@/lib/ai/import/fixtures";
import type { DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import type { ImportFileRef } from "@/lib/import/schema";
import { MAX_SOURCE_FILE_SIZE_BYTES, uploadSourceFile } from "@/lib/import/sourceUpload";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { runDemoExtractionAction } from "../importActions";

const ACCEPTED_TYPES = "image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_FILES = 10;
/** Alignée sur la vraie limite du bucket Storage (`recipe-sources`, K3-DATA) — jamais une valeur locale divergente qui laisserait passer un fichier rejeté ensuite à l'upload. */
const MAX_FILE_SIZE_BYTES = MAX_SOURCE_FILE_SIZE_BYTES;
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE_BYTES / (1024 * 1024);

/** Étiquette courte sans aperçu image (PDF/DOCX/type non reconnu) — jamais un aperçu visuel inventé. */
function fileKindLabel(type: string): string {
  if (type === "application/pdf") return "PDF";
  if (type.includes("wordprocessingml")) return "DOCX";
  if (type.startsWith("image/")) return "Image";
  return "Fichier";
}

interface FilesStepProps {
  files: ImportFileRef[];
  pastedText: string | null;
  onFilesChange: (files: ImportFileRef[]) => void;
  onPastedTextChange: (text: string | null) => void;
  /** Appelé une fois qu'un exemple de démonstration (D3) a été chargé et transformé en brouillon pré-rempli. L'extraction IA réelle est branchée séparément (K3-IMPORT). */
  onDemoExampleLoaded: (draft: DemoExtractionDraft, providerName: string) => void;
  /** Lot d'import déjà créé côté serveur — préfixe du chemin Storage (I6). */
  importBatchId: string;
}

/**
 * Étape 3 — fichiers, texte collé, ou exemple de démonstration (D1 + pont
 * D3). Aucun traitement IA du contenu des fichiers déposés ici (pas d'OCR/
 * extraction branchée sur ce champ, aucun appel payant) : la saisie reste
 * manuelle à l'étape suivante. Le fichier ORIGINAL est en revanche archivé
 * directement du navigateur vers le bucket privé `recipe-sources` dès la
 * sélection (I6, `@/lib/import/sourceUpload`) — traçabilité de la source,
 * jamais un traitement de son contenu. Les 3 exemples de démonstration
 * illustrent ce que l'extraction assistée produirait, mode démonstration
 * déterministe uniquement (aucune clé, aucun appel réseau).
 */
export function FilesStep({
  files,
  pastedText,
  onFilesChange,
  onPastedTextChange,
  onDemoExampleLoaded,
  importBatchId,
}: FilesStepProps) {
  const [loadingFixture, setLoadingFixture] = useState<DemoFixtureId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  /**
   * Aperçu local (objets URL navigateur, images uniquement) — jamais
   * persisté ni envoyé au serveur, toujours dans le même ordre que `files`
   * (réordonné/retiré en même temps que la liste réelle). `null` pour les
   * fichiers sans aperçu visuel possible (PDF, DOCX).
   * ponytail: reconstruit à partir de l'objet `File` réel au moment de
   * l'ajout, donc perdu si ce composant démonte/remonte (retour à une étape
   * précédente puis retour ici) — `ImportFileRef` ne conserve pas l'objet
   * `File` binaire. Repli sur l'étiquette de type (PDF/DOCX/Image) dans ce
   * cas, jamais une erreur ; à revoir seulement si ça gêne réellement en usage.
   */
  const [previewUrls, setPreviewUrls] = useState<(string | null)[]>([]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- révocation à la destruction du composant uniquement, pas à chaque changement d'aperçu.
  }, []);

  /**
   * Upload direct navigateur → bucket privé `recipe-sources` (I6) pour
   * chaque fichier ajouté ici — le fichier ORIGINAL, jamais transformé. Sans
   * effet en mode démonstration sans Supabase configuré (`sourceFileUrl`
   * reste `null`, jamais une URL fictive). Un échec d'archivage n'empêche
   * jamais d'ajouter le fichier à la liste : la saisie manuelle qui suit
   * reste possible, seul le rappel de traçabilité est perdu pour ce fichier.
   */
  async function handleFileInput(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const tooMany = files.length + selected.length > MAX_FILES;
    const oversized = selected.filter((file) => file.size > MAX_FILE_SIZE_BYTES);

    if (tooMany) {
      setError(`Trop de fichiers pour un même lot (maximum ${MAX_FILES}).`);
      return;
    }
    if (oversized.length > 0) {
      setError(
        `Fichier trop volumineux : ${oversized.map((file) => file.name).join(", ")} (limite ${MAX_FILE_SIZE_MB} Mo).`,
      );
      return;
    }
    setError(null);
    event.target.value = "";

    // Aperçu local avant tout envoi réseau — images uniquement, jamais un aperçu inventé pour PDF/DOCX.
    const newPreviews = selected.map((file) => (file.type.startsWith("image/") ? URL.createObjectURL(file) : null));

    if (!hasSupabaseConfig()) {
      onFilesChange([
        ...files,
        ...selected.map((file) => ({ name: file.name, type: file.type, sizeBytes: file.size, sourceFileUrl: null })),
      ]);
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
      return;
    }

    setUploading(true);
    const archiveFailures: string[] = [];
    const uploaded: ImportFileRef[] = await Promise.all(
      selected.map(async (file) => {
        try {
          const { path } = await uploadSourceFile(importBatchId, file);
          return { name: file.name, type: file.type, sizeBytes: file.size, sourceFileUrl: path };
        } catch (err) {
          archiveFailures.push(err instanceof Error ? `${file.name} (${err.message})` : file.name);
          return { name: file.name, type: file.type, sizeBytes: file.size, sourceFileUrl: null };
        }
      }),
    );
    setUploading(false);
    onFilesChange([...files, ...uploaded]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
    if (archiveFailures.length > 0) {
      setError(
        `Fichier ajouté mais archivage impossible pour : ${archiveFailures.join(", ")}. La saisie manuelle reste possible.`,
      );
    }
  }

  function removeFile(index: number) {
    const removedPreview = previewUrls[index];
    if (removedPreview) URL.revokeObjectURL(removedPreview);
    onFilesChange(files.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  /** Réorganisation simple monter/descendre — suffisant pour ordonner plusieurs pages/captures d'une même recette, sans librairie de glisser-déposer. */
  function moveFile(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= files.length) return;
    const nextFiles = [...files];
    [nextFiles[index], nextFiles[target]] = [nextFiles[target], nextFiles[index]];
    onFilesChange(nextFiles);
    setPreviewUrls((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function loadDemoExample(fixtureId: DemoFixtureId) {
    setError(null);
    setLoadingFixture(fixtureId);
    try {
      const draft = await runDemoExtractionAction(fixtureId);
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
          onChange={(event) => void handleFileInput(event)}
          className="min-h-11 w-full rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-avoine file:px-3 file:py-2 file:text-cacao"
        />
        {uploading && <LoadingState message="Archivage du ou des fichiers…" />}
        {files.length > 1 && (
          <p className="text-xs text-cacao/60">
            Plusieurs fichiers = pages/captures d&rsquo;une seule recette, dans l&rsquo;ordre ci-dessous — utilisez « Monter »/« Descendre » pour
            les réordonner.
          </p>
        )}
        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-lg border border-grise bg-coquille px-3 py-2 text-sm text-cacao"
              >
                {previewUrls[index] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- aperçu local (objet URL navigateur), jamais un fichier distant, pas de pipeline next/image.
                  <img
                    src={previewUrls[index]!}
                    alt={`Aperçu de ${file.name}`}
                    className="h-12 w-12 shrink-0 rounded-md border border-grise object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-avoine text-xs font-medium text-cacao/70">
                    {fileKindLabel(file.type)}
                  </span>
                )}
                <span className="flex-1 truncate">{file.name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveFile(index, -1)}
                    disabled={index === 0}
                    aria-label={`Monter ${file.name}`}
                    className="min-h-11 min-w-11 rounded-lg text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveFile(index, 1)}
                    disabled={index === files.length - 1}
                    aria-label={`Descendre ${file.name}`}
                    className="min-h-11 min-w-11 rounded-lg text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="min-h-11 min-w-11 rounded-lg text-brunrouge underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                  >
                    Retirer
                  </button>
                </div>
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

      {error && <ErrorState message={error} />}
    </div>
  );
}
