export type BadgeStatus = "confirmed" | "proposed";

interface StatusBadgeProps {
  name: string;
  status: BadgeStatus;
  className?: string;
}

/**
 * Implémentation partagée par `SpecificityBadge` et `AllergenBadge` : même
 * forme visuelle pour les deux notions (CLAUDE.md les garde distinctes en
 * base et dans les pages, mais leur badge d'état est identique). `confirmed`
 * et `proposed` sont distingués par le texte ET l'icône, jamais par la seule
 * couleur (docs/06-DESIGN_SYSTEM.md § État « À vérifier »). `proposed`
 * réutilise le brun rouge déjà validé comme texte accessible (voir
 * globals.css) : le laiton, plus proche de la palette « accent », ne
 * respecte pas 4.5:1 en texte de corps.
 */
function StatusBadge({ name, status, className = "" }: StatusBadgeProps) {
  const isConfirmed = status === "confirmed";

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${
        isConfirmed
          ? "border-olive/40 bg-olive/10 text-cacao"
          : "border-brunrouge/40 bg-brunrouge/10 text-brunrouge"
      } ${className}`}
    >
      {isConfirmed ? (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0">
          <path
            d="M4 10.5 L8 14.5 L16 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M7.6 7.8c.3-1 1.2-1.6 2.3-1.5c1.1.1 1.9.9 1.9 1.8c0 1.6-2.1 1.6-2.1 3.1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="9.8" cy="13.8" r="0.9" fill="currentColor" />
        </svg>
      )}
      {name}
      <span className="font-normal opacity-80">
        {isConfirmed ? "confirmé" : "proposé, à vérifier"}
      </span>
    </span>
  );
}

/**
 * Spécificité (vegan, sans gluten, sans lactose…). Props :
 * `{ name: string; status: "confirmed" | "proposed" }`.
 */
export function SpecificityBadge(props: StatusBadgeProps) {
  return <StatusBadge {...props} />;
}

/**
 * Allergène détecté (gluten, œufs, lait, fruits à coque…). Même forme que
 * `SpecificityBadge`, export distinct car ce sont deux notions séparées
 * dans le produit (CLAUDE.md, principe 9).
 */
export function AllergenBadge(props: StatusBadgeProps) {
  return <StatusBadge {...props} />;
}
