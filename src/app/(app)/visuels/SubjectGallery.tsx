import type { VisualAsset } from "@/lib/domain/schemas";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";
import { bestVisualStatus, VISUAL_STATUS_LABEL, type VisualDisplayStatus } from "@/lib/visuals/status";
import type { VisualSubject } from "@/lib/visuals/subjects";
import { approveAction, generateAction, regenerateAction, rejectAction, setPrimaryAction } from "./actions";

type AssetStatus = VisualAsset["status"];
type DisplayStatus = VisualDisplayStatus;

const STATUS_LABEL = VISUAL_STATUS_LABEL;

const STATUS_CLASSES: Record<AssetStatus, string> = {
  draft: "border-grise bg-avoine text-cacao",
  approved: "border-olive/40 bg-olive/10 text-cacao",
  rejected: "border-brunrouge/40 bg-brunrouge/10 text-brunrouge",
};

function StatusPill({ status }: { status: DisplayStatus }) {
  if (status === "missing") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-grise px-2.5 py-1 text-xs font-medium text-cacao/60">
        Manquant
      </span>
    );
  }
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

interface AssetVariantProps {
  asset: VisualAsset;
}

/** Une variante (ligne de la galerie), avec ses actions conditionnées par son statut — jamais toutes proposées à la fois. */
function AssetVariant({ asset }: AssetVariantProps) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-grise bg-coquille p-3 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element -- image de démonstration en data URI, pas de pipeline next/image (lot E). */}
      <img
        src={asset.imageUrl}
        alt=""
        className="h-20 w-20 shrink-0 self-center rounded-lg border border-grise bg-ivoire object-contain sm:self-start"
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={asset.status} />
          {asset.isPrimary && (
            <span className="inline-flex items-center rounded-full border border-laiton/50 bg-laiton/10 px-2.5 py-1 text-xs font-medium text-cacao">
              Principal
            </span>
          )}
          <span className="text-xs text-cacao/60">
            preset {asset.presetVersion} · {formatDate(asset.createdAt)}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-cacao/70" title={asset.prompt}>
          {asset.prompt}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {asset.status === "draft" && (
            <form action={approveAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <Button type="submit" variant="primary" className="text-sm">
                Approuver
              </Button>
            </form>
          )}
          {asset.status !== "rejected" && (
            <form action={rejectAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <Button type="submit" variant="secondary" className="text-sm">
                Rejeter
              </Button>
            </form>
          )}
          {asset.status === "approved" && !asset.isPrimary && (
            <form action={setPrimaryAction}>
              <input type="hidden" name="assetId" value={asset.id} />
              <Button type="submit" variant="secondary" className="text-sm">
                Définir comme principal
              </Button>
            </form>
          )}
          <form action={regenerateAction}>
            <input type="hidden" name="assetId" value={asset.id} />
            <Button type="submit" variant="secondary" className="text-sm">
              Régénérer
            </Button>
          </form>
        </div>
      </div>
    </li>
  );
}

interface SubjectGalleryProps {
  subject: VisualSubject;
  assets: VisualAsset[];
}

/**
 * Une entrée « sujet » repliable (`<details>` natif — aucun état client
 * requis) : résumé (vignette principale + statut) et, une fois ouverte,
 * la galerie complète des variantes avec leurs actions
 * (Approuver/Régénérer/Rejeter/Définir comme principal, `docs/09-AI_VISUALS.md`).
 */
export function SubjectGallery({ subject, assets }: SubjectGalleryProps) {
  const primary = assets.find((asset) => asset.isPrimary) ?? assets[0];
  const sourceLabel =
    subject.type === "recipe" ? (subject.photoUrl ? "Source : photo" : "Source : description") : undefined;

  return (
    <Card className="p-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
          {primary ? (
            // eslint-disable-next-line @next/next/no-img-element -- image de démonstration en data URI, pas de pipeline next/image (lot E).
            <img
              src={primary.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg border border-grise bg-ivoire object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-grise bg-ivoire"
            >
              <PlaceholderIllustration label={subject.label} className="h-9 w-9" />
            </span>
          )}
          <span className="flex flex-1 flex-col gap-1">
            <span className="font-serif text-base font-semibold text-cacao">
              {subject.label}
              {subject.parentLabel && <span className="ml-1 font-sans text-xs font-normal text-cacao/60">({subject.parentLabel})</span>}
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <StatusPill status={bestVisualStatus(assets)} />
              {assets.length > 1 && <span className="text-xs text-cacao/60">{assets.length} variantes</span>}
              {sourceLabel && <span className="text-xs text-cacao/60">{sourceLabel}</span>}
            </span>
          </span>
        </summary>

        <div className="flex flex-col gap-3 border-t border-grise p-4">
          {assets.length > 0 && (
            <ul className="flex flex-col gap-3">
              {assets.map((asset) => (
                <AssetVariant key={asset.id} asset={asset} />
              ))}
            </ul>
          )}

          <form action={generateAction} className="flex">
            <input type="hidden" name="subjectType" value={subject.type} />
            <input type="hidden" name="subjectId" value={subject.id} />
            <Button type="submit" variant="secondary">
              {assets.length === 0 ? "Générer un visuel" : "Générer un nouveau brouillon"}
            </Button>
          </form>
        </div>
      </details>
    </Card>
  );
}
