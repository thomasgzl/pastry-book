/**
 * Recettes correspondant à une spécificité (C8) : recettes confirmées
 * d'abord, puis recettes proposées à vérifier (docs/03-USER_FLOWS.md § 4).
 * Aucune spécificité n'est jamais affichée comme certaine si elle n'est que
 * `proposed` (CLAUDE.md, principe 9) — `SpecificityBadge` porte cette
 * distinction sur chaque carte.
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SpecificityBadge } from "@/components/ui/StatusBadge";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { toRecipeCardData } from "@/lib/data/recipes";
import { getRecipeSpecificities, getRecipesForSpecificity, getSpecificityBySlug } from "@/lib/data/specificities";

export default async function SpecificitePage({ params }: { params: Promise<{ specificite: string }> }) {
  const { specificite: slug } = await params;
  const specificity = getSpecificityBySlug(slug);
  if (!specificity) notFound();

  const recipes = getRecipesForSpecificity(slug).map((recipe) => {
    const link = getRecipeSpecificities(recipe.id).find((entry) => entry.specificityId === specificity.id)!;
    return { recipe, status: link.status as "confirmed" | "proposed" };
  });

  const confirmed = recipes.filter((entry) => entry.status === "confirmed");
  const proposed = recipes.filter((entry) => entry.status !== "confirmed");

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Spécificités", href: "/specificites" },
          { label: specificity.name },
        ]}
      />

      <h1 className="font-serif text-2xl font-semibold text-cacao sm:text-3xl">{specificity.name}</h1>

      {recipes.length === 0 ? (
        <EmptyState message="Aucune recette pour cette spécificité pour le moment." />
      ) : (
        <>
          {confirmed.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {confirmed.map(({ recipe, status }) => (
                <div key={recipe.id} className="flex flex-col gap-2">
                  <RecipeCard {...toRecipeCardData(recipe)} />
                  <SpecificityBadge name={specificity.name} status={status} />
                </div>
              ))}
            </div>
          )}

          {proposed.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="font-serif text-lg font-semibold text-cacao">Proposées, à vérifier</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {proposed.map(({ recipe, status }) => (
                  <div key={recipe.id} className="flex flex-col gap-2">
                    <RecipeCard {...toRecipeCardData(recipe)} />
                    <SpecificityBadge name={specificity.name} status={status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
