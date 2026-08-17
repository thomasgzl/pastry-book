import type { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Shell des pages métier authentifiées (accueil, entreprises, recettes,
 * matières premières, spécificités…). Groupe de routes App Router : n'ajoute
 * aucun segment d'URL, seulement ce layout commun. `/connexion` et
 * `/offline` restent en dehors de ce groupe et n'affichent donc jamais cet
 * en-tête (page de connexion et repli hors-ligne indépendants du shell).
 *
 * Aucune page n'est encore déplacée dans ce groupe (tâche C1 : structure et
 * bibliothèque de composants uniquement, voir rapport de livraison). Les
 * pages métier réelles seront ajoutées par `recipe-search-agent`.
 */
export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
