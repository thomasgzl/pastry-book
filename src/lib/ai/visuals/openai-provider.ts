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
const SIZE_BY_RATIO: Record<ImageGenerationRequest["ratio"], string> = {
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
          background: request.background === "transparent" ? "transparent" : "opaque",
        }),
      });

      if (!response.ok) {
        // Jamais la clé ni les en-têtes dans le message d'erreur — statut seul.
        throw new Error(`Échec de la génération OpenAI Images (statut ${response.status}).`);
      }

      const payload = (await response.json()) as OpenAiImagesResponse;
      const b64 = payload.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error("Réponse OpenAI Images invalide : aucune image reçue.");
      }

      return {
        imageUrl: `data:image/png;base64,${b64}`,
        providerName: OPENAI_PROVIDER_NAME,
        model: OPENAI_IMAGE_MODEL,
      };
    },
  };
}
