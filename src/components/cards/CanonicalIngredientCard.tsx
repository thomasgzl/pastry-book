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
 * Carte « herbier » du répertoire des matières premières (maquette validée) :
 * deux zones seulement, empilées dans un ratio fixe `aspect-[4/5]` sur toute
 * la carte (pas sur une sous-boîte carrée) pour que les deux restent
 * proportionnelles à n'importe quelle largeur de colonne.
 * - Illustration : `flex-1`, aucun padding, remplit tout l'espace restant
 *   (~78 % de la hauteur) ; `object-contain` pour ne jamais recadrer. Les
 *   illustrations portent déjà leur propre fond — aucune couleur ni dégradé
 *   ajoutés derrière.
 * - Pied : hauteur naturelle (~22 %), une seule ligne — nom + compteur à
 *   gauche, bouton laiton à droite, centré verticalement sur le bloc texte.
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
      className={`group block aspect-[4/5] rounded-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-[14px] border border-grise/50 bg-coquille shadow-sm transition-all duration-200 motion-reduce:transition-none hover:-translate-y-1 hover:border-olive/40 hover:shadow-md motion-reduce:hover:translate-y-0">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          {imageUrl ? (
            <ImageWithSkeleton src={imageUrl} alt={name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6">
              {botanicalVariant ? (
                <BotanicalOrnament variant={botanicalVariant} className="h-full w-full object-contain" />
              ) : (
                <PlaceholderIllustration label={name} className="h-1/2 w-1/2" />
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 px-5 py-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-semibold text-cacao">{name}</h3>
            <p className="text-xs text-cacao/70">
              {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-laiton text-coquille transition-all duration-200 motion-reduce:transition-none group-hover:translate-x-0.5 group-hover:brightness-90 motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        </div>
      </article>
    </Link>
  );
}
