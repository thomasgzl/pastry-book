/**
 * Fiche recette adaptative (C5). Assemble la recette (`getRecipeDetail`,
 * C6 dépendant) et ses allergènes (`getRecipeAllergens`, réutilisé de C8),
 * puis délègue l'affichage — coefficient compris — à `RecipeSheet`.
 *
 * Les spécificités (vegan, sans gluten…) ne font PAS partie de l'ordre
 * d'affichage demandé pour cette fiche (seulement les allergènes) : voir
 * la tâche C5, `getRecipeSpecificities` n'est donc pas utilisé ici.
 */

import { notFound } from "next/navigation";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import type { BadgeStatus } from "@/components/ui/StatusBadge";
import { getRecipeDetail } from "@/lib/data/recipes";
import { getAllergens, getRecipeAllergens } from "@/lib/data/specificities";
import { RecipeSheet } from "./RecipeSheet";

/**
 * `AllergenBadge` ne porte que deux états visuels (`confirmed`/`proposed`).
 * `needs_review` — un allergène détecté mais dont la liaison reste à
 * vérifier — est donc affiché comme `proposed`, jamais comme `confirmed`
 * (même choix que `specificites/allergenes/[allergene]/page.tsx`, C8).
 */
function toBadgeStatus(status: string): BadgeStatus {
  return status === "confirmed" ? "confirmed" : "proposed";
}

function buildBreadcrumb(
  detail: NonNullable<ReturnType<typeof getRecipeDetail>>,
  from: string | undefined,
): BreadcrumbItem[] {
  if (from === "recettes") {
    return [
      { label: "Accueil", href: "/" },
      { label: "Recettes", href: "/recettes" },
      { label: detail.recipe.title },
    ];
  }

  const items: BreadcrumbItem[] = [
    { label: "Accueil", href: "/" },
    { label: "Entreprises", href: "/entreprises" },
    { label: detail.sourceName, href: `/entreprises/${detail.sourceSlug}` },
  ];
  if (detail.categoryName && detail.categorySlug) {
    items.push({
      label: detail.categoryName,
      href: `/entreprises/${detail.sourceSlug}/${detail.categorySlug}`,
    });
  }
  items.push({ label: detail.recipe.title });
  return items;
}

export default async function RecettePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;

  const detail = getRecipeDetail(slug);
  if (!detail) notFound();

  const allergenById = new Map(getAllergens().map((allergen) => [allergen.id, allergen]));
  const allergens = getRecipeAllergens(detail.recipe.id).flatMap((entry) => {
    const allergen = allergenById.get(entry.allergenId);
    if (!allergen) return [];
    return [{ id: allergen.id, name: allergen.name, status: toBadgeStatus(entry.status) }];
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={buildBreadcrumb(detail, from)} />
      <RecipeSheet
        title={detail.recipe.title}
        sourceName={detail.sourceName}
        categoryName={detail.categoryName}
        photoUrl={detail.recipe.photoUrl ?? undefined}
        sections={detail.sections}
        allergens={allergens}
        keyIngredients={detail.keyIngredients}
        additionalInformation={detail.recipe.additionalInformation}
      />
    </div>
  );
}
