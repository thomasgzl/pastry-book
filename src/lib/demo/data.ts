/**
 * Jeu de données de démonstration — mode démo de l'application (lot C,
 * batch C2-C9). Fidèle au scénario de `supabase/seed.sql` (mêmes 4 sources,
 * mêmes 4 catégories Hennessy, mêmes 6 recettes avec les mêmes cas de
 * quantité QS/décimale/needs_review, mêmes 3 alias citron, mêmes exemples
 * confirmed/proposed).
 *
 * Pourquoi un fichier séparé plutôt que généré depuis `supabase/seed.sql` :
 * les deux fichiers servent deux runtimes différents. `seed.sql` est chargé
 * par `supabase db reset`/`supabase start`, indisponibles ici (Docker
 * absent — décision actée en B3/B4/B5). Ce fichier alimente la couche de
 * lecture `src/lib/data/*` pour que l'app fonctionne sans Supabase. Générer
 * l'un depuis l'autre (parseur SQL ou script de synchronisation) serait de
 * la sur-ingénierie pour six recettes de démonstration ; les deux fichiers
 * sont donc tenus à jour manuellement en parallèle.
 *
 * Tout le contenu est FICTIF, comme `supabase/seed.sql`.
 */

import type {
  Allergen,
  CanonicalIngredient,
  IngredientAlias,
  Recipe,
  RecipeAllergen,
  RecipeIngredient,
  RecipeKeyIngredient,
  RecipeSection,
  RecipeSpecificity,
  Source,
  SourceCategory,
  Specificity,
} from "@/lib/domain/schemas";

const CREATED_AT = "2026-08-01T00:00:00.000Z";
const UPDATED_AT = "2026-08-01T00:00:00.000Z";

// ============================================================
// sources — Hennessy et CAP Pâtissier sont les sources réelles du produit ;
// Personnel désigne les recettes ajoutées librement par l'utilisateur ;
// Boulangerie Démo est une entreprise entièrement inventée.
// ============================================================

const SOURCE_ID = {
  hennessy: "00000000-0000-4000-8000-000000000001",
  capPatissier: "00000000-0000-4000-8000-000000000002",
  personnel: "00000000-0000-4000-8000-000000000003",
  boulangerieDemo: "00000000-0000-4000-8000-000000000004",
} as const;

export const sources: Source[] = [
  {
    id: SOURCE_ID.hennessy,
    name: "Hennessy",
    slug: "hennessy",
    description: null,
    illustrationUrl: null,
    createdAt: CREATED_AT,
  },
  {
    id: SOURCE_ID.capPatissier,
    name: "CAP Pâtissier",
    slug: "cap-patissier",
    description: null,
    illustrationUrl: null,
    createdAt: CREATED_AT,
  },
  {
    id: SOURCE_ID.personnel,
    name: "Personnel",
    slug: "personnel",
    description: null,
    illustrationUrl: null,
    createdAt: CREATED_AT,
  },
  {
    id: SOURCE_ID.boulangerieDemo,
    name: "Boulangerie Démo",
    slug: "boulangerie-demo",
    description: "Entreprise fictive utilisée uniquement pour les données de démonstration.",
    illustrationUrl: null,
    createdAt: CREATED_AT,
  },
];

// ============================================================
// source_categories — propres à Hennessy uniquement (CLAUDE.md, principe 6).
// ============================================================

const CATEGORY_ID = {
  dessertsAssiette: "00000000-0000-4000-8000-000000000101",
  dessertsBoutique: "00000000-0000-4000-8000-000000000102",
  recettesDeBase: "00000000-0000-4000-8000-000000000103",
  petitDejeuner: "00000000-0000-4000-8000-000000000104",
} as const;

