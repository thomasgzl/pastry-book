import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";

interface SourceCardProps {
  /** Nom de l'entreprise/source (ex. « Hennessy », « CAP Pâtissier »). */
  name: string;
  /** Nombre de recettes déjà calculé par l'appelant — aucun comptage ici. */
  recipeCount: number;
  imageUrl?: string;
  href: string;
  className?: string;
}

/**
 * Carte de la page Entreprises. Hennessy n'a ici aucun traitement
 * structurel différent des autres sources (docs/06-DESIGN_SYSTEM.md).
 */
export function SourceCard({ name, recipeCount, imageUrl, href, className = "" }: SourceCardProps) {
  return (
    <Link href={href} className={`block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}>
      <Card className="flex items-center gap-3 transition-colors hover:bg-avoine/40">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas de pipeline next/image dédié (lot E).
          <img src={imageUrl} alt={name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <PlaceholderIllustration label={name} className="h-10 w-10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-semibold text-cacao">{name}</p>
          <p className="text-sm text-cacao/70">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
        <span aria-hidden="true" className="shrink-0 text-cacao/40">
          →
        </span>
      </Card>
    </Link>
  );
}
