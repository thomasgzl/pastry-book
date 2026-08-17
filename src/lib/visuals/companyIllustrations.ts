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