export const sourceCategories: SourceCategory[] = [
  { id: CATEGORY_ID.dessertsAssiette, sourceId: SOURCE_ID.hennessy, name: "Desserts à l'assiette", slug: "desserts-a-lassiette", position: 0 },
  { id: CATEGORY_ID.dessertsBoutique, sourceId: SOURCE_ID.hennessy, name: "Desserts boutique", slug: "desserts-boutique", position: 1 },
  { id: CATEGORY_ID.recettesDeBase, sourceId: SOURCE_ID.hennessy, name: "Recettes de base", slug: "recettes-de-base", position: 2 },
  { id: CATEGORY_ID.petitDejeuner, sourceId: SOURCE_ID.hennessy, name: "Petit-déjeuner", slug: "petit-dejeuner", position: 3 },
];

// ============================================================
// canonical_ingredients
// ============================================================

const INGREDIENT_ID = {
  citron: "00000000-0000-4000-8000-000000000201",
  pistache: "00000000-0000-4000-8000-000000000202",
  chocolat: "00000000-0000-4000-8000-000000000203",
  vanille: "00000000-0000-4000-8000-000000000204",
  noisette: "00000000-0000-4000-8000-000000000205",
  poire: "00000000-0000-4000-8000-000000000206",
} as const;

// Classification allergène (tâche K17, migration 20260819130000) : source de
// vérité par matière première canonique — voir `specificityValidation.ts`
// pour la logique de résolution ligne par ligne. Chocolat générique reste
// `containsLactose: "unknown"` (composition — noir/lait/blanc — non précisée
// tant que la variante n'est pas indiquée) ; Pistache/Noisette portent
// `containsTreeNuts: "true"` (même backfill que `supabase/seed.sql`).
export const canonicalIngredients: CanonicalIngredient[] = [
  { id: INGREDIENT_ID.citron, name: "Citron", slug: "citron", parentId: null, containsGluten: "false", containsLactose: "false", containsTreeNuts: "false" },
  { id: INGREDIENT_ID.pistache, name: "Pistache", slug: "pistache", parentId: null, containsGluten: "false", containsLactose: "false", containsTreeNuts: "true" },
  { id: INGREDIENT_ID.chocolat, name: "Chocolat", slug: "chocolat", parentId: null, containsGluten: "false", containsLactose: "unknown", containsTreeNuts: "false" },
  { id: INGREDIENT_ID.vanille, name: "Vanille", slug: "vanille", parentId: null, containsGluten: "false", containsLactose: "false", containsTreeNuts: "false" },
  { id: INGREDIENT_ID.noisette, name: "Noisette", slug: "noisette", parentId: null, containsGluten: "false", containsLactose: "false", containsTreeNuts: "true" },
  { id: INGREDIENT_ID.poire, name: "Poire", slug: "poire", parentId: null, containsGluten: "false", containsLactose: "false", containsTreeNuts: "false" },
];

// ============================================================
// ingredient_aliases — tous reliés au canonique Citron. Ces libellés exacts
// sont réutilisés plus bas comme originalName de recipeIngredients pour
// prouver que le texte source reste intact une fois lié au canonique.
// ============================================================

export const ingredientAliases: IngredientAlias[] = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    canonicalIngredientId: INGREDIENT_ID.citron,
    alias: "jus de citron",
    normalizedAlias: "jus de citron",
    status: "confirmed",
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    canonicalIngredientId: INGREDIENT_ID.citron,
    alias: "zeste de citron",
    normalizedAlias: "zeste de citron",
    status: "confirmed",
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    canonicalIngredientId: INGREDIENT_ID.citron,
    alias: "purée de citron",
    normalizedAlias: "puree de citron",
    status: "proposed",
  },
];

// ============================================================
// allergens / specificities (référentiels)
// ============================================================

const ALLERGEN_ID = {
  gluten: "00000000-0000-4000-8000-000000000401",
  oeufs: "00000000-0000-4000-8000-000000000402",
  lait: "00000000-0000-4000-8000-000000000403",
  fruitsACoque: "00000000-0000-4000-8000-000000000404",
} as const;

