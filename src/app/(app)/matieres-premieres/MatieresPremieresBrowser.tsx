"use client";

/**
 * Répertoire des matières premières (C7) — partie interactive. Pagination
 * locale identique à `RecettesBrowser` (K1) : la liste complète est déjà
 * résolue côté serveur par `page.tsx`, ce composant ne fait que trancher et
 * afficher, sans jamais rappeler `src/lib/data/*`. Préchargement des images
 * des pages voisines pendant la consultation de la page courante — déjà en
 * cache navigateur au clic Précédent/Suivant, jamais de rechargement.
 */

import { useEffect, useState } from "react";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Pagination } from "@/components/ui/Pagination";
import { CanonicalIngredientCard } from "@/components/cards/CanonicalIngredientCard";

/**
 * Plus petit multiple commun des largeurs de grille (2/3/4 colonnes selon le
 * format, voir ci-dessous) : chaque page affiche des lignes complètes quel
 * que soit l'appareil, jamais une ligne tronquée au milieu d'une page — seule
 * la toute dernière page de la liste peut être incomplète (même règle que
 * `RecettesBrowser`).
 */
const PAGE_SIZE = 12;

export interface MatieresPremieresBrowserIngredient {
  id: string;
  name: string;
  recipeCount: number;
  imageUrl?: string;
  href: string;
}

interface MatieresPremieresBrowserProps {
  ingredients: MatieresPremieresBrowserIngredient[];
}

export function MatieresPremieresBrowser({ ingredients }: MatieresPremieresBrowserProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(ingredients.length / PAGE_SIZE));
  const paginated = ingredients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    const adjacentPages = [page - 1, page + 1].filter((candidate) => candidate >= 1 && candidate <= totalPages);
    const urls = adjacentPages
      .flatMap((candidate) => ingredients.slice((candidate - 1) * PAGE_SIZE, candidate * PAGE_SIZE))
      .map((ingredient) => ingredient.imageUrl)
      .filter((url): url is string => Boolean(url));
    for (const url of urls) {
      const preload = new window.Image();
      preload.src = url;
    }
  }, [page, totalPages, ingredients]);

  function goToPage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Matières premières" }]} />

      <EditorialTitle>Matières premières</EditorialTitle>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {paginated.map((ingredient) => (
          <CanonicalIngredientCard
            key={ingredient.id}
            name={ingredient.name}
            recipeCount={ingredient.recipeCount}
            imageUrl={ingredient.imageUrl}
            href={ingredient.href}
          />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} className="pt-2" />
    </div>
  );
}
