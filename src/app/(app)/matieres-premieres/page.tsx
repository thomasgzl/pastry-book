/**
 * Répertoire des matières premières normalisées (C7).
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CanonicalIngredientCard } from "@/components/cards/CanonicalIngredientCard";
import { getCanonicalIngredients, getRecipeCountForCanonicalIngredient } from "@/lib/data/canonical-ingredients";

export default function MatieresPremieresPage() {
  const ingredients = getCanonicalIngredients();

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Matières premières" }]} />

      <h1 className="font-serif text-2xl font-semibold text-cacao sm:text-3xl">Matières premières</h1>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ingredients.map((ingredient) => (
          <CanonicalIngredientCard
            key={ingredient.id}
            name={ingredient.name}
            recipeCount={getRecipeCountForCanonicalIngredient(ingredient.slug)}
            href={`/matieres-premieres/${ingredient.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
