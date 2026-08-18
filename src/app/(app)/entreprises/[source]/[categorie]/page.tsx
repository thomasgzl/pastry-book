/**
 * Recettes d'une catégorie précise, propre à son entreprise (C3).
 */

import { notFound } from "next/navigation";
import { ApprovedVisual } from "@/components/ui/ApprovedVisual";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { IllustrationAction } from "@/components/ui/IllustrationAction";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getRecipesByCategory, toRecipeCardData } from "@/lib/data/recipes";
import { getSourceBySlug } from "@/lib/data/sources";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";

export default async function CategoriePage({
  params,
}: {
  params: Promise<{ source: string; categorie: string }>;
}) {
  const { source: sourceSlug, categorie: categorySlug } = await params;
  const source = await getSourceBySlug(sourceSlug);
  if (!source) notFound();

  const category = await getCategoryBySlug(source.id, categorySlug);
  if (!category) notFound();

  const recipesRaw = await getRecipesByCategory(sourceSlug, categorySlug);
  // Visuel de catégorie (en-tête) résolu ici (page serveur), même patron que
  // la fiche matière première/la page entreprise. Le visuel de chaque
  // RECETTE, lui, vient uniquement de `toRecipeCardData` (`recipes.ts`,
  // seule source de `imageUrl` — jamais résolu une deuxième fois ici).
  const [portrait, hasApprovedVisual, cardData] = await Promise.all([
    ApprovedVisual({ subjectType: "sourceCategory", subjectId: category.id, alt: category.name, ratio: "1:1" }),
    getApprovedVisualUrl("sourceCategory", category.id)
      .then((url) => url !== null)
      .catch(() => false),
    Promise.all(recipesRaw.map((recipe) => toRecipeCardData(recipe))),
  ]);
  const recipes = cardData;

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

      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0 sm:w-24">{portrait}</div>
        <EditorialTitle>{category.name}</EditorialTitle>
      </div>

      <IllustrationAction subjectType="sourceCategory" hasVisual={hasApprovedVisual} label={category.name} />

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
