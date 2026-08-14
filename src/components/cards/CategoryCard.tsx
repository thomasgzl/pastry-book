import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";

interface CategoryCardProps {
  /** Nom de la catégorie, propre à une entreprise (jamais globalisée). */
  name: string;
  recipeCount: number;
  /** Visuel IA approuvé pour cette catégorie (ambiance légère, jamais un
   * faux logo), résolu par l'appelant — lot J7. */
  imageUrl?: string | null;
  href: string;
  className?: string;
}

/**
 * Carte de catégorie locale à une entreprise (ex. « Desserts boutique » chez
 * Hennessy). N'existe que dans la page de l'entreprise concernée — c'est à
 * l'appelant de ne pas rendre cette carte pour une catégorie vide
 * (CLAUDE.md § Aucune section vide).
 */
export function CategoryCard({ name, recipeCount, imageUrl, href, className = "" }: CategoryCardProps) {
  return (
    <Link href={href} className={`block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}>
      <Card className="flex items-center gap-3 transition-colors hover:bg-avoine/40">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas de pipeline next/image dédié (lot E).
          <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <PlaceholderIllustration label={name} className="h-10 w-10" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-semibold text-cacao">{name}</p>
          <p className="text-sm text-cacao/70">
            {recipeCount} {recipeCount === 1 ? "recette" : "recettes"}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-olive">Voir les recettes →</span>
      </Card>
    </Link>
  );
}
