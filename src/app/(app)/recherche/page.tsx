"use client";

/**
 * Recherche globale groupée (C9). Branchée sur `searchAll` (recherche 100 %
 * locale sur les données démo, aucun appel réseau/IA). État porté par l'URL
 * (`?q=`), même schéma que `/recettes` (C4) : un clic sur un résultat puis
 * retour arrière retrouve la même requête. Navigable au clavier : les liens
 * de résultats sont des `<a>` natifs, le champ un `<input>` natif —
 * `SearchInput` ne fait rien de plus qu'un champ standard.
 */

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { searchAll, type SearchResults } from "@/lib/recipes/search";

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

  function updateQuery(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  let results: SearchResults | null = null;
  let hasError = false;
  try {
    results = searchAll(q);
  } catch {
    hasError = true;
  }

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
        label="Recherche globale"
        placeholder="Rechercher une recette, une entreprise, une matière première…"
        className="w-full max-w-lg sm:max-w-xl"
      />

      {hasError && <ErrorState message="La recherche a échoué. Merci de réessayer." />}

      {!hasError && !q.trim() && <EmptyState message="Tapez une recherche pour commencer." />}

      {!hasError && q.trim() && totalCount === 0 && (
        <EmptyState message="Aucun résultat pour cette recherche." />
      )}

      {!hasError && results && totalCount > 0 && (
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
