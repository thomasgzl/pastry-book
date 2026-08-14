/**
 * Logique pure du modèle d'import (D2) — dérivation de quantité, détection
 * de doublon, génération de slug. Aucun effet de bord, testée unitairement.
 * Réutilise `normalizeText` (déjà validé par la recherche globale C9) plutôt
 * que de réimplémenter une normalisation de texte.
 */

import { normalizeText } from "@/lib/recipes/search";
import type { VerificationStatus } from "@/lib/domain/schemas";
import { TITLE_PLACEHOLDER } from "@/lib/import/schema";

const CLEAN_DECIMAL_PATTERN = /^\d+([.,]\d+)?$/;

export interface DerivedQuantity {
  quantityDecimal: string | null;
  verificationStatus: VerificationStatus;
}

/**
 * Dérive `quantityDecimal` + `verificationStatus` à partir du texte de
 * quantité tel que saisi/extrait — ne calcule et n'invente jamais une valeur
 * (CLAUDE.md, principe 3) :
 * - absent/blanc → `null` + `needs_review` (illisible ou non renseigné) ;
 * - `QS` (insensible à la casse/aux espaces) → `null` + `proposed` — valeur
 *   valide en soi, jamais convertie en nombre ;
 * - nombre entier/décimal propre (point OU virgule) → converti (point) +
 *   `confirmed` ;
 * - toute autre forme (fraction, texte libre…) → `null` + `proposed` :
 *   présent mais pas calculable de façon fiable, à confirmer par une
 *   personne, jamais deviné.
 */
export function deriveQuantity(originalQuantityText: string | null): DerivedQuantity {
  const trimmed = originalQuantityText?.trim() ?? "";
  if (!trimmed) {
    return { quantityDecimal: null, verificationStatus: "needs_review" };
  }
  if (trimmed.toUpperCase() === "QS") {
    return { quantityDecimal: null, verificationStatus: "proposed" };
  }
  if (CLEAN_DECIMAL_PATTERN.test(trimmed)) {
    return { quantityDecimal: trimmed.replace(",", "."), verificationStatus: "confirmed" };
  }
  return { quantityDecimal: null, verificationStatus: "proposed" };
}

/** Vrai si le titre du brouillon est encore le placeholder « À vérifier » (jamais un titre inventé à sa place). */
export function isTitleNeedsReview(title: string): boolean {
  return title.trim() === TITLE_PLACEHOLDER;
}

/** Slug lisible dérivé d'un titre — réutilise `normalizeText` (accents/casse) plutôt qu'une nouvelle normalisation. */
export function slugify(title: string): string {
  const slug = normalizeText(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || "recette";
}

export interface DuplicateCheckable {
  title: string;
  sourceId: string;
}

/**
 * Détection de doublon (D2) : même titre (comparaison normalisée,
 * accents/casse ignorés) ET même entreprise/source. Ne bloque jamais
 * silencieusement — signale seulement un candidat, l'appelant décide
 * d'exiger une confirmation explicite avant d'enregistrer quand même.
 */
export function findDuplicateRecipe<T extends DuplicateCheckable>(
  title: string,
  sourceId: string,
  existingRecipes: readonly T[],
): T | null {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle) return null;
  return (
    existingRecipes.find(
      (recipe) => recipe.sourceId === sourceId && normalizeText(recipe.title) === normalizedTitle,
    ) ?? null
  );
}
