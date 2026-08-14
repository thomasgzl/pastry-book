"use client";

/**
 * Répertoire des recettes (C4). Recherche par titre et filtre par source
 * portés par l'URL (`?q=`, `?source=`), jamais par un état React local
 * perdu à la navigation : `router.replace` met à jour l'URL à chaque
 * changement, `useSearchParams` en reste la seule source de vérité. Ainsi,
 * revenir depuis une fiche recette (bouton précédent du navigateur)
 * retrouve exactement les mêmes filtres.
 */

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getRecipes, toRecipeCardData } from "@/lib/data/recipes";
import { getRecipeCountForSource, getSources } from "@/lib/data/sources";
import { normalizeText } from "@/lib/recipes/search";

function RecettesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const sourceFilter = searchParams.get("source") ?? "";

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Filtre affiché uniquement si plus d'une source possède au moins une
  // recette (sinon il ne pourrait jamais changer le résultat).
  const sourcesWithRecipes = getSources().filter((source) => getRecipeCountForSource(source.id) > 0);
  const showSourceFilter = sourcesWithRecipes.length > 1;

  const filteredRecipes = getRecipes().filter((recipe) => {
    const matchesQuery = !q || normalizeText(recipe.title).includes(normalizeText(q));
    const source = sourcesWithRecipes.find((candidate) => candidate.id === recipe.sourceId);
    const matchesSource = !sourceFilter || source?.slug === sourceFilter;
    return matchesQuery && matchesSource;
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Recettes" }]} />

      <EditorialTitle>Recettes</EditorialTitle>

      <SearchInput
        value={q}
        onChange={(value) => updateParams({ q: value })}
        label="Rechercher une recette par titre"
        placeholder="Rechercher une recette…"
        className="w-full max-w-md sm:max-w-lg lg:max-w-xl"
      />

      {showSourceFilter && (
        <div role="group" aria-label="Filtrer par entreprise" className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={sourceFilter === "" ? "primary" : "secondary"}
            onClick={() => updateParams({ source: "" })}
          >
            Toutes les entreprises
          </Button>
          {sourcesWithRecipes.map((source) => (
            <Button
              key={source.id}
              type="button"
              variant={sourceFilter === source.slug ? "primary" : "secondary"}
              onClick={() => updateParams({ source: source.slug })}
            >
              {source.name}
            </Button>
          ))}
        </div>
      )}

      {filteredRecipes.length === 0 ? (
        <EmptyState message="Aucune recette ne correspond à cette recherche." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} {...toRecipeCardData(recipe)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecettesPage() {
  // useSearchParams impose une frontière Suspense (App Router).
  return (
    <Suspense fallback={null}>
      <RecettesContent />
    </Suspense>
  );
}
