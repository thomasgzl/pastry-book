/**
 * Validation déterministe de cohérence entre les spécificités `Gluten free`
 * (`sans-gluten`), `Sans lactose` (`sans-lactose`) et `Sans fruits à coque`
 * (`sans-fruits-a-coque`) et les ingrédients d'une recette — AUCUN appel IA,
 * fonction métier pure. Seule autorité pour ces 3 spécificités : ni
 * `proposeSpecificitiesFromIngredients` (rules.ts, autres spécificités
 * inchangées, ex. Vegan) ni un modèle ne décident de leur cohérence.
 *
 * Ne déduit jamais une trace ou une contamination croisée (CLAUDE.md,
 * principe 9) : classification par correspondance textuelle du libellé
 * ORIGINAL de l'ingrédient, jamais par déduction implicite. Une valeur
 * absente/insuffisante reste `unknown` (« à vérifier »), jamais devinée.
 */

import { normalizeText } from "@/lib/recipes/search";
import type { CanonicalIngredient, Tristate } from "@/lib/domain/schemas";

/** Slugs des 3 spécificités sous l'autorité exclusive de ce module (`sans-gluten` conservé tel quel malgré le libellé affiché « Gluten free », voir `src/lib/demo/data.ts`). */
export const VALIDATED_SPECIFICITY_SLUGS = {
  glutenFree: "sans-gluten",
  lactoseFree: "sans-lactose",
  treeNutsFree: "sans-fruits-a-coque",
} as const;
export type ValidatedSpecificitySlug = (typeof VALIDATED_SPECIFICITY_SLUGS)[keyof typeof VALIDATED_SPECIFICITY_SLUGS];

const VALIDATED_SLUG_SET = new Set<string>(Object.values(VALIDATED_SPECIFICITY_SLUGS));

/** Vrai si `slug` est l'une des 3 spécificités validées par ce module (permet un accès sûr/typé à `SpecificityEvaluation`). */
export function isValidatedSpecificitySlug(slug: string): slug is ValidatedSpecificitySlug {
  return VALIDATED_SLUG_SET.has(slug);
}

export type SpecificityEvaluationState = "incompatible" | "needs_review" | "unverified";

export interface SpecificityEvaluationEntry {
  state: SpecificityEvaluationState;
  /** Libellés originaux (`originalName`) des ingrédients responsables — vide pour `unverified`. */
  responsibleIngredients: string[];
  /** `null` uniquement pour `unverified` (rien à signaler). */
  message: string | null;
}

export type SpecificityEvaluation = Record<ValidatedSpecificitySlug, SpecificityEvaluationEntry>;

const CATEGORY_LABEL: Record<"gluten" | "lactose" | "treeNuts", string> = {
  gluten: "Gluten free",
  lactose: "Sans lactose",
  treeNuts: "Sans fruits à coque",
};

const CATEGORY_SLUG: Record<"gluten" | "lactose" | "treeNuts", ValidatedSpecificitySlug> = {
  gluten: VALIDATED_SPECIFICITY_SLUGS.glutenFree,
  lactose: VALIDATED_SPECIFICITY_SLUGS.lactoseFree,
  treeNuts: VALIDATED_SPECIFICITY_SLUGS.treeNutsFree,
};

/**
 * Farines compatibles gluten explicitement citées (règle produit) — toute
 * autre farine qualifiée reste `unknown`, seul le libellé simple « farine »
 * suit la règle par défaut (blé, donc `true`).
 */
function classifyGluten(norm: string): Tristate {
  const explicitlyGlutenFree = /sans gluten/.test(norm);

  if (/\bfarine\b/.test(norm)) {
    if (norm === "farine" || norm === "farines") return "true"; // libellé simple seul → défaut blé
    if (explicitlyGlutenFree) return "false";
    if (/\b(riz|mais|sarrasin)\b/.test(norm)) return "false"; // farine de riz/maïs/sarrasin, fécule de maïs
    if (/\b(ble|epeautre)\b/.test(norm) || /\bt\d{2,3}\b/.test(norm)) return "true"; // farine de blé, farine Txx
    return "unknown"; // farine qualifiée non reconnue (ex. farine de châtaigne) → à vérifier
  }

  if (explicitlyGlutenFree) return "false";
  if (/\b(ble|epeautre|seigle|orge|malt|chapelure|biere)\b/.test(norm)) return "true";
  if (/\bavoine\b/.test(norm)) return "true"; // non explicitement certifiée sans gluten (cas géré ci-dessus)
  return "false";
}

/** Boissons/crèmes végétales explicitement identifiées — ne bloquent jamais (règle produit). */
const VEGETAL_MILK_QUALIFIERS = /(amande|soja|avoine|riz|coco|noisette|chanvre)/;

