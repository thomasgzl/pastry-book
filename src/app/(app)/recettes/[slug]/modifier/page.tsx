/**
 * Modification manuelle d'une recette déjà enregistrée. Server Component :
 * charge la recette, ses données brutes d'édition (`getRecipeEditData`) et
 * les référentiels, construit le brouillon initial (`buildEditDraft`), puis
 * délègue la saisie à `RecipeEditForm` (Client Component) — même
 * architecture que `/importer` (formulaire côté client, écriture via Server
 * Action, jamais de secret exposé au navigateur).
 */

import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { getRecipeEditData } from "@/lib/data/recipes";
import { getCategoriesForSource } from "@/lib/data/categories";
import { getRecipeSpecificities, getSpecificities } from "@/lib/data/specificities";
import { getSources } from "@/lib/data/sources";
import { getCanonicalIngredients } from "@/lib/data/canonical-ingredients";
import { buildEditDraft } from "@/lib/recipes/editDraft";
import { RecipeEditForm } from "./RecipeEditForm";

export default async function ModifierRecettePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const editData = await getRecipeEditData(slug);
  if (!editData) notFound();

  const [sources, canonicalIngredients, specificities, recipeSpecificities, initialCategories] = await Promise.all([
    getSources(),
    getCanonicalIngredients(),
    getSpecificities(),
    getRecipeSpecificities(editData.recipe.id),
    getCategoriesForSource(editData.recipe.sourceId),
  ]);

  const draft = buildEditDraft(editData, recipeSpecificities);

  const breadcrumb: BreadcrumbItem[] = [
    { label: "Accueil", href: "/" },
    { label: "Recettes", href: "/recettes" },
    { label: editData.recipe.title, href: `/recettes/${slug}` },
    { label: "Modifier" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb items={breadcrumb} />
      <RecipeEditForm
        recipeId={editData.recipe.id}
        slug={slug}
        initialDraft={draft}
        initialCategories={initialCategories}
        sources={sources}
        canonicalIngredients={canonicalIngredients}
        specificities={specificities}
      />
    </div>
  );
}
