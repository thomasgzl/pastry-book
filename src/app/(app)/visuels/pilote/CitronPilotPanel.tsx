"use client";

/**
 * Panneau du pilote illustration réelle (lot G, G3) — sujet fixe « Citron »,
 * une seule génération autorisée après confirmation explicite (opération,
 * fournisseur, modèle, qualité, dimensions, nombre d'images, coût si
 * disponible). Un seul appel sur clic, jamais automatique, jamais de
 * relance en cas d'erreur ni après rejet. Les 3 mises en situation
 * demandées réutilisent le MÊME fichier généré, jamais un nouvel appel :
 * (1) galerie `/visuels` (déjà à jour, lien direct), (2) carte de matière
 * première (vrai composant `CanonicalIngredientCard`), (3) en-tête de page
 * Citron (même mise en page que `/matieres-premieres/citron`) — les deux
 * dernières sont des APERÇUS dans ce panneau, pas une publication : la
 * page réelle n'affiche le visuel qu'une fois approuvé/principal (voir
 * `getPrimaryVisualAsset`, `/matieres-premieres`).
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { CanonicalIngredientCard } from "@/components/cards/CanonicalIngredientCard";
import type { VisualAsset } from "@/lib/domain/schemas";
import { approveAsPrimaryAction, rejectAction } from "../actions";
import { runCitronPilotGeneration } from "./actions";

type Status = "confirming" | "cancelled" | "calling" | "done" | "error";

interface CitronPilotPanelProps {
  prompt: string;
  providerName: string;
  model: string;
  quality: string;
  dimensions: string;
  costPerImageEstimateEur: number | null;
  recipeCount: number;
  /** Visuel déjà approuvé/principal pour Citron (ex. exemple de démonstration) — jamais modifié ni écrasé par ce pilote (correction versionnement, lot G). `null` si aucun. */
  existingPrimary: VisualAsset | null;
}

export function CitronPilotPanel({
  prompt,
  providerName,
  model,
  quality,
  dimensions,
  costPerImageEstimateEur,
  recipeCount,
  existingPrimary,
}: CitronPilotPanelProps) {
  const [status, setStatus] = useState<Status>("confirming");
  const [asset, setAsset] = useState<VisualAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setStatus("calling");
    setErrorMessage(null);
    try {
      const result = await runCitronPilotGeneration();
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
            <strong>Sujet</strong> : Citron (matière première)
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
              {existingPrimary ? "Générer un nouveau brouillon" : "Générer 1 brouillon"}
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
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col gap-3">
            <p className="text-sm font-medium text-olive">
              Brouillon généré — un seul appel effectué, jamais approuvé automatiquement
              {existingPrimary ? ", visuel actuellement utilisé conservé intact." : "."}
            </p>

            <div className={`grid grid-cols-1 gap-4 ${existingPrimary ? "sm:grid-cols-2" : ""}`}>
              {existingPrimary && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-medium text-cacao/70">Visuel actuellement utilisé</p>
                  {/* eslint-disable-next-line @next/next/no-img-element -- image existante, pas de pipeline next/image (lot E). */}
                  <img
                    src={existingPrimary.imageUrl}
                    alt="Visuel Citron actuellement utilisé"
                    className="h-64 w-64 rounded-lg border border-grise bg-ivoire object-contain"
                  />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                {existingPrimary && <p className="text-xs font-medium text-cacao/70">Nouveau brouillon</p>}
                {/* eslint-disable-next-line @next/next/no-img-element -- image réelle générée, pas de pipeline next/image (lot E). */}
                <img
                  src={asset.imageUrl}
                  alt="Illustration Citron — nouveau brouillon"
                  className="h-64 w-64 rounded-lg border border-grise bg-ivoire object-contain"
                />
              </div>
            </div>

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

          <div className="flex flex-col gap-3">
            <EditorialTitle as="h2">Mises en situation (même fichier, CSS uniquement)</EditorialTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-cacao/70">1. Seule sur /visuels</p>
                <p className="text-xs text-cacao/60">
                  Déjà visible dans la galerie « Matières premières » —{" "}
                  <a href="/visuels" className="underline">
                    ouvrir /visuels
                  </a>
                  .
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-cacao/70">2. Carte de matière première (aperçu)</p>
                <CanonicalIngredientCard name="Citron" recipeCount={recipeCount} imageUrl={asset.imageUrl} href="/matieres-premieres/citron" />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <p className="text-xs font-medium text-cacao/70">3. En-tête de la page Citron (aperçu)</p>
                <Card className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- image réelle générée, pas de pipeline next/image (lot E). */}
                  <img src={asset.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-grise bg-ivoire object-contain" />
                  <EditorialTitle as="h2">Citron</EditorialTitle>
                </Card>
              </div>
            </div>
            <p className="text-xs text-cacao/60">
              Aperçus uniquement — les pages réelles n&rsquo;affichent ce visuel qu&rsquo;après « Approuver et utiliser ».
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