export const allergens: Allergen[] = [
  { id: ALLERGEN_ID.gluten, name: "Gluten", slug: "gluten" },
  { id: ALLERGEN_ID.oeufs, name: "Œufs", slug: "oeufs" },
  { id: ALLERGEN_ID.lait, name: "Lait", slug: "lait" },
  { id: ALLERGEN_ID.fruitsACoque, name: "Fruits à coque", slug: "fruits-a-coque" },
];

const SPECIFICITY_ID = {
  vegan: "00000000-0000-4000-8000-000000000501",
  sansGluten: "00000000-0000-4000-8000-000000000502",
  sansLactose: "00000000-0000-4000-8000-000000000503",
  sansFruitsACoque: "00000000-0000-4000-8000-000000000504",
} as const;

// Interface restreinte à ces quatre spécificités (allergènes exclus, voir
// src/lib/data/specificities.ts). Slug `sans-gluten` conservé tel quel
// (compatibilité `rules.ts`/imports existants) — seul le libellé affiché
// change en « Gluten free ».
export const specificities: Specificity[] = [
  { id: SPECIFICITY_ID.vegan, name: "Vegan", slug: "vegan" },
  { id: SPECIFICITY_ID.sansGluten, name: "Gluten free", slug: "sans-gluten" },
  { id: SPECIFICITY_ID.sansLactose, name: "Sans lactose", slug: "sans-lactose" },
  { id: SPECIFICITY_ID.sansFruitsACoque, name: "Sans fruits à coque", slug: "sans-fruits-a-coque" },
];

// ============================================================
// recipes — photoUrl : URLs `https://picsum.photos/...` clairement démo (le
// contrat Zod recipeSchema.photoUrl exige une URL absolue).
// ============================================================

const RECIPE_ID = {
  pateSableeCap: "00000000-0000-4000-8000-000000000601",
  cremePatissiereCap: "00000000-0000-4000-8000-000000000602",
  tarteCitronHennessy: "00000000-0000-4000-8000-000000000603",
  cremePatissiereHennessy: "00000000-0000-4000-8000-000000000604",
  financiersNoisetteDemo: "00000000-0000-4000-8000-000000000605",
  painNoisettesDemo: "00000000-0000-4000-8000-000000000606",
} as const;

