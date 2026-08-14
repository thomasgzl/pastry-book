/**
 * Répertoire des matières premières normalisées (C7).
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { CanonicalIngredientCard } from "@/components/cards/CanonicalIngredientCard";
import { getCanonicalIngredients, getRecipeCountForCanonicalIngredient } from "@/lib/data/canonical-ingredients";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";

export default async function MatieresPremieresPage() {
  const ingredients = getCanonicalIngredients();
  const primaryVisuals = await Promise.all(
    ingredients.map((ingredient) => getPrimaryVisualAsset("ingredient", ingredient.id)),
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Matières premières" }]} />

      <EditorialTitle>Matières premières</EditorialTitle>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ingredients.map((ingredient, index) => (
          <CanonicalIngredientCard
            key={ingredient.id}
            name={ingredient.name}
            recipeCount={getRecipeCountForCanonicalIngredient(ingredient.slug)}
            imageUrl={primaryVisuals[index]?.imageUrl}
            href={`/matieres-premieres/${ingredient.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
