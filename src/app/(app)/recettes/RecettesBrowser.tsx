"use client";

/**
 * Répertoire des recettes (C4) — partie interactive. Recherche par titre et
 * filtre par source portés par l'URL (`?q=`, `?source=`) : `router.replace`
 * synchronise l'URL (filtre source à chaque clic ; recherche texte seulement
 * après le debounce de `SearchInput`, jamais par caractère — voir
 * `handleSearch`), `useSearchParams` en reste la source de vérité restaurée
 * au chargement/retour arrière. Le filtrage lui-même reste local et
 * instantané (`inputValue`), sans jamais attendre l'URL.
 *
 * K1 : les données (recettes, sources, compteurs, `RecipeCardData` déjà
 * résolue) sont chargées côté serveur par `page.tsx` — un Client Component
 * ne peut pas attendre une vraie requête Supabase de façon synchrone
 * pendant le rendu (même règle que `src/lib/import/store.ts`). Ce composant
 * ne fait plus que filtrer/afficher des données déjà résolues, sans jamais
 * appeler `src/lib/data/*` lui-même.
 */

import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { normalizeText } from "@/lib/recipes/search";
import type { RecipeCardData } from "@/lib/data/recipes";

export interface RecettesBrowserRecipe {
  id: string;
  title: string;
  sourceId: string;
  cardData: RecipeCardData;
}

export interface RecettesBrowserSource {
  id: string;
  slug: string;
  name: string;
  recipeCount: number;
}

interface RecettesBrowserProps {
  recipes: RecettesBrowserRecipe[];
  sources: RecettesBrowserSource[];
}

function RecettesContent({ recipes, sources }: RecettesBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const sourceFilter = searchParams.get("source") ?? "";

  // Filtrage 100 % local (déjà résolu côté serveur par `page.tsx`, aucun
  // aller-retour réseau) : la valeur affichée dans le champ peut donc rester
  // instantanée sans jamais désynchroniser le résultat. `q` (URL) ne sert
  // plus qu'à restaurer la recherche au chargement / retour arrière —
  // resynchronisé ici lors d'une navigation externe, jamais pendant la
  // frappe elle-même (l'URL n'est mise à jour qu'après le debounce de
  // `SearchInput`, voir `handleSearch`). Ajustement pendant le rendu plutôt
  // que dans un effet (patron React officiel « adjusting state when a prop
  // changes ») : évite le rendu supplémentaire qu'un `useEffect` déclencherait.
  const [inputValue, setInputValue] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setInputValue(q);
  }

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed !== q) updateParams({ q: trimmed });
  }

  // Filtre affiché uniquement si plus d'une source possède au moins une
  // recette (sinon il ne pourrait jamais changer le résultat).
  const sourcesWithRecipes = sources.filter((source) => source.recipeCount > 0);
  const showSourceFilter = sourcesWithRecipes.length > 1;

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesQuery = !inputValue.trim() || normalizeText(recipe.title).includes(normalizeText(inputValue));
    const source = sourcesWithRecipes.find((candidate) => candidate.id === recipe.sourceId);
    const matchesSource = !sourceFilter || source?.slug === sourceFilter;
    return matchesQuery && matchesSource;
  });

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Recettes" }]} />

      <EditorialTitle>Recettes</EditorialTitle>

      <SearchInput
        value={inputValue}
        onChange={setInputValue}
        onSearch={handleSearch}
        debounceMs={350}
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
            <RecipeCard key={recipe.id} {...recipe.cardData} />
          ))}
        </div>
      )}
    </div>
  );
}

export function RecettesBrowser(props: RecettesBrowserProps) {
  // useSearchParams impose une frontière Suspense (App Router).
  return (
    <Suspense fallback={null}>
      <RecettesContent {...props} />
    </Suspense>
  );
}
