"use server";

/**
 * Server Actions de la galerie de validation (E3). Seul point d'entrée
 * appelable depuis le navigateur — aucun secret, aucune clé fournisseur ici
 * (le mode démonstration n'en a de toute façon aucune, voir
 * `src/lib/ai/visuals/registry.ts`). Chaque action valide strictement son
 * entrée (Zod, CLAUDE.md) avant d'agir ; une entrée invalide est ignorée
 * silencieusement plutôt que d'inventer un sujet ou un visuel.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { visualAssetSchema } from "@/lib/domain/schemas";
import { generateVisualDraft, regenerateVisualDraft } from "@/lib/ai/visuals/service";
import {
  approveVisualAsset,
  getVisualAssetById,
  hasAnyVisualAsset,
  rejectVisualAsset,
  setPrimaryVisualAsset,
  VisualAssetActionError,
} from "@/lib/visuals/storage";
import { getAllVisualSubjects, getVisualSubject } from "@/lib/visuals/subjects";
import type { VisualAsset } from "@/lib/domain/schemas";
import type { RecipeVisualMode } from "@/lib/visuals/preset";
import { BATCH_CONFIRMATION_PREFIX } from "@/lib/visuals/batch";

const subjectTypeSchema = visualAssetSchema.shape.subjectType;
const generateSchema = z.object({ subjectType: subjectTypeSchema, subjectId: z.uuid() });
const assetIdSchema = z.object({ assetId: z.uuid() });

function readForm<T>(formData: FormData, schema: z.ZodType<T>): T | null {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  return parsed.success ? parsed.data : null;
}

function recipeModeFor(photoUrl: string | null | undefined): RecipeVisualMode {
  return photoUrl ? "photo" : "description";
}

/** Matière première : les pages publiques (`/matieres-premieres`) affichent le visuel PRINCIPAL — jamais un brouillon — donc revalidées à chaque changement de statut/principal (lot G, G3). Aucun effet pour les autres types de sujet (pas encore affichés hors `/visuels`). */
function revalidatePublicPages(asset: VisualAsset): void {
  if (asset.subjectType !== "ingredient") return;
  const subject = getVisualSubject(asset.subjectType, asset.subjectId);
  if (!subject) return;
  revalidatePath("/matieres-premieres");
  revalidatePath(`/matieres-premieres/${subject.slug}`);
}

export async function generateAction(formData: FormData): Promise<void> {
  const input = readForm(formData, generateSchema);
  if (!input) return;
  const subject = getVisualSubject(input.subjectType, input.subjectId);
  if (!subject) return;

  await generateVisualDraft({
    subjectType: subject.type,
    subjectId: subject.id,
    subjectLabel: subject.label,
    sourcePhotoUrl: subject.photoUrl,
    categorySlug: subject.categorySlug,
    recipeMode: subject.type === "recipe" ? recipeModeFor(subject.photoUrl) : undefined,
  });
  revalidatePath("/visuels");
}

export async function regenerateAction(formData: FormData): Promise<void> {
  const input = readForm(formData, assetIdSchema);
  if (!input) return;
  const asset = getVisualAssetById(input.assetId);
  if (!asset) return;
  const subject = getVisualSubject(asset.subjectType, asset.subjectId);

  await regenerateVisualDraft(input.assetId, subject?.label ?? "Sujet", {
    categorySlug: subject?.categorySlug,
    recipeMode: asset.subjectType === "recipe" ? recipeModeFor(asset.sourcePhotoUrl) : undefined,
  });
  revalidatePath("/visuels");
}

export async function approveAction(formData: FormData): Promise<void> {
  const input = readForm(formData, assetIdSchema);
  if (!input) return;
  try {
    revalidatePublicPages(approveVisualAsset(input.assetId));
  } catch (error) {
    if (!(error instanceof VisualAssetActionError)) throw error;
  }
  revalidatePath("/visuels");
}

/**
 * Approuve un brouillon ET le fait basculer principal dans la foulée — pour
 * le parcours de versionnement (lot G, correction G3) où un visuel est déjà
 * approuvé/principal : `approveVisualAsset` seul ne suffit pas dans ce cas
 * (il ne bascule jamais un principal existant, voir sa documentation), donc
 * `setPrimaryVisualAsset` complète la même transaction logique. Bascule
 * atomique déjà garantie par `setPrimaryVisualAsset` (un seul `isPrimary`
 * par sujet) — jamais deux appels séparés déclenchés par l'UI.
 */
export async function approveAsPrimaryAction(formData: FormData): Promise<void> {
  const input = readForm(formData, assetIdSchema);
  if (!input) return;
  try {
    approveVisualAsset(input.assetId);
    revalidatePublicPages(setPrimaryVisualAsset(input.assetId));
  } catch (error) {
    if (!(error instanceof VisualAssetActionError)) throw error;
  }
  revalidatePath("/visuels");
}

export async function rejectAction(formData: FormData): Promise<void> {
  const input = readForm(formData, assetIdSchema);
  if (!input) return;
  try {
    revalidatePublicPages(rejectVisualAsset(input.assetId));
  } catch (error) {
    if (!(error instanceof VisualAssetActionError)) throw error;
  }
  revalidatePath("/visuels");
}

export async function setPrimaryAction(formData: FormData): Promise<void> {
  const input = readForm(formData, assetIdSchema);
  if (!input) return;
  try {
    revalidatePublicPages(setPrimaryVisualAsset(input.assetId));
  } catch (error) {
    if (!(error instanceof VisualAssetActionError)) throw error;
  }
  revalidatePath("/visuels");
}

export interface BatchActionState {
  error: string | null;
  success: string | null;
}

/**
 * Protection explicite contre une génération accidentelle en masse (E3) :
 * toujours une confirmation nommée, jamais un lot silencieux, quel que soit
 * le nombre de visuels manquants (pas de seuil à contourner). Passerelle
 * coût (E4) : le fournisseur/modèle/nombre/coût sont affichés par
 * `BatchGenerateMissing` avant cette action, jamais déclenchés seuls.
 */
export async function generateMissingBatchAction(
  _previous: BatchActionState,
  formData: FormData,
): Promise<BatchActionState> {
  const missing = getAllVisualSubjects().filter((subject) => !hasAnyVisualAsset(subject.type, subject.id));
  if (missing.length === 0) {
    return { error: null, success: "Aucun visuel manquant : rien à générer." };
  }

  const expected = `${BATCH_CONFIRMATION_PREFIX} ${missing.length}`;
  const typedRaw = z.string().safeParse(formData.get("confirmation"));
  const typed = (typedRaw.success ? typedRaw.data : "").trim().toUpperCase();
  if (typed !== expected) {
    return {
      error: `Confirmation invalide. Tapez exactement « ${expected} » pour lancer la génération de ${missing.length} visuel(s) manquant(s).`,
      success: null,
    };
  }

  for (const subject of missing) {
    await generateVisualDraft({
      subjectType: subject.type,
      subjectId: subject.id,
      subjectLabel: subject.label,
      sourcePhotoUrl: subject.photoUrl,
      categorySlug: subject.categorySlug,
      recipeMode: subject.type === "recipe" ? recipeModeFor(subject.photoUrl) : undefined,
    });
  }
  revalidatePath("/visuels");
  return { error: null, success: `${missing.length} brouillon(s) généré(s).` };
}
