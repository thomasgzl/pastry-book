import type { Result } from "@/lib/domain/errors";
import { ok, err } from "@/lib/domain/errors";
import { beginAiRequest, completeAiRequest } from "@/lib/domain/aiCostGuard";
import type { VisualAsset } from "@/lib/domain/schemas";
import { buildVisualPrompt, getSubjectFraming, VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import type { RecipeVisualMode, VisualSubjectKind } from "@/lib/visuals/preset";
import { createDraftVisualAsset, getPrimaryVisualAsset } from "@/lib/visuals/storage";
import type { ImageQuality } from "./openai-provider";
import { getRealVisualsProvider } from "./registry";

/**
 * Point d'entrée serveur UNIQUE pour un appel réel payant (F-IA2). N'est
 * jamais appelé depuis un rendu de page — seulement depuis une action
 * serveur explicite, déclenchée par une confirmation humaine (le contenu
 * exact à afficher avant l'appel vient de `describeRealImageGenerationRequest`,
 * `openai-provider.ts`). Une génération = un sujet, jamais de lot réel.
 */
export interface RealVisualGenerationInput {
  subjectType: VisualSubjectKind;
  subjectId: string;
  subjectLabel: string;
  sourcePhotoUrl?: string | null;
  categorySlug?: string;
  recipeMode?: RecipeVisualMode;
  /** Identifiant d'idempotence (ex. nonce de formulaire) — protège contre le double-clic. Défaut stable par sujet+qualité. */
  requestId?: string;
  /** `"final"` uniquement sur demande explicite de l'appelant, jamais par défaut. */
  quality?: ImageQuality;
}

/** Délai minimal entre deux appels réels du même niveau de qualité — évite l'emballement de coût. */
const MIN_DELAY_MS = 3_000;

export async function generateRealVisualDraft(
  input: RealVisualGenerationInput,
): Promise<Result<VisualAsset>> {
  const quality: ImageQuality = input.quality ?? "draft";

  const provider = getRealVisualsProvider(quality);
  if (!provider) {
    return err("provider_unavailable", "Aucune clé OpenAI configurée : utiliser le mode démonstration.");
  }

  // Ne jamais écraser/remplacer un visuel déjà approuvé/principal : refus explicite,
  // pas de nouvel asset créé. Régénérer pour ce sujet passe par le flux démo
  // (`generateVisualDraft`, service.ts) qui crée un brouillon à côté sans jamais
  // toucher l'approuvé.
  const alreadyApproved = getPrimaryVisualAsset(input.subjectType, input.subjectId);
  if (alreadyApproved) {
    return err(
      "conflict",
      "Un visuel approuvé existe déjà pour ce sujet : aucun appel réel n'est déclenché, créez un nouveau brouillon via le flux habituel plutôt que de le remplacer.",
    );
  }

  const requestId = input.requestId ?? `${input.subjectType}:${input.subjectId}:${quality}`;
  const operationType = quality === "final" ? "illustration-finale" : "illustration-brouillon";
  const guard = beginAiRequest(requestId, operationType, { minDelayMs: MIN_DELAY_MS });
  if (!guard.ok) return guard;

  try {
    const prompt = buildVisualPrompt({
      kind: input.subjectType,
      subjectLabel: input.subjectLabel,
      categorySlug: input.categorySlug,
      recipeMode: input.recipeMode,
    });
    const framing = getSubjectFraming(input.subjectType);
    const generated = await provider.generate({ prompt, ratio: framing.ratio, background: framing.background });

    const asset = createDraftVisualAsset({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      imageUrl: generated.imageUrl,
      sourcePhotoUrl: input.sourcePhotoUrl ?? null,
      prompt,
      presetVersion: VISUAL_PRESET_VERSION,
    });
    return ok(asset);
  } catch (cause) {
    // Message générique : jamais la clé, jamais le corps brut de la réponse fournisseur.
    return err("unknown", "Échec de la génération réelle — voir journal serveur.", cause);
  } finally {
    completeAiRequest(requestId);
  }
}
