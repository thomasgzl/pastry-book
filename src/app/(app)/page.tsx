"use client";

/**
 * Accueil (C2). Titre, recherche globale, quatre accès de poids visuel
 * égal, illustration placeholder, action Importer secondaire. Aucune
 * statistique, planning ni widget de gestion (CLAUDE.md, docs/02).
 *
 * Décision recherche accueil : le champ redirige vers la route dédiée
 * `/recherche?q=...` (C9) au lieu d'afficher les résultats inline ici. Un
 * seul rendu de résultats groupés à maintenir, état porté par l'URL comme le
 * reste du lot (C4/C9), retour arrière naturel depuis les résultats.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";
import { SearchInput } from "@/components/ui/SearchInput";

const NAV_CARDS = [
  { label: "Par entreprise", href: "/entreprises" },
  { label: "Par recette", href: "/recettes" },
  { label: "Par matière première", href: "/matieres-premieres" },
  { label: "Par spécificité", href: "/specificites" },
] as const;

function HomeNavCard({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
      <Card className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center transition-colors hover:bg-avoine/40">
        <p className="font-serif text-lg font-semibold text-cacao">{label}</p>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(value: string) {
    const trimmed = value.trim();
    if (trimmed) router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 py-6 text-center">
      <PlaceholderIllustration label="Le Grand Livre de Pâtisserie" className="h-24 w-24" />

      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-cacao sm:text-4xl">
          Le Grand Livre de Pâtisserie
        </h1>
        <p className="text-base text-cacao/70">Archive privée de recettes professionnelles</p>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        label="Recherche globale"
        placeholder="Rechercher une recette, une entreprise, une matière première…"
        className="w-full max-w-lg text-left"
      />

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {NAV_CARDS.map((card) => (
          <HomeNavCard key={card.href} {...card} />
        ))}
      </div>

      <Button variant="secondary" disabled>
        Importer
      </Button>
    </div>
  );
}
