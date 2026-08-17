import type { CSSProperties } from "react";

const FILES = {
  branch: "ornament-branch.svg",
  citron: "botanical-lemon.svg",
  pistache: "botanical-pistachio.svg",
  vanille: "botanical-vanilla.svg",
  chocolat: "botanical-cacao.svg",
  poire: "botanical-pear.svg",
  noisette: "botanical-hazelnut.svg",
} as const;

export type BotanicalVariant = keyof typeof FILES;

interface BotanicalOrnamentProps {
  variant?: BotanicalVariant;
  className?: string;
  style?: CSSProperties;
}

/**
 * Décor botanique temporaire (trait fin olive, `public/visuals/placeholders`,
 * contrat CBV1 — docs/09-AI_VISUALS.md). Purement ornemental : jamais porteur
 * d'information (`alt=""`, `aria-hidden`), jamais placé sous du texte
 * important, masquable via `className` (`hidden sm:block`) — la lisibilité
 * mobile prime sur la décoration (docs/06-DESIGN_SYSTEM.md).
 */
export function BotanicalOrnament({ variant = "branch", className = "", style }: BotanicalOrnamentProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- asset SVG statique, pas de pipeline next/image dédié (lot E, non lancé).
    <img
      src={`/visuals/placeholders/${FILES[variant]}`}
      alt=""
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={style}
    />
  );
}
