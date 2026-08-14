import type { ImageGenerationProvider } from "@/lib/visuals/provider";
import { demoImageProvider } from "./demo-provider";

/**
 * Point unique de sélection du fournisseur actif (E1). Mode démonstration
 * obligatoire tant qu'aucun adaptateur réel n'est branché : ce lot
 * n'implémente que `demoImageProvider`, donc aucun appel payant n'est
 * structurellement possible ici, même par erreur. Un futur adaptateur réel
 * (OpenAI Images) se brancherait uniquement à cet endroit, derrière le même
 * port (`ImageGenerationProvider`), sans toucher au code métier consommateur.
 */
export function getVisualsProvider(): ImageGenerationProvider {
  return demoImageProvider;
}
