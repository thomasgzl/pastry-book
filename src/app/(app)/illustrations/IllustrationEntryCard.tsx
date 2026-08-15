import { Card } from "@/components/ui/Card";
import { PlaceholderIllustration } from "@/components/ui/PlaceholderIllustration";
import { VisualStatusPill } from "@/components/ui/VisualStatusPill";
import type { IllustrationEntry } from "./IllustrationsBrowser";

const STATUS_CLASSES = {
  draft: "border-grise bg-avoine text-cacao",
  approved: "border-olive/40 bg-olive/10 text-cacao",
  rejected: "border-brunrouge/40 bg-brunrouge/10 text-brunrouge",
} as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Une ligne de l'historique des versions d'un sujet — purement informative
 * (aucune action : approuver/rejeter/régénérer restent dans `/visuels`
 * jusqu'à leur intégration par K8-K12). Aucune donnée technique affichée
 * (pas d'identifiant Supabase visible en texte).
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
      <div className="flex flex-1 flex-col gap-1">
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
      </div>
    </li>
  );
}

interface IllustrationEntryCardProps {
  entry: IllustrationEntry;
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
 * vide, aucun `<details>` qui s'ouvrirait sur du vide). Un sujet avec au
 * moins une version se replie/déplie (`<details>` natif — aucun état client
 * requis) sur son historique complet. Lecture seule : aucune action ici
 * (approuver/rejeter/régénérer restent dans `/visuels` jusqu'à leur
 * intégration par K8-K12).
 */
export function IllustrationEntryCard({ entry }: IllustrationEntryCardProps) {
  if (entry.versions.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <EntryHeader entry={entry} />
      </Card>
    );
  }

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
        </div>
      </details>
    </Card>
  );
}
