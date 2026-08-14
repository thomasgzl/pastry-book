import type { Result } from "@/lib/domain/errors";
import { ok, err } from "@/lib/domain/errors";
import { beginAiRequest, completeAiRequest } from "@/lib/domain/aiCostGuard";
import type { VisualAsset } from "@/lib/domain/schemas";
import { buildVisualPrompt, getSubjectFraming, VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import type { RecipeVisualMode, VisualBackground, VisualRatio, VisualSubjectKind } from "@/lib/visuals/preset";
import { createDraftVisualAsset, getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { RealImageGenerationError, type ImageQuality } from "./openai-provider";
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
  /** Prompt final déjà construit par l'appelant (ex. pilote G3, brief créatif ponctuel) — remplace `buildVisualPrompt`, jamais combiné avec lui. `undefined` par défaut : comportement inchangé pour tous les appelants existants. */
  promptOverride?: string;
  /**
   * `true` UNIQUEMENT quand l'appelant vient d'un parcours de versionnement
   * explicite (« Créer un nouveau brouillon » / « Générer un nouveau
   * brouillon ») — lève le refus ci-dessous pour créer un brouillon
   * supplémentaire À CÔTÉ du principal existant. Ne change rien à la garde
   * elle-même : `createDraftVisualAsset` ne modifie et n'écrase jamais
   * l'approuvé (voir `storage.ts`), donc ce drapeau ne rend rien moins sûr —
   * il ne fait que distinguer un clic accidentel d'une nouvelle version
   * explicitement demandée. `undefined`/`false` par défaut : comportement
   * inchangé pour tous les appelants existants.
   */
  allowAdditionalVersion?: boolean;
  /** Format forcé par l'appelant (ex. lot H, carré 1:1 uniforme pour tous les sujets quel que soit leur type) — remplace `getSubjectFraming(subjectType).ratio`. `undefined` par défaut : comportement inchangé. */
  ratioOverride?: VisualRatio;
  /** Fond forcé par l'appelant — remplace `getSubjectFraming(subjectType).background`. `undefined` par défaut : comportement inchangé. Sans effet réel sur l'adaptateur OpenAI (toujours `"opaque"`, gpt-image-2 ne supporte pas la transparence), conservé pour le port générique/le mode démonstration. */
  backgroundOverride?: VisualBackground;
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
  const alreadyApproved = await getPrimaryVisualAsset(input.subjectType, input.subjectId);
  if (alreadyApproved && !input.allowAdditionalVersion) {
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
    const prompt =
      input.promptOverride ??
      buildVisualPrompt({
        kind: input.subjectType,
        subjectLabel: input.subjectLabel,
        categorySlug: input.categorySlug,
        recipeMode: input.recipeMode,
      });
    const framing = getSubjectFraming(input.subjectType);
    const ratio = input.ratioOverride ?? framing.ratio;
    const background = input.backgroundOverride ?? framing.background;
    const generated = await provider.generate({ prompt, ratio, background });

    const asset = await createDraftVisualAsset({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      imageUrl: generated.imageUrl,
      sourcePhotoUrl: input.sourcePhotoUrl ?? null,
      prompt,
      presetVersion: VISUAL_PRESET_VERSION,
    });
    return ok(asset);
  } catch (cause) {
    // Message classifié (correction lot G, diagnostic pilote Citron) si disponible — jamais la clé, jamais le corps brut de la réponse fournisseur, jamais un « 500 » générique quand la cause est connue.
    if (cause instanceof RealImageGenerationError) {
      return err("unknown", cause.message, cause);
    }
    return err("unknown", "Échec de la génération réelle — voir journal serveur.", cause);
  } finally {
    completeAiRequest(requestId);
  }
}
