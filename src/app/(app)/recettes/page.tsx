/**
 * Répertoire des recettes (C4) — chargement des données (K1 : Server
 * Component, lit `src/lib/data/*`, Supabase en Preview/Production sinon
 * démo). Le filtrage/recherche interactif (`?q=`, `?source=`) reste dans
 * `RecettesBrowser` (Client Component) : voir ce fichier pour le détail.
 */

import { getRecipes, toRecipeCardData } from "@/lib/data/recipes";
import { getRecipeCountForSource, getSources } from "@/lib/data/sources";
import { RecettesBrowser } from "./RecettesBrowser";

export default async function RecettesPage() {
  const [recipes, sources] = await Promise.all([getRecipes(), getSources()]);
  const [cardDataList, recipeCounts] = await Promise.all([
    Promise.all(recipes.map((recipe) => toRecipeCardData(recipe))),
    Promise.all(sources.map((source) => getRecipeCountForSource(source.id))),
  ]);

  return (
    <RecettesBrowser
      recipes={recipes.map((recipe, index) => ({
        id: recipe.id,
        title: recipe.title,
        sourceId: recipe.sourceId,
        cardData: cardDataList[index],
      }))}
      sources={sources.map((source, index) => ({
        id: source.id,
        slug: source.slug,
        name: source.name,
        recipeCount: recipeCounts[index],
      }))}
    />
  );
}
