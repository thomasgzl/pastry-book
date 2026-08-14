import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { describeRealImageGenerationRequest, SIZE_BY_RATIO } from "@/lib/ai/visuals/openai-provider";
import { getCanonicalIngredientBySlug, getRecipeCountForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { getSubjectFraming } from "@/lib/visuals/preset";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { buildCitronPilotPrompt } from "./prompt";
import { CitronPilotPanel } from "./CitronPilotPanel";

/**
 * Route dédiée au pilote illustration réelle (lot G, G3) — sujet fixe
 * « Citron », une seule génération autorisée. Lit uniquement la PRÉSENCE de
 * `OPENAI_API_KEY` côté serveur (jamais sa valeur), comme le pilote
 * d'extraction (`/importer`). Séparée de `/visuels` (galerie normale) pour
 * ne jamais mélanger ce brief créatif ponctuel avec le preset générique.
 */
export default function CitronVisualPilotPage() {
  const realGenerationAvailable = Boolean(process.env.OPENAI_API_KEY?.trim());
  const description = describeRealImageGenerationRequest("draft");
  const framing = getSubjectFraming("ingredient");
  const dimensions = SIZE_BY_RATIO[framing.ratio];
  const prompt = buildCitronPilotPrompt();
  const citron = getCanonicalIngredientBySlug("citron");
  const recipeCount = citron ? getRecipeCountForCanonicalIngredient(citron.slug) : 0;
  const existingPrimary = citron ? (getPrimaryVisualAsset("ingredient", citron.id) ?? null) : null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Visuels IA", href: "/visuels" }, { label: "Pilote — Citron" }]} />
      <EditorialTitle>Pilote illustration réelle — Citron</EditorialTitle>

      {realGenerationAvailable ? (
        <CitronPilotPanel
          prompt={prompt}
          providerName={description.providerName}
          model={description.model}
          quality={description.quality}
          dimensions={dimensions}
          costPerImageEstimateEur={description.costPerImageEstimateEur}
          recipeCount={recipeCount}
          existingPrimary={existingPrimary}
        />
      ) : (
        <p className="text-sm text-cacao/70">
          Génération réelle indisponible : clé API OpenAI absente côté serveur — reste en mode démonstration.
        </p>
      )}
    </div>
  );
}
