import Link from "next/link";
import { BotanicalOrnament, type BotanicalVariant } from "@/components/ui/BotanicalOrnament";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";

/**
 * Slugs canoniques (`src/lib/demo/data.ts`) déjà couverts par un fichier
 * `botanical-*.svg` dédié (contrat CBV1, docs/09-AI_VISUALS.md). Tant qu'un
 * ingrédient n'a pas son fichier, la carte retombe sur le monogramme
 * générique — jamais sur le placeholder d'un autre ingrédient.
 */
const BOTANICAL_BY_SLUG: Record<string, BotanicalVariant> = {
  citron: "citron",
  pistache: "pistache",
  vanille: "vanille",
  chocolat: "chocolat",
  poire: "poire",
  noisette: "noisette",
};

interface CanonicalIngredientCardProps {
  /** Nom canonique (ex. « Citron »), pas le libellé source d'une recette. */
  name: string;
  recipeCount: number;
  imageUrl?: string;
  href: string;
  className?: string;
}

/** Carte du répertoire des matières premières normalisées. */
export function CanonicalIngredientCard({
  name,
  recipeCount,
  imageUrl,
  href,
  className = "",
}: CanonicalIngredientCardProps) {
  const slug = href.split("/").filter(Boolean).pop() ?? "";
  const botanicalVariant = BOTANICAL_BY_SLUG[slug];

  return (
    <Link
      href={href}
      className={`block h-24 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:h-[110px] ${className}`}
    >
      {/* Carte fondu éditorial (K18) : mêmes tokens visuels que `Card`
          (bordure, rayon, ombre) mais sans son padding, pour laisser
          l'illustration atteindre le bord gauche jusqu'au fondu central. */}
      <div className="flex h-full items-stretch overflow-hidden rounded-xl border border-grise bg-coquille shadow-sm transition-colors hover:bg-avoine/40">
        <div className="relative h-full w-2/5 shrink-0 sm:w-[45%]">
          {imageUrl ? (
            // Matière première : image entière visible, jamais recadrée
            // (`object-contain`, même règle que `ApprovedVisual`/`CulinaryFrame`
            // pour ce type de sujet, K12) ; texte alternatif réel, jamais vide,
            // le nom n'étant pas répété ailleurs dans cette vignette compacte.
            // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas encore de pipeline next/image dédié (lot E).
            <img src={imageUrl} alt={name} className="h-full w-full object-contain p-2" />
          ) : botanicalVariant ? (
            <BotanicalOrnament variant={botanicalVariant} className="h-full w-full object-contain p-3" />
          ) : (
            <PlaceholderIllustration label={name} className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2" />
          )}
          {/* Fondu CSS vers le fond de la carte, pas d'image composite (K18). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-gradient-to-r from-transparent to-coquille"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-2 pl-1 pr-3">
          <p className="line-clamp-2 font-serif text-base font-semibold leading-tight text-cacao sm:text-lg">{name}</p>
          <p className="text-xs text-cacao/60 sm:text-sm">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
      </div>
    </Link>
  );
}
