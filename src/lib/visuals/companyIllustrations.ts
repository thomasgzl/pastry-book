/**
 * Correspondance entre une source (slug) et son illustration statique dans
 * `public/visuals/company` (affiches verticales, titre intégré en haut).
 * Repli utilisé uniquement quand aucun visuel IA approuvé n'existe encore
 * pour cette source (`getApprovedVisualUrl`) — jamais prioritaire dessus.
 *
 * `position` cadre `object-fit: cover` sur le bâtiment plutôt que sur le
 * bandeau de titre, ajusté au cas par cas selon la composition de chaque
 * affiche.
 */
export interface CompanyIllustration {
  path: string;
  position: string;
}

export const COMPANY_ILLUSTRATION_BY_SLUG: Record<string, CompanyIllustration> = {
  "institut-culinaire-de-france": {
    path: "/visuals/company/01-institut-culinaire-de-france.png",
    position: "30% 75%",
  },
  "peter-coffee-shop": {
    path: "/visuals/company/02-peter-coffee-shop.png",
    position: "40% 80%",
  },
  "le-7-cite-du-vin": {
    path: "/visuals/company/03-le-7-cite-du-vin.png",
    position: "35% 78%",
  },
  hennessy: {
    path: "/visuals/company/04-chateau-de-bagnolet-hennessy.png",
    position: "45% 88%",
  },
  "eden-rock": {
    path: "/visuals/company/05-eden-rock.png",
    position: "60% 78%",
  },
  "auberge-du-pere-bise": {
    path: "/visuals/company/06-auberge-du-pere-bise.png",
    position: "40% 87%",
  },
};

export function getCompanyIllustration(slug: string): CompanyIllustration | undefined {
  return COMPANY_ILLUSTRATION_BY_SLUG[slug];
}

/**
 * Point d'extension IA (à câbler par `ai-visuals-agent`, hors de ce lot).
 * Lorsqu'une future entreprise importée n'a pas d'entrée ici :
 *   1. vérifier l'existence d'un visuel approuvé (`getApprovedVisualUrl`) et le
 *      réutiliser tel quel s'il existe — jamais de régénération d'une image déjà
 *      présente ;
 *   2. sinon, mettre la génération EN FILE explicite (pipeline IA), jamais
 *      déclenchée au simple affichage de la carte ;
 *   3. en cas d'échec ou tant que rien n'est généré, conserver le placeholder —
 *      l'absence d'illustration ne casse jamais la page.
 * La carte entreprise reste agnostique : elle lit un chemin fourni par cette
 * couche de données, elle ne code aucun chemin en dur.
 */
