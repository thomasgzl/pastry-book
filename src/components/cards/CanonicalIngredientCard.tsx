import Link from "next/link";
import { Card } from "@/components/ui/Card";
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
    <Link href={href} className={`block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}>
      <Card className="flex items-center gap-3 transition-colors hover:bg-avoine/40">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- visuel démo/CMS, pas encore de pipeline next/image dédié (lot E).
          <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : botanicalVariant ? (
          <BotanicalOrnament variant={botanicalVariant} className="h-10 w-10 shrink-0" />
        ) : (
          <PlaceholderIllustration label={name} className="h-10 w-10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-semibold text-cacao">{name}</p>
          <p className="text-sm text-cacao/70">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
      </Card>
    </Link>
  );
}
