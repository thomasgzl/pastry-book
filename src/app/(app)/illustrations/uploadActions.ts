"use server";

/**
 * Import manuel d'une illustration (pas de génération IA) — un seul point
 * d'entrée pour les deux écrans qui proposent une illustration (`/illustrations`
 * et `/illustrations/manquantes`, `UploadVisualForm`). Toujours un brouillon
 * (`persistUploadedVisual`, storage.ts) : jamais approuvé automatiquement,
 * même garde que la génération IA (CLAUDE.md, principe 8, cas ambigu ->
 * validation humaine — ici la personne vient de choisir le fichier elle-même,
 * mais la publication reste un geste distinct).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { visualAssetSchema } from "@/lib/domain/schemas";
import { resolveVisualAssetDisplayUrls } from "@/lib/visuals/approvedVisual";
import {
  persistUploadedVisual,
  VisualAssetPersistenceError,
  VisualGenerationValidationError,
} from "@/lib/visuals/storage";
import { getVisualSubject } from "@/lib/visuals/subjects";

const targetSchema = z.object({
  subjectType: visualAssetSchema.shape.subjectType,
  subjectId: z.uuid(),
});

/** Même limite que le bucket `visual-assets` (`20260814090300_storage_buckets.sql`) — refusé plus tôt côté application, message plus clair qu'une erreur Storage brute. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface UploadVisualState {
  error: string | null;
  success: { assetId: string; imageUrl: string } | null;
}

function revalidateAll(subjectType: string, slug: string): void {
  revalidatePath("/illustrations");
  revalidatePath("/illustrations/manquantes");
  if (subjectType !== "ingredient") return;
  revalidatePath("/matieres-premieres");
  revalidatePath(`/matieres-premieres/${slug}`);
}

export async function uploadVisualAction(
  _previous: UploadVisualState,
  formData: FormData,
): Promise<UploadVisualState> {
  const parsed = targetSchema.safeParse({
    subjectType: formData.get("subjectType"),
    subjectId: formData.get("subjectId"),
  });
  if (!parsed.success) return { error: "Sujet invalide.", success: null };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier image (PNG, JPEG ou WebP).", success: null };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Fichier trop volumineux (10 Mo maximum).", success: null };
  }

  const subject = await getVisualSubject(parsed.data.subjectType, parsed.data.subjectId);
  if (!subject) return { error: "Sujet introuvable.", success: null };

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const asset = await persistUploadedVisual({
      subjectType: parsed.data.subjectType,
      subjectId: parsed.data.subjectId,
      mimeType: file.type,
      bytes,
    });
    const displayUrlByPath = await resolveVisualAssetDisplayUrls([asset.imageUrl]);
    revalidateAll(parsed.data.subjectType, subject.slug);
    return {
      error: null,
      success: { assetId: asset.id, imageUrl: displayUrlByPath.get(asset.imageUrl) ?? asset.imageUrl },
    };
  } catch (cause) {
    if (cause instanceof VisualGenerationValidationError || cause instanceof VisualAssetPersistenceError) {
      return { error: cause.message, success: null };
    }
    throw cause;
  }
}
