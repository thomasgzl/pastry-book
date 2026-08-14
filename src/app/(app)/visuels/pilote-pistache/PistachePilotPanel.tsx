"use client";

/**
 * Panneau du pilote illustration réelle Pistache — préparation de la
 * confirmation UNIQUEMENT tant que non cliquée (aucun appel avant clic
 * explicite, aucune relance automatique). Même mécanisme que
 * `pilote/CitronPilotPanel.tsx` (Citron).
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import type { VisualAsset } from "@/lib/domain/schemas";
import { approveAsPrimaryAction, rejectAction } from "../actions";
import { runPistachePilotGeneration } from "./actions";

type Status = "confirming" | "cancelled" | "calling" | "done" | "error";

interface PistachePilotPanelProps {
  prompt: string;
  providerName: string;
  model: string;
  quality: string;
  dimensions: string;
  costPerImageEstimateEur: number | null;
}

export function PistachePilotPanel({ prompt, providerName, model, quality, dimensions, costPerImageEstimateEur }: PistachePilotPanelProps) {
  const [status, setStatus] = useState<Status>("confirming");
  const [asset, setAsset] = useState<VisualAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setStatus("calling");
    setErrorMessage(null);
    try {
      const result = await runPistachePilotGeneration();
      setAsset(result);
      setStatus("done");
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : "Échec de la génération réelle — réessayez.");
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {status === "confirming" && (
        <Card className="flex flex-col gap-2 text-sm text-cacao">
          <p>
            <strong>Opération</strong> : génération d&rsquo;illustration IA réelle
          </p>
          <p>
            <strong>Sujet</strong> : Pistache (matière première) — Citron utilisé uniquement comme référence de style, jamais de contenu
          </p>
          <p>
            <strong>Fournisseur</strong> : {providerName}
          </p>
          <p>
            <strong>Modèle</strong> : {model}
          </p>
          <p>
            <strong>Qualité</strong> : {quality === "draft" ? "brouillon économique" : quality}
          </p>
          <p>
            <strong>Dimensions</strong> : {dimensions}
          </p>
          <p>
            <strong>Nombre d&rsquo;images</strong> : 1
          </p>
          <p>
            <strong>Coût estimé</strong> : {costPerImageEstimateEur === null ? "estimation indisponible" : `${costPerImageEstimateEur} €`}
          </p>
          <details className="text-xs text-cacao/70">
            <summary className="cursor-pointer select-none">Prompt final complet</summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans">{prompt}</pre>
          </details>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={handleGenerate}>
              Générer 1 brouillon
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStatus("cancelled")}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      {status === "cancelled" && <p className="text-sm text-cacao/70">Annulé — aucun appel effectué. Rechargez la page pour recommencer.</p>}

      {status === "calling" && <LoadingState message="Génération réelle en cours…" />}

      {status === "error" && errorMessage && <ErrorState message={errorMessage} onRetry={() => setStatus("confirming")} />}

      {status === "done" && asset && (
        <Card className="flex flex-col gap-3">
          <p className="text-sm font-medium text-olive">Brouillon généré — un seul appel effectué, jamais approuvé automatiquement.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- image réelle générée, pas de pipeline next/image (lot E). */}
          <img
            src={asset.imageUrl}
            alt="Illustration Pistache — brouillon"
            className="h-64 w-64 self-center rounded-lg border border-grise bg-ivoire object-contain"
          />
          <div className="flex flex-wrap gap-2">
            <form action={approveAsPrimaryAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <Button type="submit" variant="primary">
                Approuver et utiliser
              </Button>
            </form>
            <Button type="button" variant="secondary" disabled>
              Conserver en brouillon (déjà le cas — aucune action requise)
            </Button>
            <form action={rejectAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <Button type="submit" variant="secondary">
                Rejeter
              </Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
