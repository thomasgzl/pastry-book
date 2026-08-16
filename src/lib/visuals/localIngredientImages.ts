/**
 * Illustrations botaniques réelles fournies directement (`public/visuals`,
 * 2026-08-16) — pas un visuel IA approuvé (`visual_assets`), juste un repli
 * statique tant qu'aucune génération/approbation n'existe pour la matière
 * première. Un slug canonique absent de cette liste retombe sur l'ornement
 * générique existant, jamais une image inventée. Même liste de fichiers que
 * `scripts/link-local-ingredient-images.mjs` (qui associe ces images en base
 * dès qu'un vrai Supabase est configuré) — ce repli couvre le mode
 * démonstration et toute fenêtre avant exécution du script.
 */
const BY_SLUG: Record<string, string> = {
  "chocolat-noir": "/visuals/01-chocolat-noir.svg",
  "chocolat-au-lait": "/visuals/02-chocolat-au-lait.svg",
  "chocolat-blanc": "/visuals/03-chocolat-blanc.svg",
  vanille: "/visuals/04-vanille.svg",
  "chocolat-blond-dulcey": "/visuals/05-chocolat-blond-dulcey.svg",
  caramel: "/visuals/06-caramel.svg",
  cafe: "/visuals/07-cafe.svg",
  citron: "/visuals/08-citron.svg",
  "citron-vert": "/visuals/09-citron-vert.svg",
  orange: "/visuals/10-orange.svg",
  fraise: "/visuals/11-fraise.svg",
  framboise: "/visuals/12-framboise.svg",
  myrtille: "/visuals/13-myrtille.svg",
  cassis: "/visuals/14-cassis.svg",
  pomme: "/visuals/15-pomme.svg",
  poire: "/visuals/16-poire.svg",
  "fruit-de-la-passion": "/visuals/17-fruit-de-la-passion.svg",
  banane: "/visuals/18-banane.svg",
  ananas: "/visuals/19-ananas.svg",
  mangue: "/visuals/20-mangue.svg",
  "noix-de-coco": "/visuals/21-noix-de-coco.svg",
  amande: "/visuals/22-amande.svg",
  noisette: "/visuals/23-noisette.svg",
  pistache: "/visuals/24-pistache.svg",
  "noix-de-pecan": "/visuals/25-noix-de-pecan.svg",
};

export function getLocalIngredientImage(slug: string): string | undefined {
  return BY_SLUG[slug];
}
