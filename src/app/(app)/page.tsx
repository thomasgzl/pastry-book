"use client";

/**
 * Accueil (C2, refonte visuelle CBF2). Titre, recherche globale, quatre
 * accès de poids visuel égal, illustration placeholder, aucune statistique,
 * planning ni widget de gestion (CLAUDE.md, docs/02). Le bouton Importer du
 * header (`SiteHeader`) suffit : pas de second bouton ici (CBF2).
 *
 * Décision recherche accueil : le champ redirige vers la route dédiée
 * `/recherche?q=...` (C9) au lieu d'afficher les résultats inline ici. Un
 * seul rendu de résultats groupés à maintenir, état porté par l'URL comme le
 * reste du lot (C4/C9), retour arrière naturel depuis les résultats.
 *
 * Héro éditorial (CBF2/CBF5, intégration visuelle finale) : « affiche
 * pâtissière ». À partir de `lg` (tablette paysage / ordinateur), grille deux
 * colonnes — titre + sous-titre + recherche à gauche, illustration culinaire
 * à droite, centrée verticalement. En dessous (tablette portrait, téléphone),
 * une seule colonne dans l'ordre imposé : titre → sous-titre → illustration →
 * recherche (classes `order-*`), l'illustration restant visible sur mobile
 * mais avec une largeur plafonnée pour ne pas repousser la recherche hors de
 * l'écran.
 *
 * L'illustration est un PNG à fond transparent : rendue via une balise image
 * accessible en `object-contain` (jamais recadrée ni étirée), sans cadre ni
 * fond CSS derrière — on n'utilise donc PAS `CulinaryFrame` (qui recadre en
 * `cover` dans une carte bordée), réservé aux visuels de recette/matière.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntryCard } from "@/components/ui/EntryCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { LOGO_ASSETS } from "@/lib/visuals/logoAssets";

function BuildingIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 21V9l8-5 8 5v12" strokeLinejoin="round" />
      <path d="M9.5 21v-6.5h5V21" strokeLinejoin="round" />
      <path d="M3 21h18" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        d="M12 6.5c-1.8-1.4-4.3-2-7-2v13.5c2.7 0 5.2.6 7 2 1.8-1.4 4.3-2 7-2V4.5c-2.7 0-5.2.6-7 2Z"
        strokeLinejoin="round"
      />
      <path d="M12 6.5V20" />
    </svg>
  );
}

function LeafBranchIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 20c6-1.2 9.6-5.3 11.5-14.5" strokeLinecap="round" />
      <path d="M9 15.2c2-.6 3.8-2 4.8-4" strokeLinecap="round" />
      <ellipse cx="15" cy="6.8" rx="3" ry="1.6" transform="rotate(-32 15 6.8)" />
    </svg>
  );
}

function SpecificityIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3c1.9 1.9 1.9 4.7 0 6.6C10.1 7.7 10.1 4.9 12 3Z" strokeLinejoin="round" />
      <path d="M12 21c-1.9-1.9-1.9-4.7 0-6.6c1.9 1.9 1.9 4.7 0 6.6Z" strokeLinejoin="round" />
      <path d="M3 12c1.9-1.9 4.7-1.9 6.6 0C7.7 13.9 4.9 13.9 3 12Z" strokeLinejoin="round" />
      <path d="M21 12c-1.9 1.9-4.7 1.9-6.6 0c1.9-1.9 4.7-1.9 6.6 0Z" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_CARDS = [
  { label: "Par entreprise", href: "/entreprises", icon: <BuildingIcon /> },
  { label: "Par recette", href: "/recettes", icon: <BookIcon /> },
  { label: "Par matière première", href: "/matieres-premieres", icon: <LeafBranchIcon /> },
  { label: "Par spécificité", href: "/specificites", icon: <SpecificityIcon /> },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed) router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-10 py-4">
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center lg:gap-12">
        <div className="order-1 flex flex-col items-center gap-2 text-center lg:col-start-1 lg:row-start-1 lg:items-start lg:text-left">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-cacao sm:text-4xl">
            Le Grand Livre de Pâtisserie
          </h1>
          <p className="text-base text-cacao/70">Archive privée de recettes professionnelles</p>
        </div>

        <div className="order-2 flex justify-center lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG transparent statique, rendu contenu sans cadre (intégration visuelle finale). Optimisation du poids : voir rapport de livraison. */}
          <img
            src={LOGO_ASSETS.homeIllustration}
            alt="Tarte au citron meringuée entourée d'un décor botanique"
            className="h-auto w-full max-w-[15rem] object-contain sm:max-w-xs lg:max-w-md"
            decoding="async"
          />
        </div>

        <div className="order-3 flex justify-center lg:col-start-1 lg:row-start-2 lg:justify-start">
          <SearchInput
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            debounceMs={350}
            label="Recherche globale"
            placeholder="Rechercher une recette, une entreprise, une matière première…"
            className="w-full max-w-lg text-left sm:max-w-xl lg:max-w-2xl"
          />
        </div>
      </section>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {NAV_CARDS.map((card) => (
          <EntryCard key={card.href} href={card.href} title={card.label} icon={card.icon} />
        ))}
      </div>
    </div>
  );
}
