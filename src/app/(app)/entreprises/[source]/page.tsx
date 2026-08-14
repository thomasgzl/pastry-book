/**
 * Page d'une entreprise (C3) : ses catégories locales (jamais vides,
 * jamais celles d'une autre source) et, si le modèle le permet
 * (`sourceCategoryId` nullable), ses recettes sans catégorie affichées
 * directement ici. C'est le cas de toutes les sources hors Hennessy dans le
 * jeu démo : elles n'ont aucune catégorie, donc toutes leurs recettes
 * apparaissent ici sans classement.
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCategoriesForSource, getRecipeCountForCategory } from "@/lib/data/categories";
import { getRecipesWithoutCategoryForSource, toRecipeCardData } from "@/lib/data/recipes";
import { getSourceBySlug } from "@/lib/data/sources";

export default async function EntreprisePage({ params }: { params: Promise<{ source: string }> }) {
  const { source: sourceSlug } = await params;
  const source = getSourceBySlug(sourceSlug);
  if (!source) notFound();

  const categories = getCategoriesForSource(source.id)
    .map((category) => ({ ...category, recipeCount: getRecipeCountForCategory(category.id) }))
    // Une catégorie sans recette ne s'affiche pas (CLAUDE.md, aucune section vide).
    .filter((category) => category.recipeCount > 0);

  const uncategorizedRecipes = getRecipesWithoutCategoryForSource(sourceSlug);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Entreprises", href: "/entreprises" },
          { label: source.name },
        ]}
      />

      <h1 className="font-serif text-2xl font-semibold text-cacao sm:text-3xl">{source.name}</h1>

      {categories.length === 0 && uncategorizedRecipes.length === 0 && (
        <EmptyState message="Aucune recette pour cette entreprise pour le moment." />
      )}

      {categories.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.name}
              recipeCount={category.recipeCount}
              href={`/entreprises/${source.slug}/${category.slug}`}
            />
          ))}
        </div>
      )}

      {uncategorizedRecipes.length > 0 && (
        <div className="flex flex-col gap-3">
          {categories.length > 0 && (
            <h2 className="font-serif text-lg font-semibold text-cacao">Autres recettes</h2>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {uncategorizedRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} {...toRecipeCardData(recipe)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
