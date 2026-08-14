/**
 * Coefficient multiplicateur (C6) — logique pure, sans effet de bord.
 * Coefficient non destructif (CLAUDE.md, principe 5) : ne modifie jamais la
 * quantité enregistrée (`quantityDecimal`, `originalQuantityText`), calcule
 * uniquement un texte d'affichage dérivé.
 *
 * Choix technique — arithmétique flottante standard : `quantityDecimal` est
 * stocké en chaîne pour interdire le `float` binaire en STOCKAGE (voir
 * `src/lib/domain/schemas.ts`). Le calcul d'AFFICHAGE ici (une simple
 * multiplication suivie d'un arrondi à 2 décimales) reste néanmoins fait
 * avec `Number` : une bibliothèque décimale dédiée n'est pas un choix
 * technique déjà validé pour ce projet et serait disproportionnée pour
 * recalculer l'affichage d'une recette. `toFixed(2)` absorbe les artefacts
 * classiques de la virgule flottante (type `0.1 + 0.2`) avant tout
 * formatage : le résultat affiché est toujours propre.
 */

import type { VerificationStatus } from "@/lib/domain/schemas";

/** Coefficients prédéfinis exposés par `CoefficientControl`. */
export const PRESET_COEFFICIENTS = [0.5, 1, 1.5, 2] as const;

/** Un coefficient n'est valide que strictement positif, fini, non `NaN`. */
export function isValidCoefficient(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** Arrondit à 2 décimales, supprime les zéros superflus, et utilise la
 * virgule décimale (convention déjà utilisée par les textes source, ex.
 * « 62,5 ») plutôt que le point. */
function formatQuantity(value: number): string {
  const fixed = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return fixed.replace(".", ",");
}

/**
 * Multiplie une quantité décimale stockée (chaîne) par le coefficient
 * d'affichage. Retourne `null` — jamais une valeur inventée — si la
 * quantité source est absente (`QS`, illisible…) ou si le coefficient n'est
 * pas valide (`isValidCoefficient`).
 */
export function applyCoefficient(quantityDecimal: string | null, coefficient: number): string | null {
  if (quantityDecimal === null || !isValidCoefficient(coefficient)) return null;
  return formatQuantity(Number(quantityDecimal) * coefficient);
}

/**
 * Quantité d'origine (texte + unité), telle qu'importée, jamais recalculée
 * (CLAUDE.md, principe 4 : source intacte). `null` si aucune quantité
 * d'origine n'a été extraite.
 */
export function formatOriginalQuantity(originalQuantityText: string | null, unit: string | null): string | null {
  if (!originalQuantityText) return null;
  return unit ? `${originalQuantityText} ${unit}` : originalQuantityText;
}

export interface IngredientQuantityInput {
  quantityDecimal: string | null;
  originalQuantityText: string | null;
  unit: string | null;
  verificationStatus: VerificationStatus;
}

export interface IngredientQuantityDisplay {
  /** Quantité mise en avant. Reprend le texte d'origine (`QS`…) ou
   * `À vérifier` quand aucun calcul fiable n'est possible, sinon la
   * quantité recalculée avec son unité — jamais une valeur inventée. */
  primary: string;
  /** Quantité d'origine (texte + unité) à afficher en ton secondaire à côté
   * de `primary`. `null` quand elle serait une pure répétition de
   * `primary` (ex. `QS` affiché une seule fois). */
  original: string | null;
}

/**
 * Résout l'affichage complet d'une quantité d'ingrédient pour un coefficient
 * donné :
 * - `verificationStatus === "needs_review"` → `primary = "À vérifier"`,
 *   quel que soit `quantityDecimal` (jamais présenté comme un calcul fiable) ;
 * - `quantityDecimal === null` (QS/PM/illisible) → jamais recalculé,
 *   `primary` reprend le texte d'origine tel quel (ou `"À vérifier"` si même
 *   le texte d'origine est absent) ;
 * - sinon → `primary` = quantité recalculée (unité comprise).
 */
export function getIngredientQuantityDisplay(
  ingredient: IngredientQuantityInput,
  coefficient: number,
): IngredientQuantityDisplay {
  const original = formatOriginalQuantity(ingredient.originalQuantityText, ingredient.unit);

  if (ingredient.verificationStatus === "needs_review") {
    return { primary: "À vérifier", original };
  }

  const computed = applyCoefficient(ingredient.quantityDecimal, coefficient);
  if (computed === null) {
    return { primary: original ?? "À vérifier", original: null };
  }

  const primary = ingredient.unit ? `${computed} ${ingredient.unit}` : computed;
  return { primary, original: original === primary ? null : original };
}
