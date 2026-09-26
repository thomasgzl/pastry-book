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
 * (docs/06-DESIGN_SYSTEM.md § Carte d'entrée principale). Contenu aligné à
 * gauche, badge icône en tête, bouton flèche rond laiton en pied — même
 * repère visuel qu'une carte de sujet illustré ailleurs dans l'app, sans en
 * avoir le visuel (aucune image de couverture ici, voir la demande d'origine :
 * layout/style seulement, pas de nouvelle génération IA pour l'accueil).
 */
export function EntryCard({ href, title, icon, hint, className = "" }: EntryCardProps) {
  return (
    <Link
      href={href}
      className={`group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <Card className="flex h-full min-h-48 flex-col gap-3 p-6 text-left transition-colors group-hover:bg-avoine/30">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-avoine text-olive transition-colors group-hover:bg-ivoire"
        >
          {icon}
        </span>
        <div className="flex flex-1 flex-col gap-1">
          <span className="font-serif text-xl font-semibold text-cacao">{title}</span>
          {hint && <span className="text-sm text-cacao/70">{hint}</span>}
        </div>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-laiton text-coquille transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </Card>
    </Link>
  );
}
