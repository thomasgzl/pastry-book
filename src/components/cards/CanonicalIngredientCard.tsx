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

  // Fondu éditorial (K18v3, référence A) : calque image plein cadre, ancré
  // à gauche (`object-left`), masque CSS entre 35% et 58% de la largeur de
  // la carte — un seul fond ivoire, aucun rectangle de survol séparé
  // (docs/06-DESIGN_SYSTEM.md).
  const maskStyle = {
    WebkitMaskImage: "linear-gradient(to right, black 0%, black 35%, transparent 58%)",
    maskImage: "linear-gradient(to right, black 0%, black 35%, transparent 58%)",
  };

  return (
    <Link
      href={href}
      className={`block h-[134px] rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:h-[140px] ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-grise bg-ivoire shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cacao/20 hover:shadow-md">
        {imageUrl ? (
          // Matière première : image entière visible, jamais recadrée
          // (`object-contain`, même règle que `ApprovedVisual`/`CulinaryFrame`
          // pour ce type de sujet, K12) ; texte alternatif réel, jamais vide,
          // le nom n'étant pas répété ailleurs dans cette vignette compacte.
          // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas encore de pipeline next/image dédié (lot E).
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-0 z-0 h-full w-full object-contain object-left"
            style={maskStyle}
          />
        ) : botanicalVariant ? (
          <BotanicalOrnament
            variant={botanicalVariant}
            className="absolute inset-0 z-0 h-full w-full object-contain object-left"
            style={maskStyle}
          />
        ) : (
          <PlaceholderIllustration label={name} className="absolute left-6 top-1/2 z-0 h-14 w-14 -translate-y-1/2" style={maskStyle} />
        )}
        <div className="relative z-10 flex h-full min-w-0 flex-col justify-center gap-1 py-3 pl-[54%] pr-4">
          <p className="line-clamp-2 font-serif text-lg font-semibold leading-tight text-cacao sm:text-xl">{name}</p>
          <p className="text-xs text-cacao/60 sm:text-sm">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
      </div>
    </Link>
  );
}
