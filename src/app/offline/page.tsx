import Link from "next/link";

/**
 * Page de repli hors connexion (B8). Précachée par `public/sw.js` à
 * l'installation : le service worker la sert directement, sans requête
 * réseau, quand une page non encore visitée est demandée hors ligne. Pas de
 * page blanche générique du navigateur — état cohérent avec le design
 * system, explication claire pour l'utilisatrice.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="font-serif text-2xl font-semibold text-cacao">
        Pas de connexion
      </h1>
      <p className="text-base text-cacao/80">
        Cette page n&rsquo;a pas encore été consultée avec une connexion
        active : elle ne peut donc pas s&rsquo;afficher hors ligne. Les
        recettes déjà ouvertes récemment restent disponibles.
        Reconnectez-vous pour accéder au reste.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-olive px-4 py-2 text-base font-medium text-coquille transition-colors hover:bg-olive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
      >
        Retour à l&rsquo;accueil
      </Link>
    </div>
  );
}
