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

  // Fondu éditorial (K18v2) : masque CSS réel sur le calque image, pas un
  // rectangle de survol séparé — le fond ivoire unique reste visible en
  // continu derrière, y compris pendant le hover (docs/06-DESIGN_SYSTEM.md).
  const maskStyle = {
    WebkitMaskImage: "linear-gradient(to right, black 0%, black 42%, transparent 80%)",
    maskImage: "linear-gradient(to right, black 0%, black 42%, transparent 80%)",
  };

  return (
    <Link
      href={href}
      className={`block h-24 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:h-[110px] ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-grise bg-ivoire shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-cacao/20 hover:shadow-md">
        <div className="absolute inset-y-0 left-0 z-0 flex w-[45%] items-center pl-3" style={maskStyle}>
          {imageUrl ? (
            // Matière première : image entière visible, jamais recadrée
            // (`object-contain`, même règle que `ApprovedVisual`/`CulinaryFrame`
            // pour ce type de sujet, K12) ; texte alternatif réel, jamais vide,
            // le nom n'étant pas répété ailleurs dans cette vignette compacte.
            // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas encore de pipeline next/image dédié (lot E).
            <img src={imageUrl} alt={name} className="h-[74px] w-auto max-w-full object-contain sm:h-[92px]" />
          ) : botanicalVariant ? (
            <BotanicalOrnament variant={botanicalVariant} className="h-[74px] w-auto max-w-full object-contain sm:h-[92px]" />
          ) : (
            <PlaceholderIllustration label={name} className="h-12 w-12" />
          )}
        </div>
        <div className="relative z-10 flex h-full min-w-0 flex-col justify-center gap-0.5 py-2 pl-[38%] pr-3 sm:pl-[40%] sm:pr-4">
          <p className="line-clamp-2 font-serif text-base font-semibold leading-tight text-cacao sm:text-lg">{name}</p>
          <p className="text-xs text-cacao/60 sm:text-sm">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
      </div>
    </Link>
  );
}
