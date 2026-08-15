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
import { ApprovedVisual } from "@/components/ui/ApprovedVisual";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import type { BadgeStatus } from "@/components/ui/StatusBadge";
import { getRecipeDetail } from "@/lib/data/recipes";
import { getAllergens, getRecipeAllergens } from "@/lib/data/specificities";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";
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
  detail: NonNullable<Awaited<ReturnType<typeof getRecipeDetail>>>,
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

  const detail = await getRecipeDetail(slug);
  if (!detail) notFound();

  const [allAllergens, recipeAllergens] = await Promise.all([getAllergens(), getRecipeAllergens(detail.recipe.id)]);
  const allergenById = new Map(allAllergens.map((allergen) => [allergen.id, allergen]));
  const allergens = recipeAllergens.flatMap((entry) => {
    const allergen = allergenById.get(entry.allergenId);
    if (!allergen) return [];
    return [{ id: allergen.id, name: allergen.name, status: toBadgeStatus(entry.status) }];
  });

  // Visuel toujours affiché (K12) : visuel approuvé si présent, repli
  // placeholder botanique sinon — jamais absent, même règle que la carte
  // recette/la fiche matière première. `photoUrl` ne conditionne plus le
  // rendu : il ne décrit qu'un mode de génération (photo vs description),
  // pas la présence d'une illustration approuvée. Appelé directement (await)
  // plutôt qu'en JSX : ce composant async est résolu ici, côté serveur, avant
  // de franchir la frontière `"use client"` de `RecipeSheet` — un élément
  // JSX async non résolu ne peut pas être rendu par le reconciliateur client.
  const [visual, hasApprovedVisual] = await Promise.all([
    ApprovedVisual({ subjectType: "recipe", subjectId: detail.recipe.id, alt: detail.recipe.title, ratio: "4:3" }),
    getApprovedVisualUrl("recipe", detail.recipe.id)
      .then((url) => url !== null)
      // Lecture Storage/Supabase indisponible : dégrade vers « pas encore
      // illustrée » plutôt qu'un plantage — même repli silencieux que
      // `ApprovedVisual` pour cette information purement décorative.
      .catch(() => false),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Breadcrumb items={buildBreadcrumb(detail, from)} />
      <RecipeSheet
        title={detail.recipe.title}
        sourceName={detail.sourceName}
        categoryName={detail.categoryName}
        visual={visual}
        hasApprovedVisual={hasApprovedVisual}
        sections={detail.sections}
        allergens={allergens}
        keyIngredients={detail.keyIngredients}
        additionalInformation={detail.recipe.additionalInformation}
      />
    </div>
  );
}
