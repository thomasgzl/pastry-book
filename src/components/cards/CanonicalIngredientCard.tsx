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
 * Carte « herbier » du répertoire des matières premières (maquette validée).
 * Hauteur fixée sur la carte elle-même (pas un ratio `aspect-*` : un ratio
 * couplait hauteur et largeur de colonne, donnant une carte trop verticale
 * dès que la grille passait à 2-3 colonnes). Deux zones empilées dans un
 * flex-col de cette hauteur :
 * - Image : `flex-1 min-h-0`, remplit tout l'espace restant au-dessus du
 *   pied, padding minimal identique sur les deux branches (réelle/placeholder)
 *   pour qu'elles partagent exactement la même structure. `object-contain`
 *   pour ne jamais recadrer ; les illustrations portent déjà leur propre
 *   fond, aucune couleur/dégradé ajoutés derrière.
 * - Pied : hauteur naturelle, une seule ligne — nom + compteur à gauche,
 *   bouton laiton à droite, centré verticalement sur le bloc texte.
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
      className={`group block h-[280px] rounded-[14px] sm:h-[300px] md:h-[320px] lg:h-[340px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-grise/40 bg-[#fbf7ef] shadow-sm transition-all duration-200 motion-reduce:transition-none hover:-translate-y-1 hover:border-olive/40 hover:shadow-md motion-reduce:hover:translate-y-0">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pt-2">
          {imageUrl ? (
            <ImageWithSkeleton src={imageUrl} alt={name} className="h-full w-full object-contain" />
          ) : botanicalVariant ? (
            <BotanicalOrnament variant={botanicalVariant} className="h-full w-full object-contain" />
          ) : (
            <PlaceholderIllustration label={name} className="h-1/2 w-1/2" />
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 px-5 py-4">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold text-cacao">{name}</h3>
            <p className="text-xs text-cacao/70">
              {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-laiton text-coquille transition-all duration-200 motion-reduce:transition-none group-hover:translate-x-0.5 group-hover:brightness-90 motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        </div>
      </article>
    </Link>
  );
}
