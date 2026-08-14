/**
 * Recettes d'une catégorie précise, propre à son entreprise (C3).
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getRecipesByCategory, toRecipeCardData } from "@/lib/data/recipes";
import { getSourceBySlug } from "@/lib/data/sources";

export default async function CategoriePage({
  params,
}: {
  params: Promise<{ source: string; categorie: string }>;
}) {
  const { source: sourceSlug, categorie: categorySlug } = await params;
  const source = getSourceBySlug(sourceSlug);
  if (!source) notFound();

  const category = getCategoryBySlug(source.id, categorySlug);
  if (!category) notFound();

  const recipes = getRecipesByCategory(sourceSlug, categorySlug).map(toRecipeCardData);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Entreprises", href: "/entreprises" },
          { label: source.name, href: `/entreprises/${source.slug}` },
          { label: category.name },
        ]}
      />

      <EditorialTitle>{category.name}</EditorialTitle>

      {recipes.length === 0 ? (
        <EmptyState message="Aucune recette pour cette catégorie pour le moment." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.href} {...recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
