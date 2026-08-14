/**
 * Point unique de sélection du fournisseur d'extraction actif (F-IA1),
 * miroir de `src/lib/ai/visuals/registry.ts`. Sans `OPENAI_API_KEY`
 * configurée côté serveur, bascule automatiquement et silencieusement sur
 * l'adaptateur de démonstration existant — jamais d'erreur bloquante pour
 * l'utilisatrice (CLAUDE.md, mode démonstration obligatoire). Le code
 * appelant (`/importer`) ne doit connaître que cette fonction, jamais les
 * adaptateurs directement.
 */

import type { ImportAIProvider } from "./types";
import { demoImportProvider } from "./demoProvider";
import { openaiImportProvider } from "./openaiProvider";

export function getImportAIProvider(): ImportAIProvider {
  return process.env.OPENAI_API_KEY?.trim() ? openaiImportProvider : demoImportProvider;
}
