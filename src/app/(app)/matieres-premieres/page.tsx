/**
 * Répertoire des matières premières normalisées (C7).
 */

import { MatieresPremieresBrowser } from "./MatieresPremieresBrowser";
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
    <MatieresPremieresBrowser
      ingredients={ingredients.map((ingredient, index) => ({
        id: ingredient.id,
        name: ingredient.name,
        recipeCount: recipeCounts[index],
        imageUrl: visualUrls[index] ?? getLocalIngredientImage(ingredient.slug),
        href: `/matieres-premieres/${ingredient.slug}`,
      }))}
    />
  );
}
