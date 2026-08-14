"use client";

/**
 * Panneau du pilote lot H — confirmation UNIQUE listant jusqu'à 7 sujets,
 * puis UN clic déclenche `runLotHGeneration` (appels réels séquentiels côté
 * serveur, arrêt immédiat au premier échec, jamais de relance automatique).
 * Galerie de résultats groupée par famille (Matières premières / Recette /
 * Entreprise / Catégorie), jamais d'approbation automatique.
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { approveAsPrimaryAction, rejectAction } from "../actions";
import { LOT_H_GROUP_LABELS, type LotHGroup, type LotHSubject } from "./subjects";
import { runLotHGeneration, type LotHOutcome } from "./actions";

type Status = "confirming" | "cancelled" | "calling" | "done" | "error";

const GROUP_ORDER: LotHGroup[] = ["ingredient", "recipe", "source", "sourceCategory"];

interface LotHPanelProps {
  subjects: LotHSubject[];
  providerName: string;
  model: string;
  quality: string;
  dimensions: string;
  costPerImageEstimateEur: number | null;
}

export function LotHPanel({ subjects, providerName, model, quality, dimensions, costPerImageEstimateEur }: LotHPanelProps) {
  const [status, setStatus] = useState<Status>("confirming");
  const [outcomes, setOutcomes] = useState<LotHOutcome[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toGenerate = subjects.filter((s) => !s.alreadyApproved);
  const alreadyApproved = subjects.filter((s) => s.alreadyApproved);
  const subjectByKey = new Map(subjects.map((s) => [s.key, s]));

  async function handleGenerate() {
    setStatus("calling");
    setErrorMessage(null);
    try {
      const result = await runLotHGeneration();
      setOutcomes(result);
      setStatus("done");
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Échec du lot — réessayez.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "confirming" && (
        <Card className="flex flex-col gap-3 text-sm text-cacao">
          <p>
            <strong>Opération</strong> : génération d&rsquo;illustrations IA réelles, séquentielle, arrêt immédiat au premier échec
          </p>
          <p>
            <strong>Fournisseur</strong> : {providerName} · <strong>Modèle</strong> : {model} · <strong>Qualité</strong> :{" "}
            {quality === "draft" ? "brouillon économique" : quality} · <strong>Dimensions</strong> : {dimensions} ·{" "}
            <strong>Fond</strong> : ivoire opaque
          </p>
          <p>
            <strong>Nombre d&rsquo;appels</strong> : {toGenerate.length}
            {alreadyApproved.length > 0 && ` (${alreadyApproved.length} sujet(s) déjà approuvé(s), ignoré(s), aucun doublon)`}
          </p>
          <p>
            <strong>Coût estimé</strong> : {costPerImageEstimateEur === null ? "estimation indisponible" : `${costPerImageEstimateEur} € × ${toGenerate.length}`}
          </p>

          <ul className="flex flex-col gap-2">
            {subjects.map((subject) => (
              <li key={subject.key} className="rounded-lg border border-grise p-3">
                <p className="text-sm font-medium text-cacao">
                  {subject.label} <span className="text-xs text-cacao/60">({LOT_H_GROUP_LABELS[subject.group]} · {subject.contextLabel})</span>
                  {subject.alreadyApproved && <span className="ml-2 text-xs text-olive">déjà approuvé — ignoré</span>}
                </p>
                <details className="text-xs text-cacao/70">
                  <summary className="cursor-pointer select-none">Prompt complet</summary>
                  <pre className="mt-2 whitespace-pre-wrap font-sans">{subject.prompt}</pre>
                </details>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={handleGenerate} disabled={toGenerate.length === 0}>
              Générer les {toGenerate.length} brouillons
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatus("cancelled")}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {status === "cancelled" && <p className="text-sm text-cacao/70">Annulé — aucun appel effectué. Rechargez la page pour recommencer.</p>}

      {status === "calling" && <LoadingState message={`Génération séquentielle en cours (jusqu'à ${toGenerate.length} appels)…`} />}

      {status === "error" && errorMessage && <ErrorState message={errorMessage} onRetry={() => setStatus("confirming")} />}

      {status === "done" && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-1 text-sm text-cacao">
            <p>
              <strong>Terminés</strong> : {outcomes.filter((o) => o.status === "ok").length} ·{" "}
              <strong>Ignorés (déjà approuvés)</strong> : {outcomes.filter((o) => o.status === "skipped").length} ·{" "}
              <strong>Échec</strong> : {outcomes.filter((o) => o.status === "error").length} ·{" "}
              <strong>Non tentés (file arrêtée)</strong> : {outcomes.filter((o) => o.status === "not_attempted").length}
            </p>
          </Card>

          {GROUP_ORDER.map((group) => {
            const groupOutcomes = outcomes.filter((o) => subjectByKey.get(o.key)?.group === group);
            if (groupOutcomes.length === 0) return null;
            return (
              <div key={group} className="flex flex-col gap-3">
                <EditorialTitle as="h2">{LOT_H_GROUP_LABELS[group]}</EditorialTitle>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groupOutcomes.map((outcome) => {
                    const subject = subjectByKey.get(outcome.key);
                    if (!subject) return null;
                    return (
                      <Card key={outcome.key} className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-cacao">{subject.label}</p>
                        <p className="text-xs text-cacao/60">{subject.contextLabel}</p>

                        {outcome.status === "ok" && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- image réelle générée, pas de pipeline next/image (lot E). */}
                            <img
                              src={outcome.asset.imageUrl}
                              alt={`Illustration ${subject.label} — brouillon`}
                              className="h-40 w-full rounded-lg border border-grise bg-ivoire object-contain"
                            />
                            <p className="text-xs text-olive">Brouillon</p>
                            <div className="flex flex-wrap gap-2">
                              <form action={approveAsPrimaryAction}>
                                <input type="hidden" name="assetId" value={outcome.asset.id} />
                                <Button type="submit" variant="primary" className="text-sm">
                                  Approuver
                                </Button>
                              </form>
                              <Button type="button" variant="secondary" className="text-sm" disabled>
                                Conserver en brouillon
                              </Button>
                              <form action={rejectAction}>
                                <input type="hidden" name="assetId" value={outcome.asset.id} />
                                <Button type="submit" variant="secondary" className="text-sm">
                                  Rejeter
                                </Button>
                              </form>
                            </div>
                          </>
                        )}

                        {outcome.status === "skipped" && <p className="text-xs text-cacao/60">{outcome.reason}</p>}
                        {outcome.status === "error" && <ErrorState message={outcome.message} className="text-left" />}
                        {outcome.status === "not_attempted" && (
                          <p className="text-xs text-brunrouge">Non tenté — file arrêtée après l&rsquo;échec précédent.</p>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