export const recipes: Recipe[] = [
  // CAP Pâtissier : uniquement des ingrédients, aucune information
  // complémentaire, aucune photo (CLAUDE.md, principe 2).
  {
    id: RECIPE_ID.pateSableeCap,
    sourceId: SOURCE_ID.capPatissier,
    sourceCategoryId: null,
    title: "Pâte sablée (CAP)",
    slug: "pate-sablee-cap",
    additionalInformation: null,
    originalDocumentUrl: null,
    photoUrl: null,
    illustrationUrl: null,
    importStatus: "validated",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  // Membre du couple « même nom, sources différentes » (préparations non
  // globalisées).
  {
    id: RECIPE_ID.cremePatissiereCap,
    sourceId: SOURCE_ID.capPatissier,
    sourceCategoryId: null,
    title: "Crème pâtissière (CAP)",
    slug: "creme-patissiere-cap",
    additionalInformation: null,
    originalDocumentUrl: null,
    photoUrl: null,
    illustrationUrl: null,
    importStatus: "validated",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  // Hennessy détaillée : additionalInformation renseigné + photo démo.
  {
    id: RECIPE_ID.tarteCitronHennessy,
    sourceId: SOURCE_ID.hennessy,
    sourceCategoryId: CATEGORY_ID.dessertsBoutique,
    title: "Tarte au citron (Hennessy)",
    slug: "tarte-au-citron-hennessy",
    additionalInformation:
      "Cuisson à blanc 15 min à 170°C avant garnissage. Dresser les zestes juste avant le service (démo).",
    originalDocumentUrl: null,
    photoUrl: "https://picsum.photos/seed/tarte-citron-demo/800/600",
    illustrationUrl: null,
    importStatus: "validated",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  // Autre membre du couple « même nom, sources différentes ».
  {
    id: RECIPE_ID.cremePatissiereHennessy,
    sourceId: SOURCE_ID.hennessy,
    sourceCategoryId: CATEGORY_ID.recettesDeBase,
    title: "Crème pâtissière (Hennessy)",
    slug: "creme-patissiere-hennessy",
    additionalInformation: null,
    originalDocumentUrl: null,
    photoUrl: null,
    illustrationUrl: null,
    importStatus: "validated",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: RECIPE_ID.financiersNoisetteDemo,
    sourceId: SOURCE_ID.personnel,
    sourceCategoryId: null,
    title: "Financiers noisette (démo perso)",
    slug: "financiers-noisette-demo",
    additionalInformation: null,
    originalDocumentUrl: null,
    photoUrl: null,
    illustrationUrl: null,
    importStatus: "draft",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: RECIPE_ID.painNoisettesDemo,
    sourceId: SOURCE_ID.boulangerieDemo,
    sourceCategoryId: null,
    title: "Pain aux noisettes (démo, Boulangerie Démo)",
    slug: "pain-aux-noisettes-demo",
    additionalInformation: null,
    originalDocumentUrl: null,
    photoUrl: "https://picsum.photos/seed/pain-noisettes-demo/800/600",
    illustrationUrl: null,
    importStatus: "needs_review",
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
];

// ============================================================
// recipe_sections
// ============================================================

const SECTION_ID = {
  pateSableeCap: "00000000-0000-4000-8000-000000000701",
  cremePatissiereCap: "00000000-0000-4000-8000-000000000702",
  tarteCitronPate: "00000000-0000-4000-8000-000000000703",
  tarteCitronCreme: "00000000-0000-4000-8000-000000000704",
  cremePatissiereHennessy: "00000000-0000-4000-8000-000000000705",
  financiersNoisette: "00000000-0000-4000-8000-000000000706",
  painNoisettes: "00000000-0000-4000-8000-000000000707",
} as const;

export const recipeSections: RecipeSection[] = [
  {
    id: SECTION_ID.pateSableeCap,
    recipeId: RECIPE_ID.pateSableeCap,
    name: null,
    position: 0,
    originalText: "Farine T55 200 g, Beurre 100 g, Sucre glace 62,5 g, Œuf 1, Sel QS",
  },
  {
    id: SECTION_ID.cremePatissiereCap,
    recipeId: RECIPE_ID.cremePatissiereCap,
    name: null,
    position: 0,
    originalText: "Lait 500 g, Jaunes d'œufs 4, Sucre 100 g, Poudre à crème 50 g, Vanille QS",
  },
  {
    id: SECTION_ID.tarteCitronPate,
    recipeId: RECIPE_ID.tarteCitronHennessy,
    name: "Pâte sablée",
    position: 0,
    originalText: "Farine T55 250 g, Beurre (quantité illisible sur le document scanné), Zeste de citron QS",
  },
  {
    id: SECTION_ID.tarteCitronCreme,
    recipeId: RECIPE_ID.tarteCitronHennessy,
    name: "Crème citron",
    position: 1,
    originalText: "Jus de citron 125 ml, Purée de citron 1/2, Sucre 90 g, Œufs 3",
  },
  {
    id: SECTION_ID.cremePatissiereHennessy,
    recipeId: RECIPE_ID.cremePatissiereHennessy,
    name: "Crème pâtissière",
    position: 0,
    originalText: "Lait entier 500 ml, Jaunes d'œufs 6, Sucre semoule 110 g, Poudre à crème 45 g, Gousse de vanille 1",
  },
  {
    id: SECTION_ID.financiersNoisette,
    recipeId: RECIPE_ID.financiersNoisetteDemo,
    name: null,
    position: 0,
    originalText: "Poudre de noisette 100 g, Sucre glace 150 g, Farine T55 40 g, Blancs d'œufs 120 g, Beurre noisette 110 g",
  },
  {
    id: SECTION_ID.painNoisettes,
    recipeId: RECIPE_ID.painNoisettesDemo,
    name: null,
    position: 0,
    originalText: "Farine de blé T65 500 g, Eau 320 g, Levure fraîche 10 g, Sel 10 g, Noisettes concassées 80 g",
  },
];

// ============================================================
// recipe_ingredients — couvre les 4 cas de quantité exigés : entière (200),
// décimale (62,5), QS (originalQuantityText = 'QS', quantityDecimal null)
// et absente/à vérifier (originalQuantityText null, verificationStatus
// needs_review).
// ============================================================

let ingredientCounter = 0;
function ingredientId(): string {
  ingredientCounter += 1;
  return `00000000-0000-4000-8000-0000000008${String(ingredientCounter).padStart(2, "0")}`;
}

export const recipeIngredients: RecipeIngredient[] = [
  // Pâte sablée (CAP)
  { id: ingredientId(), recipeSectionId: SECTION_ID.pateSableeCap, originalName: "Farine T55", canonicalIngredientId: null, originalQuantityText: "200", quantityDecimal: "200", unit: "g", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.pateSableeCap, originalName: "Beurre", canonicalIngredientId: null, originalQuantityText: "100", quantityDecimal: "100", unit: "g", position: 1, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.pateSableeCap, originalName: "Sucre glace", canonicalIngredientId: null, originalQuantityText: "62,5", quantityDecimal: "62.5", unit: "g", position: 2, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.pateSableeCap, originalName: "Œuf", canonicalIngredientId: null, originalQuantityText: "1", quantityDecimal: "1", unit: "pièce", position: 3, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.pateSableeCap, originalName: "Sel", canonicalIngredientId: null, originalQuantityText: "QS", quantityDecimal: null, unit: null, position: 4, verificationStatus: "proposed", confidence: null },

  // Crème pâtissière (CAP)
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereCap, originalName: "Lait", canonicalIngredientId: null, originalQuantityText: "500", quantityDecimal: "500", unit: "g", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereCap, originalName: "Jaunes d'œufs", canonicalIngredientId: null, originalQuantityText: "4", quantityDecimal: "4", unit: "pièce", position: 1, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereCap, originalName: "Sucre", canonicalIngredientId: null, originalQuantityText: "100", quantityDecimal: "100", unit: "g", position: 2, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereCap, originalName: "Poudre à crème", canonicalIngredientId: null, originalQuantityText: "50", quantityDecimal: "50", unit: "g", position: 3, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereCap, originalName: "Vanille", canonicalIngredientId: INGREDIENT_ID.vanille, originalQuantityText: "QS", quantityDecimal: null, unit: null, position: 4, verificationStatus: "proposed", confidence: null },

  // Tarte au citron (Hennessy) — Pâte sablée
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronPate, originalName: "Farine T55", canonicalIngredientId: null, originalQuantityText: "250", quantityDecimal: "250", unit: "g", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronPate, originalName: "Beurre", canonicalIngredientId: null, originalQuantityText: null, quantityDecimal: null, unit: null, position: 1, verificationStatus: "needs_review", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronPate, originalName: "zeste de citron", canonicalIngredientId: INGREDIENT_ID.citron, originalQuantityText: "QS", quantityDecimal: null, unit: null, position: 2, verificationStatus: "proposed", confidence: null },

  // Tarte au citron (Hennessy) — Crème citron
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronCreme, originalName: "jus de citron", canonicalIngredientId: INGREDIENT_ID.citron, originalQuantityText: "125", quantityDecimal: "125", unit: "ml", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronCreme, originalName: "purée de citron", canonicalIngredientId: INGREDIENT_ID.citron, originalQuantityText: "1/2", quantityDecimal: null, unit: null, position: 1, verificationStatus: "needs_review", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronCreme, originalName: "Sucre", canonicalIngredientId: null, originalQuantityText: "90", quantityDecimal: "90", unit: "g", position: 2, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.tarteCitronCreme, originalName: "Œufs", canonicalIngredientId: null, originalQuantityText: "3", quantityDecimal: "3", unit: "pièce", position: 3, verificationStatus: "confirmed", confidence: null },

  // Crème pâtissière (Hennessy)
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereHennessy, originalName: "Lait entier", canonicalIngredientId: null, originalQuantityText: "500", quantityDecimal: "500", unit: "ml", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereHennessy, originalName: "Jaunes d'œufs", canonicalIngredientId: null, originalQuantityText: "6", quantityDecimal: "6", unit: "pièce", position: 1, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereHennessy, originalName: "Sucre semoule", canonicalIngredientId: null, originalQuantityText: "110", quantityDecimal: "110", unit: "g", position: 2, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereHennessy, originalName: "Poudre à crème", canonicalIngredientId: null, originalQuantityText: "45", quantityDecimal: "45", unit: "g", position: 3, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.cremePatissiereHennessy, originalName: "Gousse de vanille", canonicalIngredientId: INGREDIENT_ID.vanille, originalQuantityText: "1", quantityDecimal: "1", unit: "pièce", position: 4, verificationStatus: "confirmed", confidence: null },

  // Financiers noisette (démo perso)
  { id: ingredientId(), recipeSectionId: SECTION_ID.financiersNoisette, originalName: "Poudre de noisette", canonicalIngredientId: INGREDIENT_ID.noisette, originalQuantityText: "100", quantityDecimal: "100", unit: "g", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.financiersNoisette, originalName: "Sucre glace", canonicalIngredientId: null, originalQuantityText: "150", quantityDecimal: "150", unit: "g", position: 1, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.financiersNoisette, originalName: "Farine T55", canonicalIngredientId: null, originalQuantityText: "40", quantityDecimal: "40", unit: "g", position: 2, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.financiersNoisette, originalName: "Blancs d'œufs", canonicalIngredientId: null, originalQuantityText: "120", quantityDecimal: "120", unit: "g", position: 3, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.financiersNoisette, originalName: "Beurre noisette", canonicalIngredientId: null, originalQuantityText: "110", quantityDecimal: "110", unit: "g", position: 4, verificationStatus: "confirmed", confidence: null },

  // Pain aux noisettes (démo, Boulangerie Démo)
  { id: ingredientId(), recipeSectionId: SECTION_ID.painNoisettes, originalName: "Farine de blé T65", canonicalIngredientId: null, originalQuantityText: "500", quantityDecimal: "500", unit: "g", position: 0, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.painNoisettes, originalName: "Eau", canonicalIngredientId: null, originalQuantityText: "320", quantityDecimal: "320", unit: "g", position: 1, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.painNoisettes, originalName: "Levure fraîche", canonicalIngredientId: null, originalQuantityText: "10", quantityDecimal: "10", unit: "g", position: 2, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.painNoisettes, originalName: "Sel", canonicalIngredientId: null, originalQuantityText: "10", quantityDecimal: "10", unit: "g", position: 3, verificationStatus: "confirmed", confidence: null },
  { id: ingredientId(), recipeSectionId: SECTION_ID.painNoisettes, originalName: "Noisettes concassées", canonicalIngredientId: INGREDIENT_ID.noisette, originalQuantityText: "80", quantityDecimal: "80", unit: "g", position: 4, verificationStatus: "confirmed", confidence: null },
];

