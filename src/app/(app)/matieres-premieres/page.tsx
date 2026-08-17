/**
 * Répertoire des matières premières normalisées (C7).
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { CanonicalIngredientCard } from "@/components/cards/CanonicalIngredientCard";
import { getCanonicalIngredients, getRecipeCountForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";
import { getLocalIngredientImage } from "@/lib/visuals/localIngredientImages";

export default async function MatieresPremieresPage() {
  const ingredients = await getCanonicalIngredients();
  const [visualUrls, recipeCounts] = await Promise.all([
    Promise.all(ingredients.map((ingredient) => getApprovedVisualUrl("ingredient", ingredient.id))),
    Promise.all(ingredients.map((ingredient) => getRecipeCountForCanonicalIngredient(ingredient.slug))),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Matières premières" }]} />

      <EditorialTitle>Matières premières</EditorialTitle>

      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ingredients.map((ingredient, index) => (
          <CanonicalIngredientCard
            key={ingredient.id}
            name={ingredient.name}
            recipeCount={recipeCounts[index]}
            imageUrl={visualUrls[index] ?? getLocalIngredientImage(ingredient.slug)}
            href={`/matieres-premieres/${ingredient.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
