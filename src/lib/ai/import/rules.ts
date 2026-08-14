/**
 * Règles déterministes d'allergènes/spécificités/normalisation (D3) —
 * appliquées AVANT tout recours à un modèle pour les cas ambigus
 * (docs/05-AI_IMPORT.md § Allergènes). Logique pure, sans effet de bord.
 *
 * Ne déduit jamais une trace ou une contamination croisée (CLAUDE.md,
 * principe 9) : ne produit que des propositions `proposed` sur la base du
 * texte de la recette elle-même, jamais `confirmed` — seule une action
 * humaine explicite confirme (CLAUDE.md, principe 8).
 */

import { canonicalIngredients } from "@/lib/demo/data";
import { resolveCanonicalIngredientId } from "@/lib/recipes/search";
import type { AllergenProposal, CanonicalIngredientProposal, ExtractedIngredient, SpecificityProposal } from "./types";

const ALLERGEN_RULES: { slug: string; pattern: RegExp }[] = [
  { slug: "lait", pattern: /\b(beurre|cr[eè]me|lait)\b/i },
  { slug: "gluten", pattern: /farine.*(bl[ée]|t\d{2,3})/i },
  // `\b` ne reconnaît pas `œ` comme caractère de mot (limite du moteur JS) : les deux graphies sont donc gérées séparément.
  { slug: "oeufs", pattern: /\b(oeufs?)\b|œufs?/i },
  { slug: "fruits-a-coque", pattern: /\b(pistaches?|noisettes?|amandes?)\b/i },
];

/** Cas nécessitant une vérification humaine plutôt qu'une déduction (docs/05-AI_IMPORT.md) : chocolat sans composition, nappage/pâte/préparation/produit générique. */
const AMBIGUOUS_PATTERN = /\b(chocolat|nappage|p[âa]te|pr[ée]paration|produit)\b/i;

/** Propositions d'allergènes par mot-clé, un seul avertissement par allergène (dédupliqué). Statut toujours `proposed`, jamais `confirmed`. */
export function proposeAllergensFromIngredients(ingredients: ExtractedIngredient[]): AllergenProposal[] {
  const bySlug = new Map<string, AllergenProposal>();
  for (const ingredient of ingredients) {
    const rule = ALLERGEN_RULES.find((candidate) => candidate.pattern.test(ingredient.originalName));
    if (rule && !bySlug.has(rule.slug)) {
      bySlug.set(rule.slug, {
        allergenSlug: rule.slug,
        status: "proposed",
        reason: `Détecté via « ${ingredient.originalName} » — à confirmer manuellement.`,
      });
    }
  }
  return [...bySlug.values()];
}

/** Avertissements pour les ingrédients à composition ambiguë, non couverts par une règle allergène directe. */
export function ambiguousIngredientWarnings(ingredients: ExtractedIngredient[]): string[] {
  return ingredients
    .filter(
      (ingredient) =>
        AMBIGUOUS_PATTERN.test(ingredient.originalName) &&
        !ALLERGEN_RULES.some((rule) => rule.pattern.test(ingredient.originalName)),
    )
    .map(
      (ingredient) =>
        `Ingrédient « ${ingredient.originalName} » : composition non précisée, allergène à vérifier manuellement.`,
    );
}

/**
 * Propositions de spécificités : uniquement `proposed`, jamais confirmées
 * automatiquement (l'absence d'un ingrédient dans une liste possiblement
 * incomplète ne suffit jamais à confirmer — docs/05-AI_IMPORT.md).
 */
export function proposeSpecificitiesFromIngredients(
  ingredients: ExtractedIngredient[],
  availableSpecificitySlugs: readonly string[],
): SpecificityProposal[] {
  const allergenSlugs = new Set(proposeAllergensFromIngredients(ingredients).map((p) => p.allergenSlug));
  const proposals: SpecificityProposal[] = [];

  if (availableSpecificitySlugs.includes("sans-gluten") && !allergenSlugs.has("gluten")) {
    proposals.push({
      specificitySlug: "sans-gluten",
      status: "proposed",
      reason: "Aucun ingrédient contenant du gluten identifié dans la liste — liste possiblement incomplète, à vérifier.",
      source: "rule",
    });
  }
  if (availableSpecificitySlugs.includes("sans-lactose") && !allergenSlugs.has("lait")) {
    proposals.push({
      specificitySlug: "sans-lactose",
      status: "proposed",
      reason: "Aucun ingrédient laitier identifié dans la liste — liste possiblement incomplète, à vérifier.",
      source: "rule",
    });
  }
  if (availableSpecificitySlugs.includes("vegan") && !allergenSlugs.has("lait") && !allergenSlugs.has("oeufs")) {
    proposals.push({
      specificitySlug: "vegan",
      status: "proposed",
      reason: "Aucun ingrédient d'origine animale identifié dans la liste — liste possiblement incomplète, à vérifier.",
      source: "rule",
    });
  }
  return proposals;
}

/** Normalisation vers un ingrédient canonique via le dictionnaire d'alias existant (réutilisé, jamais réimplémenté). */
export function proposeCanonicalIngredientsFromNames(ingredients: ExtractedIngredient[]): CanonicalIngredientProposal[] {
  const canonicalById = new Map(canonicalIngredients.map((ingredient) => [ingredient.id, ingredient]));
  return ingredients.map((ingredient) => {
    const canonicalId = resolveCanonicalIngredientId(ingredient.originalName);
    const canonical = canonicalId ? canonicalById.get(canonicalId) : undefined;
    return { originalName: ingredient.originalName, canonicalIngredientSlug: canonical?.slug ?? null };
  });
}
