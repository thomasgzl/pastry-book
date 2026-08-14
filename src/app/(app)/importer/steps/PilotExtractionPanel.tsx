"use client";

/**
 * Pilote IA réel (lot G, G2 + G2-bis + correction multi-captures) — 3
 * emplacements fixes miroir des 3 exemples de démonstration (CAP minimale,
 * Hennessy détaillée, capture difficile), mais pour de vrais fichiers
 * fournis manuellement. Chaque emplacement accepte UNE recette répartie sur
 * PLUSIEURS captures ordonnées (ajout/retrait/réorganisation avant l'appel,
 * jamais une recette par fichier) — les images sont optimisées
 * automatiquement côté client (G2-bis, jamais l'original modifié, voir
 * `@/lib/import/imageOptimize`), avec aperçu zoomable de chaque page.
 * Confirmation explicite affichant opération/modèle/fichiers/niveau de
 * détail/nombre d'appels, PUIS UN SEUL appel réel regroupant tous les
 * fichiers de l'emplacement (jamais automatique, jamais de relance).
 *
 * I6 : dès qu'un fichier est mis en attente (staged), le fichier ORIGINAL
 * (jamais la copie optimisée) est archivé directement du navigateur vers le
 * bucket privé `recipe-sources` (`@/lib/import/sourceUpload`) — automatique,
 * sans coût, indépendant du clic de confirmation qui reste réservé au seul
 * appel IA réel. Sans effet en mode démonstration sans Supabase configuré
 * (`hasSupabaseConfig()`), jamais un échec silencieux sinon.
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import type { DemoExtractionDraft } from "@/lib/ai/import/runDemoExtraction";
import type { ExtractSourceFile } from "@/lib/ai/import/types";
import { isImageFile, optimizeImageFile } from "@/lib/import/imageOptimize";
import { uploadSourceFile } from "@/lib/import/sourceUpload";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { runPilotExtraction } from "../pilotActions";

interface PilotSlotDef {
  id: string;
  label: string;
  hint: string;
}

const PILOT_SLOTS: PilotSlotDef[] = [
  { id: "cap", label: "1. Recette CAP minimale", hint: "Ingrédients seulement, aucune procédure attendue." },
  { id: "hennessy", label: "2. Recette Hennessy détaillée", hint: "Préparations multiples, informations complémentaires." },
  { id: "capture", label: "3. Capture difficile", hint: "Une quantité illisible doit ressortir « À vérifier »." },
];

type SlotStatus = "idle" | "optimizing" | "preview" | "confirming" | "calling" | "done" | "error";

type ArchiveStatus = "skipped" | "uploading" | "done" | "error";

interface StagedFile {
  id: string;
  file: File;
  /** `null` pour un fichier non-image (PDF/DOCX/texte) — envoyé tel quel. */
  optimized: { blob: Blob; width: number; height: number; quality: number; previewUrl: string } | null;
  /** Chemin Storage réel une fois archivé (I6) — jamais une URL fictive, `null` tant que `archiveStatus` n'est pas `"done"`. */
  sourceFileUrl: string | null;
  archiveStatus: ArchiveStatus;
  archiveErrorMessage: string | null;
}

interface SlotState {
  staged: StagedFile[];
  documentDifficult: boolean;
  status: SlotStatus;
  errorMessage: string | null;
  zoomedId: string | null;
}

const EMPTY_SLOT: SlotState = { staged: [], documentDifficult: false, status: "idle", errorMessage: null, zoomedId: null };

/** Doit rester égale à `MAX_FILE_SIZE_BYTES` (`src/lib/ai/import/openaiProvider.ts`) — vérifiée ici AVANT tout envoi réseau. Ne s'applique jamais aux images (G2-bis, budget 7 Mo propre après optimisation). */
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function withOptimizedExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return `${dot === -1 ? name : name.slice(0, dot)}.webp`;
}

function moveItem<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

interface PilotExtractionPanelProps {
  extractionModel: string;
  onExtracted: (draft: DemoExtractionDraft, providerName: string) => void;
  /** Lot d'import déjà créé côté serveur — préfixe du chemin Storage (I6, `{importBatchId}/{uuid}.{ext}`). */
  importBatchId: string;
}

