/**
 * Recettes correspondant à une matière première (C7), toutes sources
 * confondues, retrouvées via les tags curatés `recipe_key_ingredients` — pas
 * une simple mention en ligne d'ingrédient — sans jamais modifier les
 * libellés d'origine, qui restent affichés tels quels sur la fiche recette.
 */

import { notFound } from "next/navigation";
import { ApprovedVisual } from "@/components/ui/ApprovedVisual";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { IllustrationAction } from "@/components/ui/IllustrationAction";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCanonicalIngredientBySlug, getRecipesForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { toRecipeCardData } from "@/lib/data/recipes";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";
import { getLocalIngredientImage } from "@/lib/visuals/localIngredientImages";

export default async function MatierePremierePage({ params }: { params: Promise<{ matiere: string }> }) {
  const { matiere: slug } = await params;
  const ingredient = await getCanonicalIngredientBySlug(slug);
  if (!ingredient) notFound();

  const recipesRaw = await getRecipesForCanonicalIngredient(slug);
  // Illustration botanique en tête de fiche (lot J7, correction P2) : visuel
  // approuvé si présent, repli placeholder botanique sinon — jamais absente.
  // Le visuel de chaque RECETTE, lui, vient uniquement de `toRecipeCardData`
  // (`recipes.ts`, seule source de `imageUrl` — jamais résolu une deuxième
  // fois ici).
  const [portrait, hasApprovedVisual, recipes] = await Promise.all([
    ApprovedVisual({
      subjectType: "ingredient",
      subjectId: ingredient.id,
      alt: ingredient.name,
      ratio: "1:1",
      localFallbackSrc: getLocalIngredientImage(ingredient.slug),
    }),
    getApprovedVisualUrl("ingredient", ingredient.id)
      .then((url) => url !== null)
      .catch(() => false),
    Promise.all(recipesRaw.map((recipe) => toRecipeCardData(recipe))),
  ]);

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

      <IllustrationAction subjectType="ingredient" hasVisual={hasApprovedVisual} label={ingredient.name} />

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
