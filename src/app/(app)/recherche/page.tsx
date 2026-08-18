"use client";

/**
 * Recherche globale groupée (C9). Branchée sur `searchAllAction` — Server
 * Action qui lit les données réelles Supabase en production (démo seulement
 * si `hasSupabaseConfig()` est faux, voir `src/lib/data/search.ts`), jamais
 * les données de démonstration en production. État de requête porté par
 * l'URL (`?q=`), même schéma que `/recettes` (C4) : un clic sur un résultat
 * puis retour arrière retrouve la même requête. `SearchInput.onSearch` fait
 * le round-trip serveur, débouncé — `value`/`onChange` restent synchrones
 * pour un champ réactif à la frappe. Navigable au clavier : les liens de
 * résultats sont des `<a>` natifs, le champ un `<input>` natif.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import type { SearchResults } from "@/lib/recipes/search";
import { searchAllAction } from "./searchActions";

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

  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Ignore une réponse encore en vol devenue obsolète (frappe rapide déclenchant
  // deux requêtes qui se doublent) — jamais un résultat plus ancien n'écrase un
  // résultat plus récent.
  const requestIdRef = useRef(0);

  function updateQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function handleSearch(query: string) {
    const trimmed = query.trim();
    const requestId = ++requestIdRef.current;

    if (!trimmed) {
      setResults(null);
      setHasError(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setHasError(false);
    try {
      const data = await searchAllAction(trimmed);
      if (requestId !== requestIdRef.current) return;
      setResults(data);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setHasError(true);
      setResults(null);
    } finally {
      if (requestId === requestIdRef.current) setSearching(false);
    }
  }

  // `SearchInput` débounce déjà son propre appel `onSearch` — pas besoin d'un
  // second minuteur ici. `q.trim()` vidé (champ effacé) réinitialise sans
  // attendre le round-trip serveur.
  useEffect(() => {
    if (!q.trim()) {
      requestIdRef.current += 1;
      setResults(null);
      setHasError(false);
      setSearching(false);
    }
  }, [q]);

  const totalCount = results
    ? results.sources.length + results.recipes.length + results.canonicalIngredients.length + results.categories.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Recherche" }]} />

      <EditorialTitle>Recherche</EditorialTitle>

      <SearchInput
        value={q}
        onChange={updateQuery}
        onSearch={handleSearch}
        label="Recherche globale"
        placeholder="Rechercher une recette, une entreprise, une matière première…"
        className="w-full max-w-lg sm:max-w-xl"
      />

      {hasError && <ErrorState message="La recherche a échoué. Merci de réessayer." />}

      {!hasError && !q.trim() && <EmptyState message="Tapez une recherche pour commencer." />}

      {!hasError && q.trim() && searching && <LoadingState message="Recherche en cours…" />}

      {!hasError && q.trim() && !searching && results && totalCount === 0 && (
        <EmptyState message="Aucun résultat pour cette recherche." />
      )}

      {!hasError && !searching && results && totalCount > 0 && (
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
