import Link from "next/link";
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
 * Carte paysage de la page Entreprises (proposition B) : illustration en
 * fondu contre le bord gauche, informations à droite. Hennessy n'a ici
 * aucun traitement structurel différent des autres sources
 * (docs/06-DESIGN_SYSTEM.md).
 */
export function SourceCard({
  name,
  recipeCount,
  imageUrl,
  imagePosition = "center",
  href,
  className = "",
}: SourceCardProps) {
  const fadeLayerStyle = {
    left: "34%",
    width: "16%",
    background: "linear-gradient(to right, transparent 0%, var(--color-ivoire) 85%, var(--color-ivoire) 100%)",
  };

  return (
    <Link
      href={href}
      className={`group block h-[142px] rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-xl border border-grise bg-ivoire shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-olive/40 hover:shadow-md">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé/statique, pas de pipeline next/image dédié (lot E).
          <img
            src={imageUrl}
            alt={name}
            className="absolute inset-y-0 left-0 z-0 h-full w-[45%] object-cover"
            style={{ objectPosition: imagePosition }}
          />
        ) : (
          <PlaceholderIllustration label={name} className="absolute left-6 top-1/2 z-0 h-14 w-14 -translate-y-1/2" />
        )}
        <div aria-hidden="true" className="absolute inset-y-0 z-[1]" style={fadeLayerStyle} />
        <div className="relative z-[2] grid h-full grid-cols-[1fr_auto] items-center gap-3 py-3 pl-[47%] pr-4">
          <div className="min-w-0">
            <p className="font-serif text-lg font-semibold leading-tight text-cacao sm:text-xl">{name}</p>
            <p className="text-xs text-cacao/60 sm:text-sm">
              {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
            </p>
          </div>
          <span aria-hidden="true" className="text-olive/70 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
