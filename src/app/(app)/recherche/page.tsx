"use client";

/**
 * Recherche globale groupée (C9). Branchée sur `searchAllAction` — Server
 * Action qui lit les données réelles Supabase en production (démo seulement
 * si `hasSupabaseConfig()` est faux, voir `src/lib/data/search.ts`), jamais
 * les données de démonstration en production.
 *
 * Fluidité de la frappe (K-perf) : `inputValue` (état local, mis à jour à
 * chaque frappe) est strictement séparé de la requête réellement envoyée.
 * `SearchInput.onChange` ne fait plus qu'un `setState` local — aucun accès
 * routeur/réseau par caractère. `SearchInput.onSearch`, débouncé en interne
 * (`DEBOUNCE_MS`), est le seul déclencheur de la synchronisation d'URL (`?q=`,
 * pour le retour arrière/partage) et de l'appel réseau réel.
 *
 * Aucun `AbortController` disponible ici : une Server Action liée n'expose
 * pas de `signal` côté client (contrairement à un `fetch` manuel) — le
 * mécanisme adapté à cette architecture est un compteur de requête
 * (`requestIdRef`), qui ignore toute réponse dont l'id ne correspond plus à
 * la dernière requête émise. Effet identique à une annulation réseau réelle :
 * une réponse obsolète (réordonnée, lente, ou en échec) n'écrase jamais un
 * résultat plus récent.
 */

import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import type { SearchResults } from "@/lib/recipes/search";
import { searchAllAction } from "./searchActions";

/** 300–400 ms : assez court pour rester réactif, assez long pour ne jamais interroger Supabase à chaque caractère d'une frappe normale. */
const DEBOUNCE_MS = 350;
/** Sous ce seuil, la requête est trop peu sélective pour justifier un aller-retour réseau — aucune fonctionnalité existante n'exige un caractère unique. */
const MIN_QUERY_LENGTH = 2;
/** Un indicateur de chargement affiché avant ce délai clignote plus qu'il n'informe — n'apparaît que si la requête prend réellement un peu de temps. */
const SPINNER_DELAY_MS = 200;

function normalizeCacheKey(trimmedQuery: string): string {
  return trimmedQuery.toLowerCase();
}