function classifyLactose(norm: string): Tristate {
  if (/sans lactose/.test(norm)) return "false";
  if (/\b(lait|creme)\b/.test(norm) && VEGETAL_MILK_QUALIFIERS.test(norm)) return "false";
  if (/\b(lait|creme|lactose|lactoserum|yaourt|mascarpone|beurre)\b/.test(norm) || /fromage frais/.test(norm)) return "true";
  // Beurre déjà couvert ci-dessus (prudence, conservateur) ; chocolat non qualifié reste ambigu (composition non précisée).
  if (/\bchocolat\b/.test(norm)) return "unknown";
  return "false";
}

function classifyTreeNuts(norm: string): Tristate {
  if (/\b(amande|noisette|pistache|macadamia)/.test(norm)) return "true";
  if (/noix\s+(de\s+cajou|de\s+pecan|du\s+bresil)/.test(norm)) return "true";
  if (/\bnoix\b/.test(norm) && !/coco/.test(norm)) return "true"; // jamais « noix de coco » (non concernée)
  if (/\bpraline/.test(norm)) return "unknown"; // praliné de composition non précisée
  // Jamais l'arachide (CLAUDE.md/règle produit — l'arachide n'est pas un fruit à coque).
  return "false";
}

/** Classification textuelle centralisée d'un libellé d'ingrédient — seule fonction de matching pour ces 3 catégories, jamais dispersée ailleurs. */
export function classifyIngredientText(originalName: string): { gluten: Tristate; lactose: Tristate; treeNuts: Tristate } {
  const norm = normalizeText(originalName);
  return {
    gluten: classifyGluten(norm),
    lactose: classifyLactose(norm),
    treeNuts: classifyTreeNuts(norm),
  };
}

interface EvaluatedIngredient {
  originalName: string;
  canonicalIngredientId: string | null;
}

/**
 * Résout la classification d'une ligne d'ingrédient : la matière première
 * canonique (`canonical_ingredients`, source de vérité unique) prévaut dès
 * qu'elle n'est pas `unknown` pour la catégorie considérée ; sinon, repli sur
 * `classifyIngredientText` appliqué au libellé original de la ligne.
 */
function resolveIngredientClassification(
  ingredient: EvaluatedIngredient,
  canonicalById: Map<string, CanonicalIngredient>,
): { gluten: Tristate; lactose: Tristate; treeNuts: Tristate } {
  const canonical = ingredient.canonicalIngredientId ? canonicalById.get(ingredient.canonicalIngredientId) : undefined;
  const textual = classifyIngredientText(ingredient.originalName);
  return {
    gluten: canonical && canonical.containsGluten !== "unknown" ? canonical.containsGluten : textual.gluten,
    lactose: canonical && canonical.containsLactose !== "unknown" ? canonical.containsLactose : textual.lactose,
    treeNuts: canonical && canonical.containsTreeNuts !== "unknown" ? canonical.containsTreeNuts : textual.treeNuts,
  };
}

/**
 * Évalue les 3 spécificités contrôlées sur l'ENSEMBLE des ingrédients de la
 * recette (toutes préparations, y compris le technique déjà exclu des tags
 * de matière première gustatifs — `resolveKeyIngredientTags`/
 * `normalizeKeyIngredientName` répondent à un besoin différent et ne sont
 * jamais réutilisés ici). `incompatible` dès qu'un ingrédient est `true` ;
 * sinon `needs_review` dès qu'un ingrédient reste `unknown` ; sinon
 * `unverified` — l'absence de conflit détecté ne confirme jamais
 * automatiquement une spécificité (CLAUDE.md, principe 9).
 */
export function evaluateRecipeSpecificities(
  sections: { ingredients: EvaluatedIngredient[] }[],
  canonicalIngredients: CanonicalIngredient[],
): SpecificityEvaluation {
  const canonicalById = new Map(canonicalIngredients.map((ingredient) => [ingredient.id, ingredient]));
  const allIngredients = sections.flatMap((section) => section.ingredients);

  const result = {} as SpecificityEvaluation;

  for (const category of Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]) {
    const incompatible: string[] = [];
    const needsReview: string[] = [];

    for (const ingredient of allIngredients) {
      const value = resolveIngredientClassification(ingredient, canonicalById)[category];
      if (value === "true") incompatible.push(ingredient.originalName);
      else if (value === "unknown") needsReview.push(ingredient.originalName);
    }

    const slug = CATEGORY_SLUG[category];
    const label = CATEGORY_LABEL[category];
    if (incompatible.length > 0) {
      result[slug] = {
        state: "incompatible",
        responsibleIngredients: incompatible,
        message: `${label} impossible : présence de ${incompatible.join(", ")}.`,
      };
    } else if (needsReview.length > 0) {
      result[slug] = {
        state: "needs_review",
        responsibleIngredients: needsReview,
        message: `${label} à vérifier : composition de ${needsReview.join(", ")} non précisée.`,
      };
    } else {
      result[slug] = { state: "unverified", responsibleIngredients: [], message: null };
    }
  }

  return result;
}
