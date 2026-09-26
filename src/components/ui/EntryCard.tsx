import Image from "next/image";
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
  /**
   * Illustration statique fournie par la personne (pas une génération IA —
   * ces quatre cartes n'ont pas de sujet en base, hors du système
   * `visual_assets`). Remplit toute la carte (fond, `object-right` — l'image
   * source prévoit une zone claire à gauche justement pour être recadrée
   * ainsi), avec un fondu vers la gauche (dégradé opaque `coquille` — même
   * couleur que la carte, pas la page derrière) pour que le texte reste
   * lisible sans aucun bord net entre le texte et la photo.
   */
  image?: string;
  className?: string;
}

/**
 * Carte d'entrée principale (accueil). Icône, titre, indication discrète
 * optionnelle, flèche d'état d'interaction — même gabarit pour les quatre
 * cartes afin de garantir un poids visuel strictement égal
 * (docs/06-DESIGN_SYSTEM.md § Carte d'entrée principale). Contenu aligné à
 * gauche, badge icône en tête, bouton flèche rond laiton en pied, illustration
 * optionnelle à droite (maquette fournie par la personne).
 */
export function EntryCard({ href, title, icon, hint, image, className = "" }: EntryCardProps) {
  return (
    <Link
      href={href}
      className={`group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <Card className="relative flex h-full min-h-56 items-stretch overflow-hidden p-0 text-left">
        {image && (
          <>
            <Image src={image} alt="" fill sizes="28rem" className="object-cover object-right" />
            {/* Fondu vers la gauche : dégradé opaque `coquille` (couleur de la
                carte, pas `mask-image` vers la page — l'image reste DANS la
                carte) qui couvre entièrement la zone de texte et se dissout
                sans bord net vers la photo à droite. */}
            <div className="absolute inset-0 bg-gradient-to-r from-coquille from-35% via-coquille/85 via-60% to-transparent" />
          </>
        )}
        <div className="relative flex flex-1 flex-col gap-3 p-6">
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
        </div>
      </Card>
    </Link>
  );
}
