/**
 * Illustration factice : le lot E (visuels IA) n'est pas encore lancé, donc
 * toute carte sans `imageUrl` affiche un monogramme SVG inline plutôt qu'une
 * image absente ou une icône de bibliothèque tierce. Voir
 * docs/06-DESIGN_SYSTEM.md § Illustrations et images.
 */

interface PlaceholderIllustrationProps {
  /** Nom dont l'initiale sert de monogramme. Purement décoratif : le nom
   * réel est déjà porté par le texte de la carte, donc masqué aux lecteurs
   * d'écran (`aria-hidden`) pour éviter une répétition. */
  label: string;
  className?: string;
}

export function PlaceholderIllustration({
  label,
  className = "",
}: PlaceholderIllustrationProps) {
  const initiale = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={`shrink-0 rounded-lg ${className}`}
    >
      <rect width="40" height="40" rx="8" className="fill-avoine" />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-cacao font-serif"
        fontSize="17"
      >
        {initiale}
      </text>
    </svg>
  );
}
