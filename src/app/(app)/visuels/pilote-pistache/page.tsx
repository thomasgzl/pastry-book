import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { describeRealImageGenerationRequest, SIZE_BY_RATIO } from "@/lib/ai/visuals/openai-provider";
import { getSubjectFraming } from "@/lib/visuals/preset";
import { buildPistachePilotPrompt } from "./prompt";
import { PistachePilotPanel } from "./PistachePilotPanel";

/**
 * Route dédiée à la préparation du pilote Pistache — réplique de style du
 * pilote Citron (G3). Sujet fixe, une seule génération autorisée, jamais
 * déclenchée avant clic explicite. Voir `pilote/page.tsx` (Citron) pour le
 * même mécanisme.
 */
export default function PistacheVisualPilotPage() {
  const realGenerationAvailable = Boolean(process.env.OPENAI_API_KEY?.trim());
  const description = describeRealImageGenerationRequest("draft");
  const framing = getSubjectFraming("ingredient");
  const dimensions = SIZE_BY_RATIO[framing.ratio];
  const prompt = buildPistachePilotPrompt();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Visuels IA", href: "/visuels" }, { label: "Pilote — Pistache" }]} />
      <EditorialTitle>Pilote illustration réelle — Pistache</EditorialTitle>
      <p className="text-sm text-cacao/70">
        Réplique de style du pilote Citron (même finesse botanique, même aquarelle légère, même fond ivoire, même espace
        négatif, même échelle, même palette olive/sauge) — Citron utilisé uniquement comme référence de style, jamais comme
        contenu de l&rsquo;image.
      </p>

      {realGenerationAvailable ? (
        <PistachePilotPanel
          prompt={prompt}
          providerName={description.providerName}
          model={description.model}
          quality={description.quality}
          dimensions={dimensions}
          costPerImageEstimateEur={description.costPerImageEstimateEur}
        />
      ) : (
        <p className="text-sm text-cacao/70">
          Génération réelle indisponible : clé API OpenAI absente côté serveur — reste en mode démonstration.
        </p>
      )}
    </div>
  );
}
