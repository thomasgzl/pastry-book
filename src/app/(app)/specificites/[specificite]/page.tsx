/**
 * Recettes correspondant à une spécificité (C8) : recettes confirmées
 * d'abord, puis recettes proposées à vérifier (docs/03-USER_FLOWS.md § 4).
 * Aucune spécificité n'est jamais affichée comme certaine si elle n'est que
 * `proposed` (CLAUDE.md, principe 9) — `SpecificityBadge` porte cette
 * distinction sur chaque carte.
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SpecificityBadge } from "@/components/ui/StatusBadge";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { toRecipeCardData } from "@/lib/data/recipes";
import { getRecipeSpecificities, getRecipesForSpecificity, getSpecificityBySlug } from "@/lib/data/specificities";

export default async function SpecificitePage({ params }: { params: Promise<{ specificite: string }> }) {
  const { specificite: slug } = await params;
  const specificity = await getSpecificityBySlug(slug);
  if (!specificity) notFound();

  const recipesForSpecificity = await getRecipesForSpecificity(slug);
  const recipes = await Promise.all(
    recipesForSpecificity.map(async (recipe) => {
      const [links, cardData] = await Promise.all([getRecipeSpecificities(recipe.id), toRecipeCardData(recipe)]);
      const link = links.find((entry) => entry.specificityId === specificity.id)!;
      return { recipe, status: link.status as "confirmed" | "proposed", cardData };
    }),
  );

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

      <EditorialTitle>{specificity.name}</EditorialTitle>

      {recipes.length === 0 ? (
        <EmptyState message="Aucune recette pour cette spécificité pour le moment." />
      ) : (
        <>
          {confirmed.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {confirmed.map(({ recipe, status, cardData }) => (
                <div key={recipe.id} className="flex flex-col gap-2">
                  <RecipeCard {...cardData} />
                  <SpecificityBadge name={specificity.name} status={status} />
                </div>
              ))}
            </div>
          )}

          {proposed.length > 0 && (
            <div className="flex flex-col gap-3">
              <EditorialTitle as="h2">Proposées, à vérifier</EditorialTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {proposed.map(({ recipe, status, cardData }) => (
                  <div key={recipe.id} className="flex flex-col gap-2">
                    <RecipeCard {...cardData} />
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
