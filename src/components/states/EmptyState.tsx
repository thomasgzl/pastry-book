import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  message?: string;
  /** Libellé et callback de l'action optionnelle (ex. « Réinitialiser les
   * filtres »). Les deux doivent être fournis ensemble pour afficher
   * l'action. */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** État « aucun résultat » générique, réutilisable pour toute liste vide. */
export function EmptyState({
  message = "Aucun résultat.",
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-dashed border-grise px-4 py-10 text-center text-cacao/70 ${className}`}
    >
      <p className="text-base">{message}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
