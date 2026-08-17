import Link from "next/link";
import type { VisualAsset } from "@/lib/domain/schemas";

type SubjectType = VisualAsset["subjectType"];

interface IllustrationActionProps {
  subjectType: SubjectType;
  /** Le sujet a-t-il déjà un visuel principal approuvé (`getApprovedVisualUrl` non `null`) ? */
  hasVisual: boolean;
  /** Nom du sujet, utilisé pour filtrer la file/le centre vers ce sujet précis. */
  label: string;
  className?: string;
}

/**
 * Action secondaire discrète (K12) : jamais d'appel direct à une génération,
 * toujours un renvoi vers l'écran de confirmation correspondant — la file
 * des illustrations manquantes (K9) si le sujet n'a encore aucun visuel
 * principal, ou le centre `/illustrations` (K11, « Générer une nouvelle
 * version » par sujet dans `IllustrationEntryCard`) filtré sur ce sujet
 * précis si un visuel approuvé existe déjà. Les deux cibles supportent déjà
 * un filtre par nom (`?q=`, K5/K9) — aucun nouveau mécanisme de recherche
 * n'est créé ici, seulement réutilisé pour approcher un deep-link précis.
 *
 * Réservée aux utilisateurs authentifiés : héritée du shell applicatif
 * (`src/proxy.ts` bloque tout accès non authentifié à `(app)`), aucune
 * vérification de rôle supplémentaire — l'authentification est privée et
 * simple, sans rôle dans le périmètre MVP (même mécanisme que K13).
 */
export function IllustrationAction({ subjectType, hasVisual, label, className = "" }: IllustrationActionProps) {
  const href = hasVisual
    ? `/illustrations?type=${subjectType}&q=${encodeURIComponent(label)}`
    : `/illustrations/manquantes?q=${encodeURIComponent(label)}`;

  return (
    <Link
      href={href}
      className={`text-sm text-cacao/60 underline hover:text-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${className}`}
    >
      {hasVisual ? "Nouvelle version" : "Créer une illustration"}
    </Link>
  );
}
