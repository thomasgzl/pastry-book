/**
 * Centre définitif des illustrations (K5) — remplace les pages pilotes
 * supprimées en K2 (`/visuels/pilote*`). Espace SECONDAIRE de CONSULTATION
 * uniquement : visuels approuvés, brouillons à vérifier, rejetés, sujets
 * sans illustration, historique complet des versions par sujet. Filtres
 * (type de sujet, statut, recherche par nom) portés par l'URL et traités
 * dans `IllustrationsBrowser` (Client Component), même patron que
 * `/recettes` (K1, `RecettesBrowser`).
 *
 * Aucune génération, aucune approbation, aucun rejet ici : ces actions
 * mutent déjà `visual_assets` depuis `/visuels` (E3) et seront intégrées à
 * ce centre par K8-K12 (file des manquants, confirmation de coût,
 * persistance, approbation). Tant que ces tâches ne sont pas livrées, ce
 * centre ne fait que lire — jamais un bouton qui prétend agir sans effet
 * réel.
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { ErrorState } from "@/components/states/ErrorState";
import { VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import { listVisualAssets } from "@/lib/visuals/storage";
import { getAllVisualSubjects } from "@/lib/visuals/subjects";
import { bestVisualStatus } from "@/lib/visuals/status";
import { IllustrationsBrowser, type IllustrationEntry } from "./IllustrationsBrowser";

async function loadIllustrationEntries(): Promise<IllustrationEntry[]> {
  const subjects = await getAllVisualSubjects();
  const assetsBySubjectId = new Map(
    await Promise.all(
      subjects.map(
        async (subject) => [`${subject.type}-${subject.id}`, await listVisualAssets(subject.type, subject.id)] as const,
      ),
    ),
  );

  return subjects.map((subject) => {
    const assets = assetsBySubjectId.get(`${subject.type}-${subject.id}`) ?? [];
    const primary = assets.find((asset) => asset.isPrimary) ?? assets[0];
    return {
      type: subject.type,
      id: subject.id,
      slug: subject.slug,
      label: subject.label,
      parentLabel: subject.parentLabel,
      status: bestVisualStatus(assets),
      thumbnailUrl: primary?.imageUrl ?? null,
      versions: assets.map((asset) => ({
        id: asset.id,
        status: asset.status,
        isPrimary: asset.isPrimary,
        imageUrl: asset.imageUrl,
        presetVersion: asset.presetVersion,
        createdAt: asset.createdAt,
      })),
    } satisfies IllustrationEntry;
  });
}

export default async function IllustrationsPage() {
  let entries: IllustrationEntry[] | null = null;
  let loadError = false;
  try {
    entries = await loadIllustrationEntries();
  } catch {
    // Lecture Storage/Supabase indisponible : état d'erreur explicite plutôt
    // qu'un plantage — ce centre est secondaire, jamais bloquant pour le
    // reste de l'application (même principe que `ApprovedVisual`).
    loadError = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Illustrations" }]} />

      <div className="flex flex-col gap-2">
        <EditorialTitle>Illustrations</EditorialTitle>
        <p className="text-sm text-cacao/70">
          Centre de consultation des visuels IA : approuvés, brouillons à vérifier, rejetés, sujets sans
          illustration, historique des versions. Preset « Botanique éditorial — {VISUAL_PRESET_VERSION} ».
          La génération et la validation se font depuis « Visuels IA ».
        </p>
      </div>

      {loadError || !entries ? (
        <ErrorState message="Les illustrations n'ont pas pu être chargées. Merci de réessayer." />
      ) : (
        <IllustrationsBrowser entries={entries} />
      )}
    </div>
  );
}
