/**
 * Chemins centralisés des visuels de marque validés (identité « Le Grand
 * Livre de Pâtisserie »), servis depuis `public/visuals/logo`. Un seul point
 * de vérité : aucun composant ne code un chemin de logo en dur, ils importent
 * ces constantes (compatibilité Linux/Vercel, casse et extensions vérifiées).
 *
 * Chaque asset a une variante dédiée à une échelle d'usage :
 * - `seal` : sceau complet (double contour, texte « LE GRAND LIVRE DE
 *   PÂTISSERIE », tartelette meringuée, rameau, deux accents laiton). Grandes
 *   tailles uniquement — page de connexion, éventuels usages éditoriaux.
 * - `horizontal` : sceau + nom déployé sur une ligne. En-tête ordinateur /
 *   tablette paysage.
 * - `compact` : sceau simplifié (contour unique, lisible en petit). En-tête
 *   mobile et toute vignette de marque de petite taille.
 * - `icon192` / `icon512` : icônes PWA carrées (manifeste + apple-touch-icon).
 * - `homeIllustration` : illustration éditoriale de l'accueil (tarte au citron
 *   meringuée, botanique, fond transparent). JAMAIS utilisée comme icône PWA.
 */
export const LOGO_ASSETS = {
  seal: "/visuals/logo/logo-sceau.png",
  horizontal: "/visuals/logo/logo-horizontal.png",
  compact: "/visuals/logo/logo-pwa-192.png",
  icon192: "/visuals/logo/logo-pwa-192.png",
  icon512: "/visuals/logo/logo-pwa-512.png",
  homeIllustration: "/visuals/logo/illustration-accueil-tarte-citron.png",
} as const;
