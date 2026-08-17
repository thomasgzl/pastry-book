import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

interface EntryCardProps {
  href: string;
  title: string;
  /** Icône fine olive, ex. `<BuildingIcon className="h-8 w-8" />`. Décorative :
   * le titre porte déjà le sens (`aria-hidden` appliqué ici). */
  icon: ReactNode;
  /** Indication discrète optionnelle sous le titre — omise si non pertinente,
   * jamais de rubrique vide (CLAUDE.md). */
  hint?: string;
  className?: string;
}

/**
 * Carte d'entrée principale (accueil). Icône, titre, indication discrète
 * optionnelle, flèche d'état d'interaction — même gabarit pour les quatre
 * cartes afin de garantir un poids visuel strictement égal
 * (docs/06-DESIGN_SYSTEM.md § Carte d'entrée principale).
 */
export function EntryCard({ href, title, icon, hint, className = "" }: EntryCardProps) {
  return (
    <Link
      href={href}
      className={`group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <Card className="flex h-full min-h-36 flex-col items-center gap-2 py-8 text-center transition-colors group-hover:bg-avoine/40">
        <span aria-hidden="true" className="text-olive">
          {icon}
        </span>
        <span className="font-serif text-lg font-semibold text-cacao">{title}</span>
        {hint && <span className="text-sm text-cacao/70">{hint}</span>}
        <span
          aria-hidden="true"
          className="mt-auto pt-1 text-cacao/40 transition-colors group-hover:text-olive"
        >
          →
        </span>
      </Card>
    </Link>
  );
}
