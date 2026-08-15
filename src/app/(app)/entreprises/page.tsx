/**
 * Liste des entreprises/sources (C3). Hennessy n'a ici aucun traitement
 * différent des autres sources — c'est une carte parmi d'autres.
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SourceCard } from "@/components/cards/SourceCard";
import { getRecipeCountForSource, getSources } from "@/lib/data/sources";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";

export default async function EntreprisesPage() {
  const sources = await getSources();
  // Visuel IA approuvé (lot J7) plutôt que le champ démo `illustrationUrl`
  // (toujours `null` dans le jeu de données actuel, voir `demo/data.ts`).
  const [visualUrls, recipeCounts] = await Promise.all([
    Promise.all(sources.map((source) => getApprovedVisualUrl("source", source.id))),
    Promise.all(sources.map((source) => getRecipeCountForSource(source.id))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Entreprises" }]} />

      <EditorialTitle>Entreprises</EditorialTitle>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((source, index) => (
          <SourceCard
            key={source.id}
            name={source.name}
            recipeCount={recipeCounts[index]}
            imageUrl={visualUrls[index] ?? undefined}
            href={`/entreprises/${source.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
