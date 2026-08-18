/**
 * Spécificités (C8) — les allergènes ne sont plus affichés dans
 * l'interface : `getSpecificities` reste la seule source, déjà restreinte
 * aux quatre spécificités exposées (voir `src/lib/data/specificities.ts`).
 * Les données allergènes existantes ne sont ni supprimées ni modifiées, elles
 * cessent simplement d'être lues ici.
 */

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { getRecipesForSpecificity, getSpecificities } from "@/lib/data/specificities";

function EntryCard({ name, recipeCount, href }: { name: string; recipeCount: number; href: string }) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
      <Card className="flex items-center justify-between gap-3 transition-colors hover:bg-avoine/40">
        <p className="font-serif text-base font-semibold text-cacao">{name}</p>
        <p className="shrink-0 text-sm text-cacao/70">
          {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
        </p>
      </Card>
    </Link>
  );
}

export default async function SpecificitesPage() {
  const specificities = await getSpecificities();
  const specificityCounts = await Promise.all(
    specificities.map((specificity) => getRecipesForSpecificity(specificity.slug)),
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Spécificités" }]} />
      <EditorialTitle>Spécificités</EditorialTitle>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {specificities.map((specificity, index) => (
          <EntryCard
            key={specificity.id}
            name={specificity.name}
            recipeCount={specificityCounts[index].length}
            href={`/specificites/${specificity.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
