import type { VisualAsset } from "@/lib/domain/schemas";

type SubjectType = VisualAsset["subjectType"];

/**
 * ponytail: état mutable en mémoire process — même limite déjà acceptée pour
 * `src/lib/demo/data.ts` (pas de vraie base tant que Supabase/Docker n'est
 * pas disponible, voir CLAUDE.md/rapport B3/B4). Ne survit pas à un redémarrage
 * ni, en production serverless, à une nouvelle instance de fonction. Mise à
 * niveau : remplacer ces fonctions par de vraies requêtes sur la table
 * `visual_assets` (contrat déjà gelé, migration déjà écrite) sans changer
 * cette API — les appelants (`service.ts`, `actions.ts`) n'ont pas à changer.
 */
let store: VisualAsset[] = [];

/** Réservé aux tests et à l'amorçage des exemples de démonstration (E4) — jamais appelé par l'UI. */
export function seedVisualAssetsStore(initial: VisualAsset[]): void {
  store = [...initial];
}

export function listVisualAssets(subjectType?: SubjectType, subjectId?: string): VisualAsset[] {
  return store.filter(
    (asset) =>
      (!subjectType || asset.subjectType === subjectType) &&
      (!subjectId || asset.subjectId === subjectId),
  );
}

export function getVisualAssetById(id: string): VisualAsset | undefined {
  return store.find((asset) => asset.id === id);
}

export function hasAnyVisualAsset(subjectType: SubjectType, subjectId: string): boolean {
  return store.some((asset) => asset.subjectType === subjectType && asset.subjectId === subjectId);
}

export function getPrimaryVisualAsset(subjectType: SubjectType, subjectId: string): VisualAsset | undefined {
  return store.find(
    (asset) => asset.subjectType === subjectType && asset.subjectId === subjectId && asset.isPrimary,
  );
}

export interface CreateDraftInput {
  subjectType: SubjectType;
  subjectId: string;
  imageUrl: string;
  sourcePhotoUrl: string | null;
  prompt: string;
  presetVersion: string;
}

/**
 * Crée toujours une nouvelle ligne en statut `draft` : ne modifie et
 * n'écrase jamais un asset existant, même approuvé (règle non négociable
 * E1 — voir `service.test.ts` pour le test de ce scénario exact).
 */
export function createDraftVisualAsset(input: CreateDraftInput): VisualAsset {
  const asset: VisualAsset = {
    id: crypto.randomUUID(),
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    status: "draft",
    isPrimary: false,
    imageUrl: input.imageUrl,
    sourcePhotoUrl: input.sourcePhotoUrl,
    prompt: input.prompt,
    presetVersion: input.presetVersion,
    createdAt: new Date().toISOString(),
  };
  store = [...store, asset];
  return asset;
}

export class VisualAssetActionError extends Error {}

function updateAsset(id: string, changes: Partial<VisualAsset>): VisualAsset {
  const existing = getVisualAssetById(id);
  if (!existing) throw new VisualAssetActionError("Visuel introuvable.");
  const updated = { ...existing, ...changes };
  store = store.map((asset) => (asset.id === id ? updated : asset));
  return updated;
}

/**
 * Approuve un brouillon. Si le sujet n'a encore aucun visuel principal, le
 * nouvel approuvé le devient automatiquement (première publication,
 * `docs/09-AI_VISUALS.md` § Parcours de génération unitaire). Sinon il reste
 * approuvé sans devenir principal : jamais de remplacement silencieux d'un
 * visuel déjà validé — « Définir comme principal » est une action humaine
 * distincte (`setPrimaryVisualAsset`).
 */
export function approveVisualAsset(id: string): VisualAsset {
  const asset = getVisualAssetById(id);
  if (!asset) throw new VisualAssetActionError("Visuel introuvable.");
  const alreadyHasPrimary = Boolean(getPrimaryVisualAsset(asset.subjectType, asset.subjectId));
  return updateAsset(id, { status: "approved", isPrimary: !alreadyHasPrimary });
}

/** Rejette un brouillon (ou retire un visuel approuvé de la circulation) : action humaine explicite, jamais automatique. */
export function rejectVisualAsset(id: string): VisualAsset {
  return updateAsset(id, { status: "rejected", isPrimary: false });
}

/**
 * Définit un visuel déjà approuvé comme principal, en retirant ce statut à
 * l'ancien principal du même sujet — celui-ci reste `approved`, jamais
 * rejeté ni supprimé (simple changement d'affichage, action humaine).
 */
export function setPrimaryVisualAsset(id: string): VisualAsset {
  const asset = getVisualAssetById(id);
  if (!asset) throw new VisualAssetActionError("Visuel introuvable.");
  if (asset.status !== "approved") {
    throw new VisualAssetActionError("Seul un visuel approuvé peut devenir principal.");
  }
  const previousPrimary = getPrimaryVisualAsset(asset.subjectType, asset.subjectId);
  store = store.map((candidate) => {
    if (previousPrimary && candidate.id === previousPrimary.id) return { ...candidate, isPrimary: false };
    if (candidate.id === id) return { ...candidate, isPrimary: true };
    return candidate;
  });
  return getVisualAssetById(id)!;
}
