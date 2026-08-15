/**
 * Spécificités et allergènes (C8) : deux sections séparées, jamais
 * mélangées (CLAUDE.md, principe 9 ; docs/02-INFORMATION_ARCHITECTURE.md).
 */

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { getAllergens, getRecipesForAllergen, getRecipesForSpecificity, getSpecificities } from "@/lib/data/specificities";

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
  const allergens = await getAllergens();
  const [specificityCounts, allergenCounts] = await Promise.all([
    Promise.all(specificities.map((specificity) => getRecipesForSpecificity(specificity.slug))),
    Promise.all(allergens.map((allergen) => getRecipesForAllergen(allergen.slug))),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Spécificités" }]} />
        <EditorialTitle>Spécificités et allergènes</EditorialTitle>
      </div>

      <section className="flex flex-col gap-3">
        <EditorialTitle as="h2">Spécificités</EditorialTitle>
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
      </section>

      <section className="flex flex-col gap-3">
        <EditorialTitle as="h2">Allergènes</EditorialTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allergens.map((allergen, index) => (
            <EntryCard
              key={allergen.id}
              name={allergen.name}
              recipeCount={allergenCounts[index].length}
              href={`/specificites/allergenes/${allergen.slug}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
