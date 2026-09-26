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
 * Héro éditorial (CBF2/CBF5, intégration visuelle finale) : titre + sous-titre
 * centrés, puis bandeau photo pleine largeur (fournie par la personne, scène
 * opaque — pas un PNG détouré), puis recherche globale. Le bandeau se fond
 * dans le fond ivoire par un fondu (`mask-image` dégradé) sur son bord bas
 * uniquement : ni cadre ni bordure ni ombre (`CulinaryFrame`, qui recadre en
 * carte bordée, est donc volontairement écarté ici), sans délimitation nette
 * entre l'image et le reste de la page.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { EntryCard } from "@/components/ui/EntryCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { LOGO_ASSETS } from "@/lib/visuals/logoAssets";

/**
 * 64×64 (tablette/ordinateur) / 56×56 (téléphone) — agrandies suite retour
 * visuel (36/34px jugé trop petit à côté du titre). Couleurs déjà présentes
 * dans les fichiers, jamais de filtre/recoloration CSS. Décoratives — le
 * titre de chaque carte porte déjà le sens, `EntryCard` place en plus ce
 * `ReactNode` dans un conteneur `aria-hidden="true"` (voir `EntryCard.tsx`).
 */
function NavCardIcon({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={64}
      height={64}
      className="h-14 w-14 object-contain sm:h-16 sm:w-16"
    />
  );
}

const NAV_CARDS = [
  {
    label: "Par entreprise",
    href: "/entreprises",
    icon: <NavCardIcon src="/visuals/icons/entreprise.png" />,
    hint: "Hennessy, CAP Pâtissier et les autres sources",
    image: "/visuals/accueil/par-entreprise.png",
  },
  {
    label: "Par recette",
    href: "/recettes",
    icon: <NavCardIcon src="/visuals/icons/recette.png" />,
    hint: "Toutes les recettes, recherche et filtre inclus",
    image: "/visuals/accueil/par-recette.png",
  },
  {
    label: "Par matière première",
    href: "/matieres-premieres",
    icon: <NavCardIcon src="/visuals/icons/matiere-premiere.png" />,
    hint: "Le répertoire normalisé des ingrédients",
    image: "/visuals/accueil/par-matiere-premiere.png",
  },
  {
    label: "Par spécificité",
    href: "/specificites",
    icon: <NavCardIcon src="/visuals/icons/specificite.png" />,
    hint: "Régimes et allergènes, filtrés séparément",
    image: "/visuals/accueil/par-specificite.png",
  },
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
      <section className="flex flex-col items-center gap-6 text-center">
        {/* Titre de marque uniquement — jamais `EditorialTitle`/`--font-serif`
            (Bodoni Moda) réutilisé par tous les titres de page : `--font-display`
            (Fraunces, layout.tsx/globals.css) donne à ce h1 un traitement de
            couverture, pas un titre de plus. */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-display italic tracking-tight text-cacao text-4xl sm:text-5xl lg:text-6xl">
            Le Grand Livre de Pâtisserie
          </h1>
          <p className="text-base text-cacao/70">Archive privée de recettes professionnelles</p>
        </div>

        {/* Pleine largeur du conteneur de page (jamais plafonnée) : fondu bas
            uniquement (`mask-image`), l'image se dissout dans le fond ivoire
            au lieu de s'arrêter sur un bord net — `-webkit-mask-image`
            requis pour Safari/iOS (moteur principal sur tablette, CLAUDE.md). */}
        <div
          className="w-full"
          style={{
            maskImage: "linear-gradient(to bottom, black 45%, transparent 95%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 45%, transparent 95%)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- photo statique fournie, fondu appliqué au conteneur parent (mask-image), pas de recadrage/optimisation nécessaire ici. */}
          <img
            src={LOGO_ASSETS.homeIllustration}
            alt="Tarte au citron meringuée en scène, entourée de citrons, vanille et ustensiles"
            className="h-auto w-full object-cover"
            decoding="async"
          />
        </div>

        <SearchInput
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          debounceMs={350}
          label="Recherche globale"
          placeholder="Rechercher une recette, une entreprise, une matière première…"
          className="w-full max-w-lg text-left sm:max-w-xl lg:max-w-2xl"
        />
      </section>

      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
        {NAV_CARDS.map((card) => (
          <EntryCard
            key={card.href}
            href={card.href}
            title={card.label}
            icon={card.icon}
            hint={card.hint}
            image={card.image}
          />
        ))}
      </div>
    </div>
  );
}
