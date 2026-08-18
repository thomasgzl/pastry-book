import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";
import { Tag } from "@/components/ui/Tag";

interface RecipeCardProps {
  title: string;
  sourceName: string;
  /** Catégorie locale à la source, absente si la recette n'en a pas
   * (ex. import direct sans classement). */
  categoryName?: string;
  /**
   * Tags de matière première à afficher. Seuls les deux premiers sont
   * rendus, quelle que soit la longueur de la liste transmise (contrainte
   * du design system : jamais plus de deux tags sur une carte recette). Le
   * choix des tags les plus pertinents reste la responsabilité de
   * l'appelant.
   */
  ingredientTags?: string[];
  /** URL d'un visuel IA APPROUVÉ pour cette recette (résolue par l'appelant
   * via `getApprovedVisualUrl`/`ApprovedVisual`, lot J7) — jamais une photo
   * source brute non maîtrisée (même règle que `RecipeSheet`). Absente ou
   * `null` : la carte affiche le cadre placeholder, jamais aucun cadre. */
  imageUrl?: string | null;
  href: string;
  className?: string;
}

/**
 * Cadre visuel de tête de carte : ratio maîtrisé, cohérent avec
 * `CulinaryFrame` (fiche recette) sans reprendre sa brindille décorative —
 * trop dense à l'échelle d'une grille de cartes (lot J7, correction P2 :
 * la carte recette n'avait auparavant qu'un monogramme carré).
 */
function RecipeCardVisual({ imageUrl, title }: { imageUrl?: string | null; title: string }) {
  return (
    <div className="aspect-[4/3] w-full shrink-0 overflow-hidden border-b border-grise bg-ivoire">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- visuel approuvé, pas de pipeline next/image dédié (lot E).
        <img src={imageUrl} alt={`Illustration de ${title}`} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <PlaceholderIllustration label={title} className="h-12 w-12" />
        </div>
      )}
    </div>
  );
}

/**
 * Carte recette. Volontairement sans difficulté, note, temps, conservation
 * ni matériel : hors périmètre MVP (CLAUDE.md), ces props n'existent pas.
 */
export function RecipeCard({
  title,
  sourceName,
  categoryName,
  ingredientTags = [],
  imageUrl,
  href,
  className = "",
}: RecipeCardProps) {
  const visibleTags = ingredientTags.slice(0, 2);

  return (
    <Link href={href} className={`block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}>
      <Card className="flex h-full flex-col gap-0 overflow-hidden p-0 transition-colors hover:bg-avoine/40">
        <RecipeCardVisual imageUrl={imageUrl} title={title} />

        <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
          <p className="truncate font-serif text-base font-semibold text-cacao">{title}</p>
          <p className="truncate text-sm text-cacao/70">
            {sourceName}
            {categoryName ? ` · ${categoryName}` : ""}
          </p>

          {visibleTags.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </Link>
  );
}
