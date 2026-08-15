import { VISUAL_STATUS_LABEL, type VisualDisplayStatus } from "@/lib/visuals/status";

const STATUS_CLASSES: Record<Exclude<VisualDisplayStatus, "missing">, string> = {
  draft: "border-grise bg-avoine text-cacao",
  approved: "border-olive/40 bg-olive/10 text-cacao",
  rejected: "border-brunrouge/40 bg-brunrouge/10 text-brunrouge",
};

/**
 * Pastille de statut d'un visuel IA (`draft`/`approved`/`rejected`/`missing`
 * dérivé). Statut jamais porté par la seule couleur : le texte distingue
 * toujours (docs/06-DESIGN_SYSTEM.md § État « À vérifier »). Partagée par la
 * galerie de génération (`/visuels`, E3) et le centre de consultation
 * (`/illustrations`, K5) — une seule apparence pour un même statut.
 */
export function VisualStatusPill({ status }: { status: VisualDisplayStatus }) {
  if (status === "missing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-grise px-2.5 py-1 text-xs font-medium text-cacao/60">
        Sans illustration
      </span>
    );
  }
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {VISUAL_STATUS_LABEL[status]}
    </span>
  );
}
