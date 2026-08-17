import type { ImageGenerationProvider } from "@/lib/visuals/provider";
import { demoImageProvider } from "./demo-provider";
import { createOpenAiImageProvider, type ImageQuality } from "./openai-provider";

/**
 * Point unique de sélection du fournisseur actif (E1). `getVisualsProvider()`
 * reste volontairement figé sur `demoImageProvider` : c'est le chemin
 * consommé par la galerie `/visuels` existante (E3), qui n'a pas encore de
 * passerelle coût par appel — il ne doit jamais basculer seul vers un
 * fournisseur payant tant qu'aucune interface de confirmation explicite
 * n'est branchée dessus.
 *
 * L'adaptateur réel OpenAI (F-IA2, `openai-provider.ts`) est enregistré ici
 * derrière le même port (`ImageGenerationProvider`) via `getRealVisualsProvider`,
 * consommé uniquement par `real-generation.ts` (action serveur explicite,
 * jamais un rendu de page). Sans clé configurée, il retourne `null` et
 * l'appelant se replie proprement sur le mode démonstration.
 */
export function getVisualsProvider(): ImageGenerationProvider {
  return demoImageProvider;
}

/** Adaptateur réel (F-IA2) ou `null` si `OPENAI_API_KEY` est absente — jamais d'erreur bloquante. */
export function getRealVisualsProvider(quality: ImageQuality = "draft"): ImageGenerationProvider | null {
  return createOpenAiImageProvider(quality);
}
