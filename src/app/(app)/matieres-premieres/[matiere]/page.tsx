/**
 * Recettes correspondant à une matière première (C7), toutes sources
 * confondues, retrouvées via alias (« jus de citron », « zeste de citron »,
 * « purée de citron » → Citron) sans jamais modifier ces libellés — ils
 * restent affichés tels quels sur la fiche recette (C5, batch suivant).
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCanonicalIngredientBySlug, getRecipesForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { toRecipeCardData } from "@/lib/data/recipes";

export default async function MatierePremierePage({ params }: { params: Promise<{ matiere: string }> }) {
  const { matiere: slug } = await params;
  const ingredient = getCanonicalIngredientBySlug(slug);
  if (!ingredient) notFound();

  const recipes = getRecipesForCanonicalIngredient(slug).map(toRecipeCardData);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Matières premières", href: "/matieres-premieres" },
          { label: ingredient.name },
        ]}
      />

      <h1 className="font-serif text-2xl font-semibold text-cacao sm:text-3xl">{ingredient.name}</h1>

      {recipes.length === 0 ? (
        <EmptyState message="Aucune recette ne contient cette matière première pour le moment." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.href} {...recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
