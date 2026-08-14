import { BotanicalOrnament } from "@/components/ui/BotanicalOrnament";

interface CulinaryFrameProps {
  /** Placeholder temporaire (`placeholder-hero.svg`, `placeholder-recipe-4x3.svg`…)
   * ou, plus tard, l'URL d'un visuel IA approuvé — le contrat CBV1 garantit
   * que seul le `src` change, jamais ce composant (docs/09-AI_VISUALS.md). */
  src: string;
  alt?: string;
  /** 4:3 (fiche recette) ou 16:9 (héro éditorial), voir docs/09-AI_VISUALS.md. */
  ratio?: "4:3" | "16:9";
  className?: string;
  /** Brindille décorative en coin — désactivable si le visuel a déjà son
   * propre décor interne (voir contrat des placeholders). */
  decorate?: boolean;
}

const RATIO_CLASS: Record<NonNullable<CulinaryFrameProps["ratio"]>, string> = {
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-[16/9]",
};

/**
 * Cadre visuel culinaire réutilisable : coins arrondis, bordure fine, fond
 * ivoire, ratio maîtrisé (jamais de bannière excessive). Utilisé pour le
 * héro d'accueil (CBF2) et le visuel de fiche recette (CBF4) — un seul
 * composant, pas de style dupliqué par page (CBF1).
 */
export function CulinaryFrame({
  src,
  alt = "",
  ratio = "4:3",
  className = "",
  decorate = true,
}: CulinaryFrameProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className={`${RATIO_CLASS[ratio]} w-full overflow-hidden rounded-2xl border border-grise bg-ivoire`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- asset SVG statique, pas de pipeline next/image dédié (lot E, non lancé). */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
      {decorate && (
        <BotanicalOrnament
          variant="branch"
          className="absolute -bottom-6 -right-6 hidden w-28 opacity-70 sm:block"
        />
      )}
    </div>
  );
}
