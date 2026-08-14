import type {
  GeneratedImage,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "@/lib/visuals/provider";

/**
 * Adaptateur réel OpenAI Images (tâche F-IA2). Implémente le même port que
 * `demo-provider.ts` (`ImageGenerationProvider`) — le code métier ne connaît
 * jamais le SDK/l'API OpenAI directement, seulement ce port. Appelé
 * UNIQUEMENT depuis `real-generation.ts` (action serveur explicite), jamais
 * depuis un rendu de page.
 *
 * Génération simple : un sujet, une image, un appel `fetch` serveur. Pas de
 * batch API — le port lui-même (`ImageGenerationRequest`) ne transporte
 * qu'un seul prompt, donc plusieurs sujets par appel réel sont
 * structurellement impossibles ici (le mode démo peut simuler un lot, pas
 * cet adaptateur).
 */

/** Modèle par défaut, lu une seule fois ici — voir `.env.example`. */
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";

export const OPENAI_PROVIDER_NAME = "OpenAI Images";

export type ImageQuality = "draft" | "final";

const QUALITY_PARAM: Record<ImageQuality, string> = {
  draft: "low",
  final: "high",
};

/**
 * Tailles fixes supportées par l'API Images — aucun ratio exact 4:3/16:9
 * disponible, on prend l'approximation la plus proche plutôt que d'inventer
 * une taille non supportée.
 * ponytail: mapping approximatif à 3 tailles fixes, à affiner si l'API
 * propose un jour des ratios personnalisés.
 */
export const SIZE_BY_RATIO: Record<ImageGenerationRequest["ratio"], string> = {
  "1:1": "1024x1024",
  "4:3": "1536x1024",
  "16:9": "1536x1024",
};

/** Aucune estimation vérifiée disponible : jamais inventer un prix (CLAUDE.md). */
export const OPENAI_COST_PER_IMAGE_ESTIMATE_EUR: number | null = null;

/** Décrit la demande (fournisseur, modèle, nombre d'images, qualité) SANS l'exécuter — à afficher avant tout appel réel. */
export interface RealImageGenerationDescription {
  providerName: string;
  model: string;
  imageCount: 1;
  quality: ImageQuality;
  costPerImageEstimateEur: number | null;
}

export function describeRealImageGenerationRequest(
  quality: ImageQuality = "draft",
): RealImageGenerationDescription {
  return {
    providerName: OPENAI_PROVIDER_NAME,
    model: OPENAI_IMAGE_MODEL,
    imageCount: 1,
    quality,
    costPerImageEstimateEur: OPENAI_COST_PER_IMAGE_ESTIMATE_EUR,
  };
}

/** `true` seulement si une clé est configurée côté serveur — jamais vérifiable côté client. */
export function isOpenAiImageProviderConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

interface OpenAiImagesResponse {
  data?: Array<{ b64_json?: string }>;
}

interface OpenAiErrorBody {
  error?: { message?: string; type?: string; code?: string | null };
}

/** Catégories distinguées pour l'utilisatrice (correction lot G, diagnostic pilote Citron) — jamais un simple « 500 » générique. */
export type ImageGenerationErrorCategory =
  | "invalid_key"
  | "insufficient_quota"
  | "model_access"
  | "invalid_parameter"
  | "decode_error"
  | "transient";

const CATEGORY_MESSAGE: Record<ImageGenerationErrorCategory, string> = {
  invalid_key: "Clé OpenAI refusée.",
  insufficient_quota: "Crédit API insuffisant.",
  model_access: "Modèle non accessible pour ce projet.",
  invalid_parameter: "Paramètre de génération invalide.",
  decode_error: "Image générée mais impossible à enregistrer.",
  transient: "Service temporairement indisponible.",
};

/** Porte le statut HTTP réel et l'identifiant de requête OpenAI (jamais le corps brut, jamais la clé) — pour un diagnostic exact au prochain incident sans deviner. */
export class RealImageGenerationError extends Error {
  constructor(
    public readonly category: ImageGenerationErrorCategory,
    public readonly status: number | null,
    public readonly providerRequestId: string | null,
  ) {
    super(CATEGORY_MESSAGE[category]);
    this.name = "RealImageGenerationError";
  }
}

function classifyHttpError(status: number, body: OpenAiErrorBody | null): ImageGenerationErrorCategory {
  if (status === 401) return "invalid_key";
  // 403 = accès/vérification d'organisation requise pour certains modèles (ex. famille gpt-image) — jamais confondu avec une clé invalide.
  if (status === 403) return "model_access";
  if (status === 429) {
    const code = body?.error?.code ?? "";
    return code.includes("quota") ? "insufficient_quota" : "transient";
  }
  if (status === 400) return "invalid_parameter";
  return "transient";
}

async function readErrorBodySafely(response: Response): Promise<OpenAiErrorBody | null> {
  try {
    return (await response.json()) as OpenAiErrorBody;
  } catch {
    return null;
  }
}

/**
 * Journal serveur uniquement (jamais renvoyé au navigateur) — statut, type/
 * code/message d'erreur OpenAI, request ID. JAMAIS la clé, JAMAIS les
 * en-têtes d'autorisation, JAMAIS une image encodée en base64.
 */
function logImageGenerationFailure(status: number | null, requestId: string | null, body: OpenAiErrorBody | null, cause?: unknown): void {
  const detail = body?.error
    ? `type=${body.error.type ?? "?"} code=${body.error.code ?? "?"} message=${body.error.message ?? "?"}`
    : cause instanceof Error
      ? cause.message
      : "corps de réponse indisponible";
  console.error(`[visuals:openai] Échec génération image — statut=${status ?? "aucune réponse (réseau)"} requestId=${requestId ?? "absent"} ${detail}`);
}

/**
 * Construit l'adaptateur réel, lié à un niveau de qualité fixé à la
 * création (le port `generate()` ne transporte pas de paramètre de
 * qualité). Retourne `null` si aucune clé n'est configurée : l'appelant
 * (registry) doit alors se replier sur `demoImageProvider`, sans erreur
 * bloquante.
 */
export function createOpenAiImageProvider(
  quality: ImageQuality = "draft",
): ImageGenerationProvider | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    name: OPENAI_PROVIDER_NAME,
    model: OPENAI_IMAGE_MODEL,
    costPerImageEstimateEur: OPENAI_COST_PER_IMAGE_ESTIMATE_EUR,
    async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_IMAGE_MODEL,
          prompt: request.prompt,
          n: 1,
          size: SIZE_BY_RATIO[request.ratio],
          quality: QUALITY_PARAM[quality],
          // `gpt-image-2` ne supporte pas les fonds transparents (confirmé par l'API :
          // "Transparent background is not supported for this model.", statut 400,
          // type image_generation_user_error/invalid_value) — jamais envoyé, quel que
          // soit `request.background` demandé par l'appelant. Le fond ivoire uniforme
          // doit être obtenu par le prompt (voir `visuels/pilote/prompt.ts`), pas par ce paramètre.
          background: "opaque",
        }),
      });

      const providerRequestId = response.headers?.get?.("x-request-id") ?? null;

      if (!response.ok) {
        const body = await readErrorBodySafely(response);
        logImageGenerationFailure(response.status, providerRequestId, body);
        throw new RealImageGenerationError(classifyHttpError(response.status, body), response.status, providerRequestId);
      }

      let payload: OpenAiImagesResponse;
      try {
        payload = (await response.json()) as OpenAiImagesResponse;
      } catch (cause) {
        logImageGenerationFailure(response.status, providerRequestId, null, cause);
        throw new RealImageGenerationError("decode_error", response.status, providerRequestId);
      }

      const b64 = payload.data?.[0]?.b64_json;
      if (!b64) {
        logImageGenerationFailure(response.status, providerRequestId, null);
        throw new RealImageGenerationError("decode_error", response.status, providerRequestId);
      }

      return {
        imageUrl: `data:image/png;base64,${b64}`,
        providerName: OPENAI_PROVIDER_NAME,
        model: OPENAI_IMAGE_MODEL,
      };
    },
  };
}
