/**
 * Recettes portant un allergène détecté (C8). Aucune trace ni contamination
 * croisée n'est jamais déduite ici (CLAUDE.md, principe 9) : seules les
 * liaisons explicitement enregistrées (`recipe_allergens`) sont affichées,
 * avec leur état exact.
 */

import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { AllergenBadge, type BadgeStatus } from "@/components/ui/StatusBadge";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { toRecipeCardData } from "@/lib/data/recipes";
import { getAllergenBySlug, getRecipeAllergens, getRecipesForAllergen } from "@/lib/data/specificities";

/**
 * `AllergenBadge` ne porte que deux états visuels (`confirmed`/`proposed`,
 * CLAUDE.md principe 9 : jamais présenté comme certain hors confirmation
 * explicite). `needs_review` — un allergène détecté mais dont la liaison à
 * l'ingrédient reste à vérifier — est donc affiché comme `proposed`
 * (« à vérifier »), jamais comme `confirmed`.
 */
function toBadgeStatus(status: string): BadgeStatus {
  return status === "confirmed" ? "confirmed" : "proposed";
}

export default async function AllergenePage({ params }: { params: Promise<{ allergene: string }> }) {
  const { allergene: slug } = await params;
  const allergen = getAllergenBySlug(slug);
  if (!allergen) notFound();

  const recipes = getRecipesForAllergen(slug).map((recipe) => {
    const link = getRecipeAllergens(recipe.id).find((entry) => entry.allergenId === allergen.id)!;
    return { recipe, status: toBadgeStatus(link.status) };
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Spécificités", href: "/specificites" },
          { label: allergen.name },
        ]}
      />

      <EditorialTitle>{allergen.name}</EditorialTitle>

      {recipes.length === 0 ? (
        <EmptyState message="Aucune recette avec cet allergène pour le moment." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map(({ recipe, status }) => (
            <div key={recipe.id} className="flex flex-col gap-2">
              <RecipeCard {...toRecipeCardData(recipe)} />
              <AllergenBadge name={allergen.name} status={status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
