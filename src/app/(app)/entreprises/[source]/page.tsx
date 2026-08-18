/**
 * Page d'une entreprise (C3) : ses catégories locales (jamais vides,
 * jamais celles d'une autre source) et, si le modèle le permet
 * (`sourceCategoryId` nullable), ses recettes sans catégorie affichées
 * directement ici. C'est le cas de toutes les sources hors Hennessy dans le
 * jeu démo : elles n'ont aucune catégorie, donc toutes leurs recettes
 * apparaissent ici sans classement.
 */

import { notFound } from "next/navigation";
import { ApprovedVisual } from "@/components/ui/ApprovedVisual";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { IllustrationAction } from "@/components/ui/IllustrationAction";
import { CategoryCard } from "@/components/cards/CategoryCard";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getCategoriesForSource, getRecipeCountForCategory } from "@/lib/data/categories";
import { getRecipesWithoutCategoryForSource, toRecipeCardData } from "@/lib/data/recipes";
import { getSourceBySlug } from "@/lib/data/sources";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";

export default async function EntreprisePage({ params }: { params: Promise<{ source: string }> }) {
  const { source: sourceSlug } = await params;
  const source = await getSourceBySlug(sourceSlug);
  if (!source) notFound();

  const categoriesUnfiltered = await getCategoriesForSource(source.id);
  const categoryCounts = await Promise.all(
    categoriesUnfiltered.map((category) => getRecipeCountForCategory(category.id)),
  );
  const categoriesRaw = categoriesUnfiltered
    .map((category, index) => ({ ...category, recipeCount: categoryCounts[index] }))
    // Une catégorie sans recette ne s'affiche pas (CLAUDE.md, aucune section vide).
    .filter((category) => category.recipeCount > 0);

  const uncategorizedRecipes = await getRecipesWithoutCategoryForSource(sourceSlug);
  // Visuels de l'entreprise et de ses catégories résolus ici (page serveur),
  // même patron que la fiche matière première. Le visuel de chaque RECETTE,
  // lui, vient uniquement de `toRecipeCardData` (`recipes.ts`, seule source
  // de `imageUrl` — jamais résolu une deuxième fois ici).
  const [portrait, hasApprovedVisual, categoryVisualUrls, uncategorizedCardData] = await Promise.all([
    ApprovedVisual({ subjectType: "source", subjectId: source.id, alt: source.name, ratio: "1:1" }),
    getApprovedVisualUrl("source", source.id)
      .then((url) => url !== null)
      .catch(() => false),
    Promise.all(categoriesRaw.map((category) => getApprovedVisualUrl("sourceCategory", category.id))),
    Promise.all(uncategorizedRecipes.map((recipe) => toRecipeCardData(recipe))),
  ]);
  const categories = categoriesRaw.map((category, index) => ({
    ...category,
    imageUrl: categoryVisualUrls[index],
  }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Entreprises", href: "/entreprises" },
          { label: source.name },
        ]}
      />

      <div className="flex items-center gap-4">
        <div className="w-20 shrink-0 sm:w-24">{portrait}</div>
        <EditorialTitle>{source.name}</EditorialTitle>
      </div>

      <IllustrationAction subjectType="source" hasVisual={hasApprovedVisual} label={source.name} />

      {categories.length === 0 && uncategorizedRecipes.length === 0 && (
        <EmptyState message="Aucune recette pour cette entreprise pour le moment." />
      )}

      {categories.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.name}
              recipeCount={category.recipeCount}
              imageUrl={category.imageUrl}
              href={`/entreprises/${source.slug}/${category.slug}`}
            />
          ))}
        </div>
      )}

      {uncategorizedRecipes.length > 0 && (
        <div className="flex flex-col gap-3">
          {categories.length > 0 && <EditorialTitle as="h2">Autres recettes</EditorialTitle>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {uncategorizedRecipes.map((recipe, index) => (
              <RecipeCard key={recipe.id} {...uncategorizedCardData[index]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
