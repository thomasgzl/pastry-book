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
import { normalizeText, resolveCanonicalIngredientId } from "@/lib/recipes/search";
import { slugify } from "@/lib/import/model";
import type { CanonicalIngredient, IngredientAlias, ProposedKeyIngredientTag } from "@/lib/domain/schemas";
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

// ============================================================
// Matières premières principales (tags de recherche gustatifs, F-KEY1) —
// sélection/normalisation d'un nom déjà proposé par l'extraction (modèle ou
// fixture de démonstration), puis dédoublonnage contre le référentiel de
// matières premières canoniques déjà chargé. Jamais de déduction depuis
// `recipe_ingredients` ici : cette liste vient toujours d'une proposition
// explicite (prompt IA ou fixture), au plus 6, éventuellement 0.
// ============================================================

/** Préfixes à ignorer pour la comparaison/le libellé du tag (ex. « jus de citron » → « Citron ») — jamais appliqué au libellé original de l'ingrédient dans la recette elle-même. */
const KEY_INGREDIENT_PREFIX_PATTERN = /^(jus|zeste|pur[ée]e|poudre|p[âa]te)\s+de\s+/i;

/**
 * Regroupement chocolat (règle produit explicite) — heuristique par motif,
 * pas un vrai parseur : étendre les motifs si une nouvelle formulation
 * apparaît en pratique plutôt que généraliser prématurément.
 * ponytail: regex heuristique, à durcir seulement si un cas réel y échappe.
 */
const CHOCOLATE_GROUPING_RULES: { pattern: RegExp; name: string }[] = [
  { pattern: /chocolat\s+au\s+lait/i, name: "Chocolat au lait" },
  { pattern: /chocolat\s+blanc/i, name: "Chocolat blanc" },
  { pattern: /dulcey|chocolat\s+blond/i, name: "Chocolat blond Dulcey" },
  { pattern: /^chocolat\s+noir(\s+\d{2,3}\s*%?)?$/i, name: "Chocolat noir" },
  { pattern: /^chocolat(\s+\d{2,3}\s*%?)?$/i, name: "Chocolat noir" },
  { pattern: /^couverture(\s+noire?)?\s*\d{2,3}\s*%?$/i, name: "Chocolat noir" },
];

/**
 * Nettoie un nom de tag proposé (chocolat regroupé si applicable, préfixe
 * « jus/zeste/purée/poudre/pâte de » retiré, pluriel simple retiré,
 * première lettre capitalisée) — jamais appliqué au libellé original d'un
 * ingrédient dans la liste de la recette, seulement au nom de tag affiché.
 * `null` si le nom est vide après nettoyage (jamais un tag vide inventé).
 */
export function normalizeKeyIngredientName(rawName: string): string | null {
  const trimmed = rawName.trim();
  if (!trimmed) return null;

  for (const rule of CHOCOLATE_GROUPING_RULES) {
    if (rule.pattern.test(trimmed)) return rule.name;
  }

  const withoutPrefix = trimmed.replace(KEY_INGREDIENT_PREFIX_PATTERN, "").trim();
  if (!withoutPrefix) return null;
  const singular = withoutPrefix.replace(/s$/i, "") || withoutPrefix;
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

/**
 * Résout une liste de noms de tags proposés (déjà censés respecter les
 * règles de sélection/regroupement/normalisation du prompt) vers des
 * `ProposedKeyIngredientTag` dédoublonnés contre le référentiel déjà chargé
 * (matières premières canoniques + alias) — comparaison insensible
 * casse/accents (`normalizeText`, déjà utilisée par `resolveCanonicalIngredientId`).
 * Une correspondance par alias OU par nom canonique direct devient
 * `kind: "existing"` ; sinon `kind: "new"` avec un slug dérivé
 * (`slugify`, déjà utilisé par `src/lib/import/model.ts`). Jamais plus de 6
 * tags, jamais un doublon (même matière proposée deux fois par le modèle).
 */
export function resolveKeyIngredientTags(
  rawNames: string[],
  availableCanonicalIngredients: CanonicalIngredient[],
  aliases: IngredientAlias[],
): ProposedKeyIngredientTag[] {
  const canonicalById = new Map(availableCanonicalIngredients.map((ingredient) => [ingredient.id, ingredient]));
  const seenSlugs = new Set<string>();
  const tags: ProposedKeyIngredientTag[] = [];

  for (const rawName of rawNames) {
    const cleanedName = normalizeKeyIngredientName(rawName);
    if (!cleanedName) continue;
    const normalized = normalizeText(cleanedName);
    if (!normalized) continue;

    const aliasMatch = aliases.find((alias) => alias.normalizedAlias === normalized);
    const existing =
      (aliasMatch ? canonicalById.get(aliasMatch.canonicalIngredientId) : undefined) ??
      availableCanonicalIngredients.find((ingredient) => normalizeText(ingredient.name) === normalized);

    const slug = existing?.slug ?? slugify(cleanedName);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    tags.push(
      existing
        ? { kind: "existing", canonicalIngredientId: existing.id, name: existing.name }
        : { kind: "new", name: cleanedName, slug },
    );

    if (tags.length >= 6) break;
  }

  return tags;
}
