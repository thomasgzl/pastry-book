import type { VisualBackground, VisualRatio } from "./preset";

export interface ImageGenerationRequest {
  /** Prompt final exact (déjà construit par `buildVisualPrompt`, preset E2). */
  prompt: string;
  ratio: VisualRatio;
  background: VisualBackground;
}

export interface GeneratedImage {
  /** URL ou data URI de l'image générée. */
  imageUrl: string;
  providerName: string;
  model: string;
}

/**
 * Port indépendant du fournisseur (tâche E1) : le code métier n'appelle
 * jamais le SDK d'un fournisseur directement, seulement cette interface.
 * OpenAI Images est le premier fournisseur réel visé (`docs/09-AI_VISUALS.md`)
 * mais aucun adaptateur réel n'est implémenté dans ce lot — voir
 * `src/lib/ai/visuals/demo-provider.ts`, seul adaptateur existant, et
 * `src/lib/ai/visuals/registry.ts` pour le point unique de sélection.
 */
export interface ImageGenerationProvider {
  readonly name: string;
  readonly model: string;
  /** Estimation en euros par image, `null` si aucune estimation disponible. */
  readonly costPerImageEstimateEur: number | null;
  generate(request: ImageGenerationRequest): Promise<GeneratedImage>;
}
