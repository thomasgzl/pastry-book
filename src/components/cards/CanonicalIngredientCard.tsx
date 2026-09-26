import Link from "next/link";
import { BotanicalOrnament, type BotanicalVariant } from "@/components/ui/BotanicalOrnament";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
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

/** Carte du répertoire des matières premières normalisées — carré éditorial (K19). */
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
      className={`group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-grise bg-ivoire shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-olive/40 hover:shadow-md"
        style={{ aspectRatio: "4 / 5" }}
      >
        {/* Zone haute : hauteur fixe (pas liée au contenu) afin que
            l'illustration démarre au même niveau sur toutes les cartes,
            qu'un nom tienne sur une ou deux lignes (docs/06-DESIGN_SYSTEM.md). */}
        <div className="flex h-[44px] shrink-0 flex-col justify-start gap-0.5 px-2 pt-2 sm:h-[52px] sm:px-3 sm:pt-3">
          <p className="font-serif text-xs font-semibold leading-snug text-cacao sm:text-sm">{name}</p>
          <p className="text-[10px] text-cacao/60 sm:text-xs">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>

        <div className="relative min-h-0 flex-1 px-1.5 pb-1.5">
          {imageUrl ? (
            <ImageWithSkeleton
              src={imageUrl}
              alt={name}
              className="h-full w-full origin-bottom object-contain object-bottom transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : botanicalVariant ? (
            <BotanicalOrnament
              variant={botanicalVariant}
              className="h-full w-full origin-bottom object-contain object-bottom transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlaceholderIllustration label={name} className="h-12 w-12 sm:h-16 sm:w-16" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