export function PilotExtractionPanel({ extractionModel, onExtracted, importBatchId }: PilotExtractionPanelProps) {
  const [slots, setSlots] = useState<Record<string, SlotState>>(() =>
    Object.fromEntries(PILOT_SLOTS.map((slot) => [slot.id, { ...EMPTY_SLOT }])),
  );

  function updateSlot(id: string, patch: Partial<SlotState>) {
    setSlots((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  function updateStagedFile(slotId: string, fileId: string, patch: Partial<StagedFile>) {
    setSlots((current) => ({
      ...current,
      [slotId]: {
        ...current[slotId],
        staged: current[slotId].staged.map((staged) => (staged.id === fileId ? { ...staged, ...patch } : staged)),
      },
    }));
  }

  /**
   * Archive le fichier ORIGINAL (jamais la copie optimisée) directement du
   * navigateur vers `recipe-sources` — automatique dès la mise en attente,
   * aucun coût IA, indépendant du clic de confirmation. `ponytail` : aucun
   * nettoyage du fichier déjà archivé si la personne retire la capture avant
   * confirmation (orphelin sans conséquence, bucket privé) — à ajouter si le
   * volume d'orphelins devient un problème réel.
   */
  function archiveStaged(slotId: string, fileId: string, file: File) {
    if (!hasSupabaseConfig()) return; // mode démonstration sans Supabase configuré : jamais d'échec, jamais de fausse URL
    updateStagedFile(slotId, fileId, { archiveStatus: "uploading", archiveErrorMessage: null });
    uploadSourceFile(importBatchId, file)
      .then(({ path }) => updateStagedFile(slotId, fileId, { archiveStatus: "done", sourceFileUrl: path }))
      .catch((cause) =>
        updateStagedFile(slotId, fileId, {
          archiveStatus: "error",
          archiveErrorMessage: cause instanceof Error ? cause.message : "Échec de l'archivage du fichier source.",
        }),
      );
  }

  function revokeStaged(staged: StagedFile[]) {
    for (const item of staged) if (item.optimized) URL.revokeObjectURL(item.optimized.previewUrl);
  }

  function resetSlot(id: string) {
    revokeStaged(slots[id].staged);
    setSlots((prev) => ({ ...prev, [id]: { ...EMPTY_SLOT } }));
  }

  async function handleFilesAdded(slotId: string, incoming: File[]) {
    if (incoming.length === 0) return;
    const current = slots[slotId].staged;
    const incomingAllImages = incoming.every(isImageFile);

    if (!incomingAllImages) {
      if (incoming.length > 1 || current.length > 0) {
        updateSlot(slotId, {
          status: "error",
          errorMessage: "Un seul document PDF/DOCX/texte à la fois — pour une recette sur plusieurs pages, utilisez des captures image.",
        });
        return;
      }
      const single = incoming[0];
      if (single.size > MAX_FILE_SIZE_BYTES) {
        updateSlot(slotId, {
          status: "error",
          // Limite partagée avec le bucket Storage `recipe-sources` (8 Mo, voir
          // `supabase/migrations/20260814090300_storage_buckets.sql`) — l'upload
          // direct (I6) ne lève pas cette limite, réduisez le fichier avant de réessayer.
          errorMessage: "Ce fichier dépasse la limite de 8 Mo. Réduisez sa taille avant de réessayer.",
        });
        return;
      }
      const singleId = crypto.randomUUID();
      updateSlot(slotId, {
        staged: [
          { id: singleId, file: single, optimized: null, sourceFileUrl: null, archiveStatus: "skipped", archiveErrorMessage: null },
        ],
        status: "idle",
      });
      archiveStaged(slotId, singleId, single);
      return;
    }

    if (current.some((s) => !isImageFile(s.file))) {
      updateSlot(slotId, {
        status: "error",
        errorMessage: "Impossible d'ajouter une capture à un document déjà sélectionné — retirez-le d'abord.",
      });
      return;
    }

    updateSlot(slotId, { status: "optimizing", errorMessage: null });
    const newlyStaged: StagedFile[] = [];
    for (const file of incoming) {
      const outcome = await optimizeImageFile(file);
      if (outcome.status !== "ok") {
        updateSlot(slotId, { status: "error", errorMessage: `${file.name} : ${outcome.message}` });
        return;
      }
      newlyStaged.push({
        id: crypto.randomUUID(),
        file,
        optimized: {
          blob: outcome.blob,
          width: outcome.width,
          height: outcome.height,
          quality: outcome.quality,
          previewUrl: URL.createObjectURL(outcome.blob),
        },
        sourceFileUrl: null,
        archiveStatus: "skipped",
        archiveErrorMessage: null,
      });
    }
    setSlots((prev) => ({
      ...prev,
      [slotId]: { ...prev[slotId], staged: [...prev[slotId].staged, ...newlyStaged], status: "preview", errorMessage: null },
    }));
    // Archivage du fichier ORIGINAL (jamais la copie WebP optimisée
    // ci-dessus) — déclenché après le `setSlots` pour partir d'un état déjà
    // affiché, jamais avant que la personne ne voie l'aperçu.
    for (const staged of newlyStaged) archiveStaged(slotId, staged.id, staged.file);
  }

  function removeStaged(slotId: string, fileId: string) {
    const target = slots[slotId].staged.find((s) => s.id === fileId);
    if (target?.optimized) URL.revokeObjectURL(target.optimized.previewUrl);
    const remaining = slots[slotId].staged.filter((s) => s.id !== fileId);
    updateSlot(slotId, { staged: remaining, status: remaining.length > 0 ? "preview" : "idle" });
  }

  function reorderStaged(slotId: string, index: number, direction: -1 | 1) {
    updateSlot(slotId, { staged: moveItem(slots[slotId].staged, index, direction) });
  }

  async function handleConfirm(slot: PilotSlotDef) {
    const state = slots[slot.id];
    if (state.staged.length === 0) return;
    updateSlot(slot.id, { status: "calling", errorMessage: null });
    try {
      const files: ExtractSourceFile[] = await Promise.all(
        state.staged.map(async (staged) => {
          const blob = staged.optimized?.blob ?? staged.file;
          const name = staged.optimized ? withOptimizedExtension(staged.file.name) : staged.file.name;
          const type = staged.optimized ? "image/webp" : staged.file.type;
          return { name, type, fileBase64: await blobToBase64(blob), sourceFileUrl: staged.sourceFileUrl };
        }),
      );
      const draft = await runPilotExtraction(files, {
        requestId: `pilot-${slot.id}-${Date.now()}`,
        documentDifficult: state.documentDifficult,
      });
      updateSlot(slot.id, { status: "done" });
      onExtracted(draft, `openai-pilote-${slot.id}`);
    } catch (cause) {
      updateSlot(slot.id, {
        status: "error",
        errorMessage: cause instanceof Error ? cause.message : "Échec de l'appel réel — réessayez.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-brunrouge p-3">
      <p className="text-sm font-medium text-cacao">
        Pilote IA réel — 3 essais maximum, un seul appel à la fois, aucune relance automatique
      </p>

      {PILOT_SLOTS.map((slot) => {
        const state = slots[slot.id];
        const totalSizeBytes = state.staged.reduce((sum, s) => sum + (s.optimized?.blob.size ?? s.file.size), 0);

        return (
          <Card key={slot.id} className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-medium text-cacao">{slot.label}</p>
              <p className="text-xs text-cacao/70">{slot.hint}</p>
            </div>

            {(state.status === "idle" || state.status === "preview") && (
              <>
                {state.staged.length > 0 && (
                  <p className="text-sm font-medium text-cacao">
                    Une recette — {state.staged.length} fichier{state.staged.length > 1 ? "s" : ""}
                  </p>
                )}

                {state.staged.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {state.staged.map((staged, index) => (
                      <li key={staged.id} className="flex items-center gap-2 rounded-lg border border-grise p-2">
                        <span className="w-6 shrink-0 text-center text-sm text-cacao/70">{index + 1}</span>
                        {staged.optimized ? (
                          <button
                            type="button"
                            onClick={() => updateSlot(slot.id, { zoomedId: staged.id })}
                            className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-grise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob local, jamais optimisable par next/image */}
                            <img src={staged.optimized.previewUrl} alt={`Aperçu optimisé — page ${index + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ) : (
                          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-grise bg-coquille text-xs text-cacao/70">
                            document
                          </span>
                        )}
                        <div className="flex flex-1 flex-col gap-0.5 text-xs text-cacao/70">
                          <span className="truncate text-sm text-cacao">{staged.file.name}</span>
                          <span>
                            Original {formatMegabytes(staged.file.size)}
                            {staged.optimized && (
                              <>
                                {" "}
                                → optimisée {formatMegabytes(staged.optimized.blob.size)} ({staged.optimized.width} × {staged.optimized.height} px)
                              </>
                            )}
                          </span>
                          {staged.archiveStatus === "uploading" && <span>Archivage du fichier source…</span>}
                          {staged.archiveStatus === "done" && <span>Fichier source archivé.</span>}
                          {staged.archiveStatus === "error" && (
                            <span className="text-brunrouge">
                              {staged.archiveErrorMessage ?? "Échec de l'archivage du fichier source."}{" "}
                              <button
                                type="button"
                                onClick={() => archiveStaged(slot.id, staged.id, staged.file)}
                                className="underline"
                              >
                                Réessayer l&rsquo;archivage
                              </button>
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" variant="secondary" disabled={index === 0} onClick={() => reorderStaged(slot.id, index, -1)} aria-label="Monter">
                            ↑
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={index === state.staged.length - 1}
                            onClick={() => reorderStaged(slot.id, index, 1)}
                            aria-label="Descendre"
                          >
                            ↓
                          </Button>
                          <Button type="button" variant="secondary" onClick={() => removeStaged(slot.id, staged.id)} aria-label="Retirer">
                            Retirer
                          </Button>
                        </div>

                        {state.zoomedId === staged.id && staged.optimized && (
                          <div role="dialog" aria-label="Aperçu agrandi" className="fixed inset-0 z-50 flex items-center justify-center bg-cacao/90 p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element -- blob local, jamais optimisable par next/image */}
                            <img src={staged.optimized.previewUrl} alt={`Aperçu agrandi — page ${index + 1}`} className="max-h-full max-w-full object-contain" />
                            <button
                              type="button"
                              onClick={() => updateSlot(slot.id, { zoomedId: null })}
                              className="absolute right-4 top-4 min-h-11 min-w-11 rounded-lg bg-coquille px-3 py-2 text-cacao"
                            >
                              Fermer
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <label htmlFor={`pilot-file-${slot.id}`} className="text-sm font-medium text-cacao">
                  {state.staged.length > 0 ? "Ajouter une autre capture (même recette)" : "Sélectionner le ou les fichiers"}
                </label>
                <input
                  id={`pilot-file-${slot.id}`}
                  type="file"
                  multiple
                  accept="image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    void handleFilesAdded(slot.id, selected);
                  }}
                  className="min-h-11 w-full rounded-lg border border-grise bg-coquille px-3 py-2 text-sm text-cacao file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-avoine file:px-3 file:py-2 file:text-cacao"
                />

                <label className="flex min-h-11 items-center gap-2 text-sm text-cacao">
                  <input
                    type="checkbox"
                    checked={state.documentDifficult}
                    onChange={(event) => updateSlot(slot.id, { documentDifficult: event.target.checked })}
                    className="h-5 w-5"
                  />
                  Document difficile à lire (niveau de détail élevé)
                </label>

                {state.staged.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => updateSlot(slot.id, { status: "confirming" })}>
                      Confirmer l&rsquo;extraction
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => resetSlot(slot.id)}>
                      Annuler
                    </Button>
                  </div>
                )}
              </>
            )}

            {state.status === "optimizing" && <LoadingState message="Optimisation des images (redimensionnement, conversion WebP)…" />}

            {state.status === "confirming" && (
              <div className="flex flex-col gap-2 rounded-lg bg-coquille p-3 text-sm text-cacao">
                <p>
                  <strong>Opération</strong> : extraction IA réelle
                </p>
                <p>
                  <strong>Modèle</strong> : {extractionModel}
                </p>
                <p>
                  <strong>Fichiers</strong> : {state.staged.length} ({formatMegabytes(totalSizeBytes)} au total) —{" "}
                  {state.staged.map((s) => s.file.name).join(", ")}
                  {state.staged.some((s) => s.optimized) ? " — copies optimisées envoyées, originaux conservés" : ""}
                </p>
                <p>
                  <strong>Niveau de détail</strong> : {state.documentDifficult ? "élevé" : "standard"}
                </p>
                <p>
                  <strong>Nombre d&rsquo;appels</strong> : 1
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => handleConfirm(slot)}>
                    Confirmer l&rsquo;appel
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => updateSlot(slot.id, { status: "preview" })}>
                    Annuler
                  </Button>
                </div>
              </div>
            )}

            {state.status === "calling" && <LoadingState message="Appel réel en cours…" />}

            {state.status === "error" && state.errorMessage && (
              <ErrorState message={state.errorMessage} onRetry={() => resetSlot(slot.id)} />
            )}

            {state.status === "done" && <p className="text-sm text-olive">Extraction reçue — vérifiez et corrigez à l&rsquo;étape suivante.</p>}
          </Card>
        );
      })}
    </div>
  );
}
