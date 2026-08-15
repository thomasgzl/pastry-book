/**
 * File des illustrations manquantes (K8). Calcule DYNAMIQUEMENT les sujets
 * sans visuel principal approuvé à chaque ouverture de la page (jamais une
 * liste figée) via `getMissingVisualSubjects` (`src/lib/visuals/queue.ts`) —
 * croise `getAllVisualSubjects()` (K6) avec le visuel principal approuvé de
 * chaque sujet (`getPrimaryVisualAsset`, storage.ts).
 *
 * Fournisseur/modèle/qualité/dimensions affichés proviennent de
 * `describeRealImageGenerationRequest` (F-IA2) : information sur la
 * génération RÉELLE ciblée par K9-K11. L'exécution disponible dans CE lot
 * (`actions.ts`) utilise le générateur de démonstration (gratuit, aucun
 * appel OpenAI) — voir le bandeau affiché par `MissingQueueBrowser`.
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { describeRealImageGenerationRequest, SIZE_BY_RATIO } from "@/lib/ai/visuals/openai-provider";
import { getSubjectFraming, VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import type { VisualSubjectKind } from "@/lib/visuals/preset";
import { getMissingVisualSubjects } from "@/lib/visuals/queue";
import { MissingQueueBrowser, type MissingSubjectEntry } from "./MissingQueueBrowser";

const KINDS: VisualSubjectKind[] = ["ingredient", "recipe", "source", "sourceCategory"];

function buildDimensionsByType(): Record<VisualSubjectKind, { ratio: string; size: string }> {
  return Object.fromEntries(
    KINDS.map((kind) => {
      const framing = getSubjectFraming(kind);
      return [kind, { ratio: framing.ratio, size: SIZE_BY_RATIO[framing.ratio] }];
    }),
  ) as Record<VisualSubjectKind, { ratio: string; size: string }>;
}

export default async function MissingIllustrationsPage() {
  let entries: MissingSubjectEntry[] | null = null;
  let loadError = false;
  try {
    const subjects = await getMissingVisualSubjects();
    entries = subjects.map((subject) => ({
      type: subject.type,
      id: subject.id,
      label: subject.label,
      parentLabel: subject.parentLabel,
    }));
  } catch {
    // Lecture Supabase/données indisponible : état d'erreur explicite plutôt qu'un plantage.
    loadError = true;
  }

  const description = describeRealImageGenerationRequest("draft");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Illustrations", href: "/illustrations" },
          { label: "Manquantes" },
        ]}
      />

      <div className="flex flex-col gap-2">
        <EditorialTitle>Illustrations manquantes</EditorialTitle>
        <p className="text-sm text-cacao/70">
          Sujets sans visuel principal approuvé, recalculés à chaque ouverture de cette page. Preset « Botanique
          éditorial — {VISUAL_PRESET_VERSION} ».
        </p>
      </div>

      {loadError || !entries ? (
        <ErrorState message="La file des illustrations manquantes n'a pas pu être calculée. Merci de réessayer." />
      ) : entries.length === 0 ? (
        <EmptyState message="Aucune illustration manquante : tous les sujets ont un visuel principal approuvé." />
      ) : (
        <MissingQueueBrowser
          entries={entries}
          providerName={description.providerName}
          providerModel={description.model}
          quality={description.quality}
          costPerImageEstimateEur={description.costPerImageEstimateEur}
          dimensionsByType={buildDimensionsByType()}
        />
      )}
    </div>
  );
}