// ============================================================
// recipe_key_ingredients — tags de matière première principale, curatés
// (fictif) : sélection éditoriale, PAS une dérivation automatique de tous les
// canonicalIngredientId présents dans recipeIngredients (voir
// `20260819110000_recipe_key_ingredients.sql`). Un seul tag par recette de
// démo (le jeu réel vise 3 à 6) suffit à couvrir les cas testés : présence,
// absence (Pâte sablée CAP, Crème pâtissière CAP), et une matière première
// partagée par deux sources différentes (Noisette).
// ============================================================

export const recipeKeyIngredients: RecipeKeyIngredient[] = [
  { recipeId: RECIPE_ID.tarteCitronHennessy, canonicalIngredientId: INGREDIENT_ID.citron, position: 0 },
  { recipeId: RECIPE_ID.cremePatissiereHennessy, canonicalIngredientId: INGREDIENT_ID.vanille, position: 0 },
  { recipeId: RECIPE_ID.financiersNoisetteDemo, canonicalIngredientId: INGREDIENT_ID.noisette, position: 0 },
  { recipeId: RECIPE_ID.painNoisettesDemo, canonicalIngredientId: INGREDIENT_ID.noisette, position: 0 },
];

// ============================================================
// recipe_allergens — statuts distincts 'confirmed' / 'proposed' /
// 'needs_review' (CLAUDE.md, principe 9 : jamais de trace ou contamination
// croisée déduite ; on affiche ici seulement ce qui est explicitement
// confirmé ou proposé).
// ============================================================

