import type { MetadataRoute } from "next";

/**
 * Manifeste PWA (B8). Convention native Next.js App Router : ce fichier sert
 * automatiquement `/manifest.webmanifest`, déjà exclu de l'authentification
 * dans `middleware.ts`.
 *
 * Couleurs : `background_color` reprend le fond ivoire du design system (ce
 * que l'utilisatrice voit pendant le lancement de l'app installée) ;
 * `theme_color` reprend le vert olive, déjà la couleur d'action/navigation
 * du design system (`docs/06-DESIGN_SYSTEM.md`) — cohérent avec la barre de
 * statut/chrome du système plutôt que le brun cacao, réservé au texte.
 *
 * Icônes : aucune illustration IA n'existe encore (lot E non lancé). Plutôt
 * que d'installer une dépendance de rendu d'image (sharp/canvas) pour un
 * simple aplat de couleur, on référence une unique icône SVG vectorielle
 * (`public/icons/icon.svg`, monogramme géométrique olive sur fond ivoire)
 * avec `sizes: "any"` — accepté nativement par le standard manifeste et par
 * Chrome/Android/desktop, sans perte de qualité à aucune taille (couvre donc
 * 192 et 512 sans générer plusieurs fichiers). iOS ne sait pas utiliser de
 * SVG comme icône d'accueil ; `layout.tsx` pointe quand même
 * `apple-touch-icon` vers le même fichier en dégradation gracieuse (Safari
 * retombera sur une capture de la page, non bloquant) — générer un vrai PNG
 * à la main via zlib pour un simple placeholder de couleur unie n'apporte
 * pas de valeur proportionnée à sa complexité. À remplacer par les visuels
 * réels du lot E (ai-visuals-agent) sans changer cette structure.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Grand Livre de Pâtisserie",
    short_name: "Grand Livre",
    description: "Base privée de recettes professionnelles.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F3EA",
    theme_color: "#556043",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
