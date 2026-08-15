/**
 * Recettes correspondant à une matière première (C7), toutes sources
 * confondues, retrouvées via alias (« jus de citron », « zeste de citron »,
 * « purée de citron » → Citron) sans jamais modifier ces libellés — ils
 * restent affichés tels quels sur la fiche recette (C5, batch suivant).
 */

import { notFound } from "next/navigation";
import { ApprovedVisual } from "@/components/ui/ApprovedVisual";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCanonicalIngredientBySlug, getRecipesForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { toRecipeCardData } from "@/lib/data/recipes";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";

export default async function MatierePremierePage({ params }: { params: Promise<{ matiere: string }> }) {
  const { matiere: slug } = await params;
  const ingredient = await getCanonicalIngredientBySlug(slug);
  if (!ingredient) notFound();

  const recipesRaw = await getRecipesForCanonicalIngredient(slug);
  // Illustration botanique en tête de fiche (lot J7, correction P2) : visuel
  // approuvé si présent, repli placeholder botanique sinon — jamais absente.
  const [portrait, recipeVisualUrls, cardData] = await Promise.all([
    ApprovedVisual({ subjectType: "ingredient", subjectId: ingredient.id, alt: ingredient.name, ratio: "1:1" }),
    Promise.all(recipesRaw.map((recipe) => getApprovedVisualUrl("recipe", recipe.id))),
    Promise.all(recipesRaw.map((recipe) => toRecipeCardData(recipe))),
  ]);
  const recipes = recipesRaw.map((recipe, index) => ({
    ...cardData[index],
    imageUrl: recipeVisualUrls[index],
  }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Matières premières", href: "/matieres-premieres" },
          { label: ingredient.name },
        ]}
      />

      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0 sm:w-24">{portrait}</div>
        <EditorialTitle>{ingredient.name}</EditorialTitle>
      </div>

      {recipes.length === 0 ? (
        <EmptyState message="Aucune recette ne contient cette matière première pour le moment." />
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
