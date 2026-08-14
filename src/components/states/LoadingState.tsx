interface LoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * État de chargement générique : spinner sobre + texte, jamais une couleur
 * seule. `aria-live="polite"` annonce le message aux lecteurs d'écran sans
 * interrompre leur lecture en cours.
 */
export function LoadingState({ message = "Chargement…", className = "" }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center gap-3 py-12 text-center text-cacao/70 ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-grise border-t-olive"
      />
      <p className="text-sm">{message}</p>
    </div>
  );
}
