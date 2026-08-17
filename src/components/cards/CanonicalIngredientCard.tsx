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

  // Fondu éditorial (K18v5) : calque illustration collé au bord gauche
  // (marges transparentes des fichiers compensées par un décalage négatif),
  // fondu assuré par un calque dégradé indépendant à la couleur exacte du
  // fond de carte — jamais un masque seul sur l'image, jamais un rectangle
  // séparé derrière le texte (docs/06-DESIGN_SYSTEM.md).
  const imageLayerClassName =
    "absolute inset-y-0 z-0 h-full w-[65%] origin-left scale-125 object-cover object-left";
  const imageLayerStyle = { left: "-13%" };
  const fadeLayerStyle = {
    left: "28%",
    width: "35%",
    background: "linear-gradient(to right, transparent 0%, var(--color-ivoire) 75%, var(--color-ivoire) 100%)",
  };

  return (
    <Link
      href={href}
      className={`block h-[140px] rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-grise bg-ivoire shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-olive/40 hover:shadow-md">
        {imageUrl ? (
          // Matière première : recadrage assumé (`object-cover` + zoom), la
          // carte n'a plus besoin de montrer l'illustration entière (K18v4) ;
          // texte alternatif réel, jamais vide, le nom n'étant pas répété
          // ailleurs dans cette vignette compacte.
          // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas encore de pipeline next/image dédié (lot E).
          <img src={imageUrl} alt={name} className={imageLayerClassName} style={imageLayerStyle} />
        ) : botanicalVariant ? (
          <BotanicalOrnament variant={botanicalVariant} className={imageLayerClassName} style={imageLayerStyle} />
        ) : (
          <PlaceholderIllustration label={name} className="absolute left-6 top-1/2 z-0 h-14 w-14 -translate-y-1/2" />
        )}
        <div aria-hidden="true" className="absolute inset-y-0 z-[1]" style={fadeLayerStyle} />
        <div className="relative z-[2] flex h-full min-w-0 flex-col justify-center gap-1 py-3 pl-[55%] pr-4">
          <p className="line-clamp-2 font-serif text-lg font-semibold leading-tight text-cacao sm:text-xl">{name}</p>
          <p className="text-xs text-cacao/60 sm:text-sm">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
      </div>
    </Link>
  );
}
