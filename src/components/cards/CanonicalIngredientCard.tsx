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

/**
 * Carte du répertoire des matières premières, même genre que `RecipeCard`/
 * `SourceCard` : grande illustration en tête (ratio 4/3, `object-cover`),
 * fondu vers le fond de la zone de texte, nom + nombre de recettes, bouton
 * rond laiton en pied. Un ornement botanique décoratif (trait fin, pas une
 * photo) reste centré/contenu plutôt que recadré en plein cadre.
 */
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
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-grise bg-coquille shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-olive/40 hover:shadow-md">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-ivoire">
          {imageUrl ? (
            <ImageWithSkeleton src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4">
              {botanicalVariant ? (
                <BotanicalOrnament variant={botanicalVariant} className="h-full w-full object-contain" />
              ) : (
                <PlaceholderIllustration label={name} className="h-12 w-12" />
              )}
            </div>
          )}
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-coquille" />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="min-w-0">
            <p className="truncate font-serif text-base font-semibold text-cacao">{name}</p>
            <p className="text-sm text-cacao/70">
              {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-laiton text-coquille transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