function ResultGroup({ title, items }: { title: string; items: { href: string; label: string; hint?: string }[] }) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <EditorialTitle as="h2">{title}</EditorialTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
          >
            <Card className="transition-colors hover:bg-avoine/40">
              <p className="font-serif text-base font-semibold text-cacao">{item.label}</p>
              {item.hint && <p className="text-sm text-cacao/70">{item.hint}</p>}
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RechercheContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  // Valeur affichée dans le champ — toujours locale et instantanée, jamais
  // ralentie par un aller-retour routeur/réseau. Réinitialisée depuis l'URL
  // seulement lors d'une navigation externe (retour arrière, lien partagé),
  // jamais pendant la frappe elle-même (l'URL n'est mise à jour qu'après le
  // debounce, donc ne « rattrape » jamais une frappe en cours). Ajustement
  // pendant le rendu plutôt que dans un effet (patron React officiel
  // « adjusting state when a prop changes ») : évite le rendu supplémentaire
  // qu'un `useEffect` déclencherait.
  const [inputValue, setInputValue] = useState(q);
  const [syncedQ, setSyncedQ] = useState(q);
  if (q !== syncedQ) {
    setSyncedQ(q);
    setInputValue(q);
  }

  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasError, setHasError] = useState(false);

  const requestIdRef = useRef(0);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cache mémoire de la session — évite de rappeler Supabase pour une
  // requête déjà vue (revenir sur un terme déjà tapé). Aucune complexité
  // d'invalidation/TTL : durée de vie du composant seulement, un
  // rechargement de page repart d'un cache vide.
  const cacheRef = useRef<Map<string, SearchResults>>(new Map());

  function updateUrlQuery(trimmed: string) {
    if (trimmed === q) return;
    const params = new URLSearchParams(searchParams.toString());
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleSearch(rawQuery: string) {
    const trimmed = rawQuery.trim();
    updateUrlQuery(trimmed);

    const requestId = ++requestIdRef.current;
    if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);

    if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) {
      setResults(null);
      setHasError(false);
      setSearching(false);
      return;
    }

    const cacheKey = normalizeCacheKey(trimmed);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      setHasError(false);
      setSearching(false);
      return;
    }

    // Résultats précédents volontairement conservés à l'écran (aucun reset
    // ici) : évite le clignotement pendant la requête. L'indicateur lui-même
    // n'apparaît qu'après SPINNER_DELAY_MS, seulement si la requête est
    // encore la plus récente à ce moment-là.
    spinnerTimeoutRef.current = setTimeout(() => {
      if (requestId === requestIdRef.current) setSearching(true);
    }, SPINNER_DELAY_MS);

    try {
      const data = await searchAllAction(trimmed);
      if (requestId !== requestIdRef.current) return; // réponse obsolète (requête plus récente déjà en cours) — ignorée
      cacheRef.current.set(cacheKey, data);
      setResults(data);
      setHasError(false);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setHasError(true);
      setResults(null);
    } finally {
      if (requestId === requestIdRef.current) {
        if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
        setSearching(false);
      }
    }
  }

  const trimmedInput = inputValue.trim();
  const totalCount = results
    ? results.sources.length + results.recipes.length + results.canonicalIngredients.length + results.categories.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Recherche" }]} />

      <EditorialTitle>Recherche</EditorialTitle>

      <div className="flex flex-col gap-2">
        <SearchInput
          value={inputValue}
          onChange={setInputValue}
          onSearch={handleSearch}
          debounceMs={DEBOUNCE_MS}
          label="Recherche globale"
          placeholder="Rechercher une recette, une entreprise, une matière première…"
          className="w-full max-w-lg sm:max-w-xl"
        />
        {/* Indicateur discret, jamais un bloc qui remplace les résultats déjà affichés. */}
        {searching && (
          <p role="status" className="text-sm text-cacao/60">
            Recherche…
          </p>
        )}
      </div>

      {hasError && <ErrorState message="La recherche a échoué. Merci de réessayer." />}

      {!hasError && !trimmedInput && <EmptyState message="Tapez une recherche pour commencer." />}

      {!hasError && trimmedInput && trimmedInput.length < MIN_QUERY_LENGTH && (
        <EmptyState message="Continuez à taper pour lancer la recherche." />
      )}

      {!hasError && trimmedInput.length >= MIN_QUERY_LENGTH && results && totalCount === 0 && (
        <EmptyState message="Aucun résultat pour cette recherche." />
      )}

      {!hasError && trimmedInput.length >= MIN_QUERY_LENGTH && results && totalCount > 0 && (
        <div className="flex flex-col gap-6">
          <ResultGroup
            title="Entreprises"
            items={results.sources.map((source) => ({ href: source.href, label: source.name }))}
          />
          <ResultGroup
            title="Recettes"
            items={results.recipes.map((recipe) => ({
              href: recipe.href,
              label: recipe.title,
              hint: recipe.categoryName ? `${recipe.sourceName} · ${recipe.categoryName}` : recipe.sourceName,
            }))}
          />
          <ResultGroup
            title="Matières premières"
            items={results.canonicalIngredients.map((ingredient) => ({
              href: ingredient.href,
              label: ingredient.name,
            }))}
          />
          <ResultGroup
            title="Catégories"
            items={results.categories.map((category) => ({
              href: category.href,
              label: category.name,
              hint: category.sourceName,
            }))}
          />
        </div>
      )}
    </div>
  );
}

export default function RecherchePage() {
  return (
    <Suspense fallback={null}>
      <RechercheContent />
    </Suspense>
  );
}
