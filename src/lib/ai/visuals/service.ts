import type { VisualAsset } from "@/lib/domain/schemas";
import { buildVisualPrompt, getSubjectFraming, VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import type { RecipeVisualMode, VisualSubjectKind } from "@/lib/visuals/preset";
import { persistGeneratedVisual, getVisualAssetById } from "@/lib/visuals/storage";
import { getVisualsProvider } from "./registry";

export interface GenerateVisualInput {
  subjectType: VisualSubjectKind;
  subjectId: string;
  subjectLabel: string;
  sourcePhotoUrl?: string | null;
  categorySlug?: string;
  recipeMode?: RecipeVisualMode;
  /** Recette uniquement (K6/K7) : mêmes champs que `VisualSubject`, transmis tels quels à `buildVisualPrompt` — jamais recalculés ici, pour que le prompt affiché en confirmation (K9) et le prompt réellement utilisé soient identiques. */
  preparationNames?: string[];
  validatedKeyIngredientNames?: string[];
  additionalInformation?: string | null;
}

/**
 * Génère un brouillon pour un sujet : construit le prompt à partir du preset
 * (E2), appelle le fournisseur actif (E1, démonstration dans ce lot) et
 * persiste le résultat. Crée toujours une nouvelle ligne — ne touche jamais
 * un visuel existant, même approuvé (voir `storage.test.ts`).
 */
export async function generateVisualDraft(input: GenerateVisualInput): Promise<VisualAsset> {
  const provider = getVisualsProvider();
  const prompt = buildVisualPrompt({
    kind: input.subjectType,
    subjectLabel: input.subjectLabel,
    categorySlug: input.categorySlug,
    recipeMode: input.recipeMode,
    preparationNames: input.preparationNames,
    validatedKeyIngredientNames: input.validatedKeyIngredientNames,
    additionalInformation: input.additionalInformation,
  });
  const framing = getSubjectFraming(input.subjectType);
  const generated = await provider.generate({ prompt, ratio: framing.ratio, background: framing.background });

  // Persistance (K10) : valide le fichier reçu, le stocke immédiatement si le
  // format le permet, enregistre les métadonnées, statut `draft` — mécanisme
  // partagé avec `real-generation.ts`, voir `persistGeneratedVisual`.
  return await persistGeneratedVisual({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    generatedImageUrl: generated.imageUrl,
    sourcePhotoUrl: input.sourcePhotoUrl ?? null,
    prompt,
    presetVersion: VISUAL_PRESET_VERSION,
  });
}

/**
 * Régénère à partir d'un asset existant (brouillon, approuvé ou rejeté) :
 * relit son sujet et crée un nouveau brouillon à côté. L'asset d'origine
 * n'est jamais modifié (« Régénérer » ne remplace rien).
 */
export async function regenerateVisualDraft(
  existingAssetId: string,
  subjectLabel: string,
  extra?: { categorySlug?: string; recipeMode?: RecipeVisualMode },
): Promise<VisualAsset> {
  const existing = await getVisualAssetById(existingAssetId);
  if (!existing) throw new Error("Visuel introuvable.");
  return generateVisualDraft({
    subjectType: existing.subjectType,
    subjectId: existing.subjectId,
    subjectLabel,
    sourcePhotoUrl: existing.sourcePhotoUrl,
    ...extra,
  });
}
