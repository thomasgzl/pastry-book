import type { VisualSubjectKind } from "./preset";

/**
 * Libellés d'affichage des quatre types de sujet illustrables. Fichier
 * séparé de `subjects.ts` volontairement : `subjects.ts` importe
 * `src/lib/data/*` (chaîne serveur uniquement, `next/headers` via Supabase)
 * et ne doit donc jamais être importé depuis un Client Component — ces
 * libellés, eux, sont de la donnée pure et doivent rester utilisables des
 * deux côtés (ex. `IllustrationsBrowser.tsx`, K5).
 */
export const VISUAL_KIND_LABELS: Record<VisualSubjectKind, string> = {
  ingredient: "Matières premières",
  recipe: "Recettes",
  source: "Entreprises",
  sourceCategory: "Catégories d'entreprise",
};
