/**
 * Liste des entreprises/sources (C3). Hennessy n'a ici aucun traitement
 * différent des autres sources — c'est une carte parmi d'autres.
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SourceCard } from "@/components/cards/SourceCard";
import { getRecipeCountForSource, getSources } from "@/lib/data/sources";

export default function EntreprisesPage() {
  const sources = getSources();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Entreprises" }]} />

      <EditorialTitle>Entreprises</EditorialTitle>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sources.map((source) => (
          <SourceCard
            key={source.id}
            name={source.name}
            recipeCount={getRecipeCountForSource(source.id)}
            imageUrl={source.illustrationUrl ?? undefined}
            href={`/entreprises/${source.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
