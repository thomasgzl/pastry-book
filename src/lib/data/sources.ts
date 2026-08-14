/**
 * Couche de lecture — entreprises/sources. Mode démo uniquement pour
 * l'instant : lit `src/lib/demo/data.ts`. Une vraie requête Supabase
 * (`src/lib/supabase/server.ts`) remplacera ces lectures démo plus tard
 * (bascule non construite ici — décision C2-C9, voir rapport de livraison).
 */

import { recipes, sources } from "@/lib/demo/data";
import type { Source } from "@/lib/domain/schemas";

export function getSources(): Source[] {
  return sources;
}

export function getSourceBySlug(slug: string): Source | undefined {
  return sources.find((source) => source.slug === slug);
}

/** Nombre de recettes rattachées à une source — toujours calculé, jamais codé en dur. */
export function getRecipeCountForSource(sourceId: string): number {
  return recipes.filter((recipe) => recipe.sourceId === sourceId).length;
}
