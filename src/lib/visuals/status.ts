import type { VisualAsset } from "@/lib/domain/schemas";

export type VisualAssetStatus = VisualAsset["status"];
/** `"missing"` s'ajoute aux trois statuts réels (`draft`/`approved`/`rejected`) pour représenter un sujet sans aucun visuel — jamais stocké en base, uniquement un état d'affichage dérivé. */
export type VisualDisplayStatus = VisualAssetStatus | "missing";

export const VISUAL_STATUS_LABEL: Record<VisualAssetStatus, string> = {
  draft: "Brouillon",
  approved: "Approuvé",
  rejected: "Rejeté",
};

/**
 * Statut représentatif d'un sujet à partir de toutes ses variantes : le plus
 * « avancé » l'emporte (un sujet avec au moins un visuel approuvé s'affiche
 * approuvé même s'il a aussi des brouillons ou des rejets — l'historique
 * complet reste consultable séparément, jamais résumé en perdant des
 * variantes). Réutilisé par la galerie de génération (E3) et le centre de
 * consultation `/illustrations` (K5) : une seule règle, jamais deux
 * implémentations divergentes.
 */
export function bestVisualStatus(assets: Pick<VisualAsset, "status">[]): VisualDisplayStatus {
  if (assets.length === 0) return "missing";
  if (assets.some((asset) => asset.status === "approved")) return "approved";
  if (assets.some((asset) => asset.status === "draft")) return "draft";
  return "rejected";
}
