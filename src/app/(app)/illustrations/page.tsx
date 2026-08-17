/**
 * Centre définitif des illustrations (K5) — remplace les pages pilotes
 * supprimées en K2 (`/visuels/pilote*`). Consultation : visuels approuvés,
 * brouillons à vérifier, rejetés, sujets sans illustration, historique
 * complet des versions par sujet. Filtres (type de sujet, statut, recherche
 * par nom) portés par l'URL et traités dans `IllustrationsBrowser` (Client
 * Component), même patron que `/recettes` (K1, `RecettesBrowser`).
 *
 * K11 : chaque brouillon propose désormais « Approuver et utiliser »/
 * « Rejeter »/« Générer une nouvelle version » directement ici
 * (`IllustrationEntryCard`, formulaires réutilisant les Server Actions de
 * `/visuels/actions.ts` — même logique, jamais dupliquée). `/visuels` (E3)
 * reste fonctionnel en parallèle (mêmes données, mêmes actions).
 */

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { ErrorState } from "@/components/states/ErrorState";
import { describeRealImageGenerationRequest, OPENAI_PRICING_DOC_URL, SIZE_BY_RATIO } from "@/lib/ai/visuals/openai-provider";
import { getSubjectFraming, VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import type { VisualSubjectKind } from "@/lib/visuals/preset";
import { listVisualAssets } from "@/lib/visuals/storage";
import { getAllVisualSubjects } from "@/lib/visuals/subjects";
import { bestVisualStatus } from "@/lib/visuals/status";
import { IllustrationsBrowser, type IllustrationEntry, type RegenerateProviderInfo } from "./IllustrationsBrowser";

const KINDS: VisualSubjectKind[] = ["ingredient", "recipe", "source", "sourceCategory"];

/** Mêmes informations que celles affichées par la file des manquants (K9, `manquantes/page.tsx`) — réutilisées ici pour « Générer une nouvelle version » (K11), jamais recalculées différemment. */
function buildRegenerateInfo(): RegenerateProviderInfo {
  const description = describeRealImageGenerationRequest("draft");
  const dimensionsByType = Object.fromEntries(
    KINDS.map((kind) => {
      const framing = getSubjectFraming(kind);
      return [kind, { ratio: framing.ratio, size: SIZE_BY_RATIO[framing.ratio] }];
    }),
  ) as Record<VisualSubjectKind, { ratio: string; size: string }>;

  return {
    providerName: description.providerName,
    providerModel: description.model,
    quality: description.quality,
    costPerImageEstimateEur: description.costPerImageEstimateEur,
    costDocUrl: OPENAI_PRICING_DOC_URL,
    dimensionsByType,
  };
}

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
      photoUrl: subject.photoUrl,
      categorySlug: subject.categorySlug,
      preparationNames: subject.preparationNames,
      validatedKeyIngredientNames: subject.validatedKeyIngredientNames,
      additionalInformation: subject.additionalInformation,
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
          Centre de consultation et de validation des visuels IA : approuvés, brouillons à vérifier, rejetés,
          sujets sans illustration, historique des versions. Preset « Botanique éditorial —{" "}
          {VISUAL_PRESET_VERSION} ».
        </p>
      </div>

      {loadError || !entries ? (
        <ErrorState message="Les illustrations n'ont pas pu être chargées. Merci de réessayer." />
      ) : (
        <IllustrationsBrowser entries={entries} regenerateInfo={buildRegenerateInfo()} />
      )}
    </div>
  );
}
