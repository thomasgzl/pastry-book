import Link from "next/link";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";

interface SourceCardProps {
  /** Nom de l'entreprise/source (ex. « Hennessy », « CAP Pâtissier »). */
  name: string;
  /** Nombre de recettes déjà calculé par l'appelant — aucun comptage ici. */
  recipeCount: number;
  imageUrl?: string;
  /** `object-position` de l'illustration — cadrage individuel (voir companyIllustrations.ts). */
  imagePosition?: string;
  href: string;
  className?: string;
}

/**
 * Carte éditoriale de la page Entreprises : grande illustration en tête
 * (ratio 4/3, même traitement que `RecipeCard`), séparation nette avec la
 * zone de texte (bordure marquée, pas de fondu), nom + nombre de recettes,
 * bouton rond d'accès en bas. Hennessy n'a ici aucun traitement structurel
 * différent des autres sources (docs/06-DESIGN_SYSTEM.md).
 */
export function SourceCard({
  name,
  recipeCount,
  imageUrl,
  imagePosition = "center",
  href,
  className = "",
}: SourceCardProps) {
  return (
    <Link
      href={href}
      className={`group block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-grise bg-coquille shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-olive/40 hover:shadow-md">
        <div className="aspect-[4/3] w-full shrink-0 overflow-hidden border-b-2 border-avoine bg-ivoire">
          {imageUrl ? (
            <ImageWithSkeleton
              src={imageUrl}
              alt={name}
              className="h-full w-full object-cover"
              style={{ objectPosition: imagePosition }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlaceholderIllustration label={name} className="h-14 w-14" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-serif text-lg font-semibold text-cacao">{name}</p>
            <p className="text-sm text-cacao/60">
              {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-laiton text-ivoire transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
