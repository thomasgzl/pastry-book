/**
 * Résolution SERVEUR des 7 sujets du lot H (id réel + statut d'approbation
 * actuel) — importe `@/lib/visuals/storage` (dépend de `next/headers`),
 * donc jamais importé depuis un Client Component. Les types/constantes
 * client-safe vivent dans `subjectTypes.ts` (réutilisés ici par ré-export).
 */

import { getCanonicalIngredientBySlug } from "@/lib/data/canonical-ingredients";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getRecipeBySlug } from "@/lib/data/recipes";
import { getSourceBySlug } from "@/lib/data/sources";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { assemblePrompt, GROUP_TO_KIND, SUBJECT_DEFS, type LotHSubject } from "./subjectTypes";

export type { LotHGroup, LotHSubject } from "./subjectTypes";
export { LOT_H_GROUP_LABELS } from "./subjectTypes";

/**
 * Résout dynamiquement les 7 sujets (id réel + statut d'approbation actuel)
 * — appelée à l'affichage de la confirmation ET à nouveau juste avant
 * chaque appel réel (défense en profondeur contre une approbation
 * survenue entre-temps). Un sujet introuvable dans le référentiel est omis
 * (jamais un identifiant inventé).
 */
export async function resolveLotHSubjects(): Promise<LotHSubject[]> {
  const hennessy = getSourceBySlug("hennessy");
  const results: LotHSubject[] = [];

  for (const def of SUBJECT_DEFS) {
    let subjectId: string | null = null;
    let label = "";

    if (def.key === "tarte-au-citron") {
      const recipe = getRecipeBySlug("tarte-au-citron-hennessy");
      if (recipe) {
        subjectId = recipe.id;
        label = recipe.title;
      }
    } else if (def.key === "ambiance-hennessy") {
      if (hennessy) {
        subjectId = hennessy.id;
        label = hennessy.name;
      }
    } else if (def.key === "recettes-de-base") {
      const category = hennessy ? getCategoryBySlug(hennessy.id, "recettes-de-base") : undefined;
      if (category) {
        subjectId = category.id;
        label = category.name;
      }
    } else {
      const ingredient = getCanonicalIngredientBySlug(def.key);
      if (ingredient) {
        subjectId = ingredient.id;
        label = ingredient.name;
      }
    }

    if (!subjectId) continue; // sujet introuvable dans le référentiel — jamais inventé, simplement omis.

    const kind = GROUP_TO_KIND[def.group];
    results.push({
      key: def.key,
      group: def.group,
      kind,
      subjectId,
      label,
      contextLabel: def.contextLabel,
      prompt: assemblePrompt(def),
      alreadyApproved: Boolean(await getPrimaryVisualAsset(kind, subjectId)),
    });
  }

  return results;
}
