import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";
import { VisualStatusPill } from "@/components/ui/VisualStatusPill";
import { approveAsPrimaryAction, rejectAction, setPrimaryAction } from "../visuels/actions";
import { RegenerateVersionForm } from "./RegenerateVersionForm";
import type { IllustrationEntry, RegenerateProviderInfo } from "./IllustrationsBrowser";

const STATUS_CLASSES = {
  draft: "border-grise bg-avoine text-cacao",
  approved: "border-olive/40 bg-olive/10 text-cacao",
  rejected: "border-brunrouge/40 bg-brunrouge/10 text-brunrouge",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Une ligne de l'historique des versions d'un sujet (K11) : actions
 * conditionnées par son statut, jamais toutes proposées à la fois — même
 * logique que `SubjectGallery` (`/visuels`), réutilisée ici via les mêmes
 * Server Actions plutôt que dupliquée. Aucune donnée technique affichée
 * (pas d'identifiant Supabase visible en texte, l'`assetId` ne circule que
 * dans un champ caché de formulaire).
 *
 * « Conserver en brouillon » n'est pas un bouton séparé : ne rien
 * approuver/rejeter EST la façon de conserver un brouillon (un brouillon
 * n'est jamais approuvé automatiquement, CLAUDE.md) — une phrase l'explique
 * plutôt qu'un contrôle qui n'aurait aucun effet à cliquer.
 */
function VersionRow({ version }: { version: IllustrationEntry["versions"][number] }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-grise bg-coquille p-3 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element -- image de démonstration en data URI, pas de pipeline next/image (même choix que SubjectGallery, lot E). */}
      <img
        src={version.imageUrl}
        alt=""
        className="h-16 w-16 shrink-0 self-center rounded-lg border border-grise bg-ivoire object-contain sm:self-start"
      />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[version.status]}`}
          >
            {version.status === "draft" ? "Brouillon" : version.status === "approved" ? "Approuvé" : "Rejeté"}
          </span>
          {version.isPrimary && (
            <span className="inline-flex items-center rounded-full border border-laiton/50 bg-laiton/10 px-2.5 py-1 text-xs font-medium text-cacao">
              Principal
            </span>
          )}
        </div>
        <span className="text-xs text-cacao/60">
          preset {version.presetVersion} · {formatDate(version.createdAt)}
        </span>

        {version.status === "draft" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <form action={approveAsPrimaryAction}>
              <input type="hidden" name="assetId" value={version.id} />
              <Button type="submit" variant="primary" className="text-sm">
                Approuver et utiliser
              </Button>
            </form>
            <form action={rejectAction}>
              <input type="hidden" name="assetId" value={version.id} />
              <Button type="submit" variant="secondary" className="text-sm">
                Rejeter
              </Button>
            </form>
            <span className="text-xs text-cacao/60">
              Ni approuvé ni rejeté : reste en brouillon, à vérifier plus tard.
            </span>
          </div>
        )}

        {version.status === "approved" && !version.isPrimary && (
          <div className="pt-1">
            <form action={setPrimaryAction}>
              <input type="hidden" name="assetId" value={version.id} />
              <Button type="submit" variant="secondary" className="text-sm">
                Définir comme principal
              </Button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}

interface IllustrationEntryCardProps {
  entry: IllustrationEntry;
  regenerateInfo: RegenerateProviderInfo;
}

function EntryHeader({ entry }: { entry: IllustrationEntry }) {
  return (
    <span className="flex flex-1 items-center gap-3">
      {entry.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- image de démonstration en data URI, pas de pipeline next/image (lot E).
        <img
          src={entry.thumbnailUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg border border-grise bg-ivoire object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-grise bg-ivoire"
        >
          <PlaceholderIllustration label={entry.label} className="h-9 w-9" />
        </span>
      )}
      <span className="flex flex-1 flex-col gap-1">
        <span className="font-serif text-base font-semibold text-cacao">
          {entry.label}
          {entry.parentLabel && (
            <span className="ml-1 font-sans text-xs font-normal text-cacao/60">({entry.parentLabel})</span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <VisualStatusPill status={entry.status} />
          {entry.versions.length > 1 && (
            <span className="text-xs text-cacao/60">{entry.versions.length} versions</span>
          )}
        </span>
      </span>
    </span>
  );
}

/**
 * Entrée « sujet » de la liste de consultation. Un sujet sans aucune version
 * n'a rien à déplier : rendu comme un simple bloc statique (aucune rubrique
 * vide, aucun `<details>` qui s'ouvrirait sur du vide, aucune régénération —
 * ce sujet est « manquant », géré par `/illustrations/manquantes`, K8). Un
 * sujet avec au moins une version se replie/déplie (`<details>` natif —
 * aucun état client requis) sur son historique complet et ses actions
 * (K11) : Approuver et utiliser / Rejeter / Définir comme principal par
 * version, et « Générer une nouvelle version » au niveau du sujet (une
 * nouvelle version s'ajoute au sujet, pas à une version précise).
 */
export function IllustrationEntryCard({ entry, regenerateInfo }: IllustrationEntryCardProps) {
  if (entry.versions.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <EntryHeader entry={entry} />
      </Card>
    );
  }

  const dimensions = regenerateInfo.dimensionsByType[entry.type];

  return (
    <Card className="p-0">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
          <EntryHeader entry={entry} />
        </summary>

        <div className="flex flex-col gap-3 border-t border-grise p-4">
          <ul className="flex flex-col gap-3">
            {entry.versions.map((version) => (
              <VersionRow key={version.id} version={version} />
            ))}
          </ul>

          <RegenerateVersionForm
            subjectType={entry.type}
            subjectId={entry.id}
            subjectLabel={entry.label}
            photoUrl={entry.photoUrl}
            categorySlug={entry.categorySlug}
            preparationNames={entry.preparationNames}
            validatedKeyIngredientNames={entry.validatedKeyIngredientNames}
            additionalInformation={entry.additionalInformation}
            providerName={regenerateInfo.providerName}
            providerModel={regenerateInfo.providerModel}
            quality={regenerateInfo.quality}
            costPerImageEstimateEur={regenerateInfo.costPerImageEstimateEur}
            costDocUrl={regenerateInfo.costDocUrl}
            ratio={dimensions.ratio}
            size={dimensions.size}
          />
        </div>
      </details>
    </Card>
  );
}
