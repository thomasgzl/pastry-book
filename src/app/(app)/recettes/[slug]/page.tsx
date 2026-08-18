/**
 * Fiche recette adaptative (C5). Assemble la recette (`getRecipeDetail`,
 * C6 dépendant) et ses spécificités (`getRecipeSpecificities`), puis délègue
 * l'affichage — coefficient compris — à `RecipeSheet`. Les allergènes ne sont
 * plus affichés sur la fiche : les données restent en base pour compatibilité
 * (`getRecipeAllergens` toujours disponible), simplement plus lues ici.
 */

import { notFound } from "next/navigation";
import { ApprovedVisual } from "@/components/ui/ApprovedVisual";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/Breadcrumb";
import type { BadgeStatus } from "@/components/ui/StatusBadge";
import { getRecipeDetail } from "@/lib/data/recipes";
import { getRecipeSpecificities, getSpecificities } from "@/lib/data/specificities";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";
import { RecipeSheet } from "./RecipeSheet";

/** `rejected` n'est jamais affiché (CLAUDE.md, principe 9) ; `SpecificityBadge` ne porte que `confirmed`/`proposed`. */
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

  const [allSpecificities, recipeSpecificities] = await Promise.all([
    getSpecificities(),
    getRecipeSpecificities(detail.recipe.id),
  ]);
  const specificityById = new Map(allSpecificities.map((specificity) => [specificity.id, specificity]));
  const specificities = recipeSpecificities.flatMap((entry) => {
    if (entry.status === "rejected") return [];
    const specificity = specificityById.get(entry.specificityId);
    if (!specificity) return [];
    return [{ id: specificity.id, name: specificity.name, status: toBadgeStatus(entry.status) }];
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
        recipeId={detail.recipe.id}
        slug={slug}
        title={detail.recipe.title}
        sourceName={detail.sourceName}
        categoryName={detail.categoryName}
        visual={visual}
        hasApprovedVisual={hasApprovedVisual}
        sections={detail.sections}
        specificities={specificities}
        keyIngredients={detail.keyIngredients}
        additionalInformation={detail.recipe.additionalInformation}
      />
    </div>
  );
}
