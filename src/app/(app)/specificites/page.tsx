/**
 * Spécificités et allergènes (C8) : deux sections séparées, jamais
 * mélangées (CLAUDE.md, principe 9 ; docs/02-INFORMATION_ARCHITECTURE.md).
 */

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
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

export default function SpecificitesPage() {
  const specificities = getSpecificities();
  const allergens = getAllergens();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Spécificités" }]} />
        <h1 className="font-serif text-2xl font-semibold text-cacao sm:text-3xl">Spécificités et allergènes</h1>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-cacao">Spécificités</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {specificities.map((specificity) => (
            <EntryCard
              key={specificity.id}
              name={specificity.name}
              recipeCount={getRecipesForSpecificity(specificity.slug).length}
              href={`/specificites/${specificity.slug}`}
            />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-lg font-semibold text-cacao">Allergènes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {allergens.map((allergen) => (
            <EntryCard
              key={allergen.id}
              name={allergen.name}
              recipeCount={getRecipesForAllergen(allergen.slug).length}
              href={`/specificites/allergenes/${allergen.slug}`}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
