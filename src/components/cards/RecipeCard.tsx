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
  /** Réservé au lot E (visuels IA) : ignoré pour l'instant, voir contrat
   * CBV1 — jamais de photo brute non maîtrisée tant qu'aucun visuel IA
   * n'est approuvé (même règle que `RecipeSheet`, CBF4). */
  imageUrl?: string;
  href: string;
  className?: string;
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
  href,
  className = "",
}: RecipeCardProps) {
  const visibleTags = ingredientTags.slice(0, 2);

  return (
    <Link href={href} className={`block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}>
      <Card className="flex flex-col gap-3 transition-colors hover:bg-avoine/40 sm:flex-row sm:items-start">
        <PlaceholderIllustration label={title} className="h-16 w-16" />

        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-base font-semibold text-cacao">{title}</p>
          <p className="truncate text-sm text-cacao/70">
            {sourceName}
            {categoryName ? ` · ${categoryName}` : ""}
          </p>

          {visibleTags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
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
