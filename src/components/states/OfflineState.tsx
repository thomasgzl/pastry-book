interface OfflineStateProps {
  message?: string;
  className?: string;
}

/**
 * Repli hors ligne réutilisable en ligne, dans une section qui échoue à
 * charger — même ton visuel que `src/app/offline/page.tsx` (page de repli
 * complète, précachée par le service worker), mais sans quitter la page
 * courante ni proposer un lien de retour à l'accueil.
 */
export function OfflineState({
  message = "Cette section n'a pas encore été consultée avec une connexion active : elle ne peut donc pas s'afficher hors ligne.",
  className = "",
}: OfflineStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center gap-2 rounded-xl border border-grise bg-avoine/40 px-4 py-8 text-center ${className}`}
    >
      <p className="font-serif text-lg font-semibold text-cacao">Pas de connexion</p>
      <p className="text-sm text-cacao/80">{message}</p>
    </div>
  );
}
