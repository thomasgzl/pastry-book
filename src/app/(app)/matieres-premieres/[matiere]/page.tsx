/**
 * Recettes correspondant à une matière première (C7), toutes sources
 * confondues, retrouvées via alias (« jus de citron », « zeste de citron »,
 * « purée de citron » → Citron) sans jamais modifier ces libellés — ils
 * restent affichés tels quels sur la fiche recette (C5, batch suivant).
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCanonicalIngredientBySlug, getRecipesForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { toRecipeCardData } from "@/lib/data/recipes";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";

export default async function MatierePremierePage({ params }: { params: Promise<{ matiere: string }> }) {
  const { matiere: slug } = await params;
  const ingredient = getCanonicalIngredientBySlug(slug);
  if (!ingredient) notFound();

  const recipes = getRecipesForCanonicalIngredient(slug).map(toRecipeCardData);
  const primaryVisual = getPrimaryVisualAsset("ingredient", ingredient.id);

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
        {primaryVisual && (
          // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas de pipeline next/image dédié (lot E).
          <img src={primaryVisual.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg border border-grise bg-ivoire object-contain" />
        )}
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
