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

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { RecipeCard } from "@/components/cards/RecipeCard";
import { EmptyState } from "@/components/states/EmptyState";
import { normalizeText } from "@/lib/recipes/search";
import type { RecipeCardData } from "@/lib/data/recipes";

/**
 * ~10 recettes par page (demande produit), arrondi à 12 — plus petit multiple
 * commun des largeurs de grille (2/3/4 colonnes selon le format d'écran,
 * `min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` ci-dessous) : chaque
 * page affiche des lignes complètes quel que soit l'appareil, jamais une
 * dernière ligne tronquée au milieu d'une page — seule la toute dernière
 * page de la liste peut être incomplète. Liste déjà résolue côté serveur,
 * pagination purement locale.
 */
const PAGE_SIZE = 12;

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
    // Toute recherche repart de la page 1 : la page mémorisée dans l'URL
    // n'a plus de sens pour un résultat filtré différent.
    if (trimmed !== q) updateParams({ q: trimmed, page: "" });
  }

  // Filtre affiché uniquement si plus d'une source possède au moins une
  // recette (sinon il ne pourrait jamais changer le résultat).
  const sourcesWithRecipes = sources.filter((source) => source.recipeCount > 0);
  const showSourceFilter = sourcesWithRecipes.length > 1;

  // Mémoïsé : sert de dépendance à l'effet de préchargement ci-dessous, qui
  // ne doit se redéclencher que si le résultat filtré change réellement, pas
  // à chaque rendu (un `.filter()` inline recréerait un tableau à chaque fois).
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) => {
        const matchesQuery = !inputValue.trim() || normalizeText(recipe.title).includes(normalizeText(inputValue));
        const source = sourcesWithRecipes.find((candidate) => candidate.id === recipe.sourceId);
        const matchesSource = !sourceFilter || source?.slug === sourceFilter;
        return matchesQuery && matchesSource;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipes, inputValue, sourceFilter],
  );

  const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const totalPages = Math.max(1, Math.ceil(filteredRecipes.length / PAGE_SIZE));
  // Se recale silencieusement sur la dernière page valide plutôt qu'une liste
  // vide (ex. retour arrière après un filtre qui a réduit le résultat).
  const page = Math.min(requestedPage, totalPages);
  const paginatedRecipes = filteredRecipes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Précharge les images des pages voisines (précédente/suivante) pendant que
  // la personne consulte la page courante : au clic sur Précédent/Suivant,
  // l'image est déjà en cache navigateur, jamais un blanc le temps du
  // téléchargement (K-pagination). Uniquement les pages qui existent
  // réellement — jamais au-delà de `totalPages`.
  useEffect(() => {
    const adjacentPages = [page - 1, page + 1].filter((candidate) => candidate >= 1 && candidate <= totalPages);
    const urls = adjacentPages
      .flatMap((candidate) => filteredRecipes.slice((candidate - 1) * PAGE_SIZE, candidate * PAGE_SIZE))
      .map((recipe) => recipe.cardData.imageUrl)
      .filter((url): url is string => Boolean(url));
    for (const url of urls) {
      const preload = new window.Image();
      preload.src = url;
    }
  }, [page, totalPages, filteredRecipes]);

  function goToPage(next: number) {
    updateParams({ page: next > 1 ? String(next) : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
            onClick={() => updateParams({ source: "", page: "" })}
          >
            Toutes les entreprises
          </Button>
          {sourcesWithRecipes.map((source) => (
            <Button
              key={source.id}
              type="button"
              variant={sourceFilter === source.slug ? "primary" : "secondary"}
              onClick={() => updateParams({ source: source.slug, page: "" })}
            >
              {source.name}
            </Button>
          ))}
        </div>
      )}

      {filteredRecipes.length === 0 ? (
        <EmptyState message="Aucune recette ne correspond à cette recherche." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {paginatedRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} {...recipe.cardData} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} className="pt-2" />
        </>
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
