import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message?: string;
  /** Action « Réessayer », affichée seulement si fournie. */
  onRetry?: () => void;
  className?: string;
}

/**
 * État d'erreur générique : message clair (`role="alert"`), jamais porté
 * par la seule couleur. Action de reprise optionnelle laissée à l'appelant.
 */
export function ErrorState({
  message = "Une erreur est survenue. Merci de réessayer.",
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 rounded-xl border border-brunrouge/40 bg-brunrouge/10 px-4 py-8 text-center ${className}`}
    >
      <p className="text-base font-medium text-brunrouge">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
