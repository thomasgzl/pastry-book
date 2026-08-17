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
 * Icônes : sceau de marque validé, décliné en PNG carrés 192 et 512
 * (`public/visuals/logo/logo-pwa-{192,512}.png`, contour unique lisible en
 * petit), servis à Chrome/Android/desktop. `layout.tsx` réutilise le 192 pour
 * `apple-touch-icon` (iOS). Purpose `any` uniquement : le sceau est posé sur
 * fond transparent avec des coins libres, donc pas de variante `maskable`
 * (un masque plein-cadre rognerait l'anneau) — à ajouter le jour où un asset
 * maskable plein-fond est fourni. L'illustration détaillée de l'accueil n'est
 * JAMAIS utilisée comme icône.
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
        src: "/visuals/logo/logo-pwa-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/visuals/logo/logo-pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