export const recipeAllergens: RecipeAllergen[] = [
  { recipeId: RECIPE_ID.tarteCitronHennessy, allergenId: ALLERGEN_ID.gluten, status: "confirmed" },
  { recipeId: RECIPE_ID.tarteCitronHennessy, allergenId: ALLERGEN_ID.oeufs, status: "confirmed" },
  { recipeId: RECIPE_ID.tarteCitronHennessy, allergenId: ALLERGEN_ID.lait, status: "proposed" },
  { recipeId: RECIPE_ID.cremePatissiereHennessy, allergenId: ALLERGEN_ID.lait, status: "confirmed" },
  { recipeId: RECIPE_ID.cremePatissiereHennessy, allergenId: ALLERGEN_ID.oeufs, status: "confirmed" },
  { recipeId: RECIPE_ID.cremePatissiereHennessy, allergenId: ALLERGEN_ID.gluten, status: "needs_review" },
  { recipeId: RECIPE_ID.financiersNoisetteDemo, allergenId: ALLERGEN_ID.fruitsACoque, status: "confirmed" },
  { recipeId: RECIPE_ID.financiersNoisetteDemo, allergenId: ALLERGEN_ID.oeufs, status: "confirmed" },
  { recipeId: RECIPE_ID.financiersNoisetteDemo, allergenId: ALLERGEN_ID.lait, status: "confirmed" },
  { recipeId: RECIPE_ID.financiersNoisetteDemo, allergenId: ALLERGEN_ID.gluten, status: "confirmed" },
  { recipeId: RECIPE_ID.painNoisettesDemo, allergenId: ALLERGEN_ID.gluten, status: "confirmed" },
  { recipeId: RECIPE_ID.painNoisettesDemo, allergenId: ALLERGEN_ID.fruitsACoque, status: "confirmed" },
];

// ============================================================
// recipe_specificities — un exemple 'confirmed' et un exemple 'proposed'
// pour prouver que les deux états restent visuellement/structurellement
// distincts.
// ============================================================

export const recipeSpecificities: RecipeSpecificity[] = [
  {
    recipeId: RECIPE_ID.tarteCitronHennessy,
    specificityId: SPECIFICITY_ID.sansLactose,
    status: "proposed",
    reason:
      "Beurre présent mais quantité illisible dans la source : statut non confirmable automatiquement (démo, à vérifier).",
    source: "ai",
  },
  {
    recipeId: RECIPE_ID.painNoisettesDemo,
    specificityId: SPECIFICITY_ID.vegan,
    status: "confirmed",
    reason: "Aucun ingrédient d'origine animale dans la liste (démo).",
    source: "manual",
  },
];
