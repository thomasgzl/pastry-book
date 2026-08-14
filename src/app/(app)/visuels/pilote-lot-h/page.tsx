import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { describeRealImageGenerationRequest } from "@/lib/ai/visuals/openai-provider";
import { resolveLotHSubjects } from "./subjects";
import { LotHPanel } from "./LotHPanel";

/**
 * Route dédiée au pilote lot H — validation des 3 familles visuelles
 * restantes (recette, entreprise, catégorie) + extension matières
 * premières manquantes (Chocolat, Vanille, Noisette, Poire). Jusqu'à 7
 * appels réels séquentiels après UNE confirmation unique, jamais avant clic
 * explicite. Sujets déjà approuvés (Citron, Pistache) exclus par
 * construction — `resolveLotHSubjects` ne les liste même pas.
 */
export default async function LotHVisualPilotPage() {
  const realGenerationAvailable = Boolean(process.env.OPENAI_API_KEY?.trim());
  const description = describeRealImageGenerationRequest("draft");
  const subjects = await resolveLotHSubjects();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Visuels IA", href: "/visuels" }, { label: "Pilote — Lot H" }]} />
      <EditorialTitle>Pilote lot H — 7 sujets, format carré 1024×1024, fond ivoire opaque</EditorialTitle>
      <p className="text-sm text-cacao/70">
        Citron et Pistache servent uniquement de référence de style (finesse du trait, aquarelle légère, espace négatif,
        échelle, palette olive/sauge) — jamais comme contenu des images ci-dessous.
      </p>

      {realGenerationAvailable ? (
        <LotHPanel
          subjects={subjects}
          providerName={description.providerName}
          model={description.model}
          quality={description.quality}
          dimensions="1024x1024"
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
