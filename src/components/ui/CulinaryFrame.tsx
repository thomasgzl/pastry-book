import { BotanicalOrnament } from "@/components/ui/BotanicalOrnament";

interface CulinaryFrameProps {
  /** Placeholder temporaire (`placeholder-hero.svg`, `placeholder-recipe-4x3.svg`…)
   * ou l'URL d'un visuel IA approuvé (lot J5) — seul le `src` change, jamais
   * ce composant (docs/09-AI_VISUALS.md). */
  src: string;
  alt?: string;
  /** 4:3 (fiche recette), 16:9 (héro éditorial) ou 1:1 (portrait compact,
   * ex. tête de fiche matière première), voir docs/09-AI_VISUALS.md. */
  ratio?: "4:3" | "16:9" | "1:1";
  /** `cover` (recadrage éditorial standard) ou `contain` (matière première :
   * image entière visible, jamais recadrée, fond ivoire autour — lot J5). */
  fit?: "cover" | "contain";
  className?: string;
  /** Brindille décorative en coin — désactivable si le visuel a déjà son
   * propre décor interne (voir contrat des placeholders). */
  decorate?: boolean;
}

const RATIO_CLASS: Record<NonNullable<CulinaryFrameProps["ratio"]>, string> = {
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-[16/9]",
  "1:1": "aspect-square",
};

const FIT_CLASS: Record<NonNullable<CulinaryFrameProps["fit"]>, string> = {
  cover: "object-cover",
  contain: "object-contain p-4",
};

/**
 * Cadre visuel culinaire réutilisable : coins arrondis, bordure fine, fond
 * ivoire, ratio maîtrisé (jamais de bannière excessive). Utilisé pour le
 * héro d'accueil, la fiche recette et la fiche matière première — un seul
 * composant, pas de style dupliqué par page (CBF1).
 *
 * La brindille décorative reste CONTENUE dans le cadre (à l'intérieur du
 * conteneur `overflow-hidden`, jamais en décalage négatif hors de ses
 * bords) : un décalage négatif faisait déborder le trait hors du cadre sur
 * accueil/fiche recette, visible en tablette portrait et proche du bord de
 * fenêtre en desktop (lot J, correction P1).
 */
export function CulinaryFrame({
  src,
  alt = "",
  ratio = "4:3",
  fit = "cover",
  className = "",
  decorate = true,
}: CulinaryFrameProps) {
  return (
    <div
      className={`relative ${RATIO_CLASS[ratio]} w-full overflow-hidden rounded-2xl border border-grise bg-ivoire ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- asset SVG statique ou visuel approuvé, pas de pipeline next/image dédié (lot E). */}
      <img src={src} alt={alt} className={`h-full w-full ${FIT_CLASS[fit]}`} />
      {decorate && (
        <BotanicalOrnament
          variant="branch"
          className="pointer-events-none absolute right-2 bottom-2 hidden w-16 opacity-60 sm:block lg:w-20"
        />
      )}
    </div>
  );
}
