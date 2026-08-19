import { z } from "zod";

/**
 * Contrats communs du domaine (tâche B2). Source de vérité unique : miroir de
 * docs/04-DATA_MODEL.md. Toute évolution s'annonce à project-orchestrator
 * avant modification (docs/10-AGENT_ARCHITECTURE.md).
 *
 * Quantités en décimal : jamais `number` (float binaire interdit par
 * CLAUDE.md). Représentées en chaîne (ex. "250.5") ; le calcul du
 * coefficient convertit via une lib décimale dédiée, propriété de
 * recipe-search-agent.
 */

export const verificationStatusSchema = z.enum([
  "confirmed",
  "proposed",
  "needs_review",
]);
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;

export const importStatusSchema = z.enum(["draft", "needs_review", "validated"]);
export type ImportStatus = z.infer<typeof importStatusSchema>;

export const specificityStatusSchema = z.enum([
  "confirmed",
  "proposed",
  "rejected",
]);
export type SpecificityStatus = z.infer<typeof specificityStatusSchema>;

export const specificitySourceSchema = z.enum(["manual", "rule", "ai"]);
export type SpecificitySource = z.infer<typeof specificitySourceSchema>;

export const visualAssetStatusSchema = z.enum([
  "draft",
  "approved",
  "rejected",
]);
export type VisualAssetStatus = z.infer<typeof visualAssetStatusSchema>;

export const sourceSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  illustrationUrl: z.url().nullable(),
  createdAt: z.iso.datetime(),
});
export type Source = z.infer<typeof sourceSchema>;

export const sourceCategorySchema = z.object({
  id: z.uuid(),
  sourceId: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  position: z.number().int(),
});
export type SourceCategory = z.infer<typeof sourceCategorySchema>;

export const recipeSchema = z.object({
  id: z.uuid(),
  sourceId: z.uuid(),
  sourceCategoryId: z.uuid().nullable(),
  title: z.string().min(1),
  slug: z.string().min(1),
  additionalInformation: z.string().nullable(),
  originalDocumentUrl: z.url().nullable(),
  photoUrl: z.url().nullable(),
  illustrationUrl: z.url().nullable(),
  importStatus: importStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Recipe = z.infer<typeof recipeSchema>;

export const recipeSectionSchema = z.object({
  id: z.uuid(),
  recipeId: z.uuid(),
  name: z.string().nullable(),
  position: z.number().int(),
  originalText: z.string().nullable(),
});
export type RecipeSection = z.infer<typeof recipeSectionSchema>;

export const recipeIngredientSchema = z.object({
  id: z.uuid(),
  recipeSectionId: z.uuid(),
  originalName: z.string().min(1),
  canonicalIngredientId: z.uuid().nullable(),
  originalQuantityText: z.string().nullable(),
  /** Décimal en chaîne, jamais `number`. `null` si non fiable (`QS`, illisible…). */
  quantityDecimal: z.string().regex(/^\d+(\.\d+)?$/).nullable(),
  unit: z.string().nullable(),
  position: z.number().int(),
  verificationStatus: verificationStatusSchema,
  confidence: z.number().min(0).max(1).nullable(),
});
export type RecipeIngredient = z.infer<typeof recipeIngredientSchema>;

/**
 * Tri-état de classification allergène : `true` (présence certaine), `false`
 * (absence certaine / version explicitement compatible), `unknown`
 * (information insuffisante). Volontairement pas un booléen JS pour éviter
 * toute confusion `null`/`false`.
 */
export const tristateSchema = z.enum(["true", "false", "unknown"]);
export type Tristate = z.infer<typeof tristateSchema>;

export const canonicalIngredientSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.uuid().nullable(),
  /**
   * Source de vérité unique par matière première canonique — ne pas
   * disperser de recherche par mots-clés ailleurs dans le code applicatif.
   * Un alias (`ingredient_aliases`) hérite toujours de cette classification
   * via son `canonicalIngredientId`, sans colonne dupliquée.
   */
  containsGluten: tristateSchema,
  containsLactose: tristateSchema,
  containsTreeNuts: tristateSchema,
});
export type CanonicalIngredient = z.infer<typeof canonicalIngredientSchema>;

export const recipeKeyIngredientSchema = z.object({
  recipeId: z.uuid(),
  canonicalIngredientId: z.uuid(),
  position: z.number().int(),
});
export type RecipeKeyIngredient = z.infer<typeof recipeKeyIngredientSchema>;

/**
 * Premier jet : matière première principale (tag de recherche gustatif)
 * proposée pendant l'import — 3 à 6 par recette (fruits, agrumes,
 * chocolats, pralinés, cafés, vanilles, épices, alcools, caramels, thés,
 * herbes aromatiques...), distincte de `recipeIngredientSchema` (qui couvre
 * CHAQUE ligne d'ingrédient d'une préparation, farine/beurre/œufs compris).
 * Structure minimale seulement — `ai-import-agent` étend ce schéma pour ses
 * besoins d'extraction dans `src/lib/import/schema.ts`.
 */
export const proposedKeyIngredientTagSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), canonicalIngredientId: z.uuid(), name: z.string().min(1) }),
  z.object({ kind: z.literal("new"), name: z.string().min(1), slug: z.string().min(1) }),
]);
export type ProposedKeyIngredientTag = z.infer<typeof proposedKeyIngredientTagSchema>;

export const ingredientAliasSchema = z.object({
  id: z.uuid(),
  canonicalIngredientId: z.uuid(),
  alias: z.string().min(1),
  normalizedAlias: z.string().min(1),
  status: z.enum(["confirmed", "proposed"]),
});
export type IngredientAlias = z.infer<typeof ingredientAliasSchema>;

export const specificitySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type Specificity = z.infer<typeof specificitySchema>;

export const recipeSpecificitySchema = z.object({
  recipeId: z.uuid(),
  specificityId: z.uuid(),
  status: specificityStatusSchema,
  reason: z.string().nullable(),
  source: specificitySourceSchema,
});
export type RecipeSpecificity = z.infer<typeof recipeSpecificitySchema>;

export const allergenSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
});
export type Allergen = z.infer<typeof allergenSchema>;

export const ingredientAllergenSchema = z.object({
  canonicalIngredientId: z.uuid(),
  allergenId: z.uuid(),
  status: verificationStatusSchema,
});
export type IngredientAllergen = z.infer<typeof ingredientAllergenSchema>;

/** Vue/dérivé calculé — jamais de trace ou contamination croisée déduite. */
export const recipeAllergenSchema = z.object({
  recipeId: z.uuid(),
  allergenId: z.uuid(),
  status: verificationStatusSchema,
});
export type RecipeAllergen = z.infer<typeof recipeAllergenSchema>;

export const importBatchSchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "processing", "needs_review", "done", "error"]),
  createdAt: z.iso.datetime(),
});
export type ImportBatch = z.infer<typeof importBatchSchema>;

export const importItemSchema = z.object({
  id: z.uuid(),
  importBatchId: z.uuid(),
  /**
   * URL du fichier source une fois réellement stocké. `null`/absent tant
   * qu'aucun fichier n'a été enregistré — ce qui est le cas normal pour la
   * saisie manuelle (texte collé, aucun fichier) et pour tout import avant
   * que la persistance réelle du fichier (pas encore câblée) n'ait eu lieu.
   * Ne devient obligatoire qu'au moment de cette persistance réelle, jamais
   * avant. Ne jamais y placer une URL fictive pour satisfaire ce schéma.
   */
  sourceFileUrl: z.url().nullable().optional(),
  /** Nom de fichier local ou identifiant temporaire choisi avant tout enregistrement réel — distinct de `sourceFileUrl`, jamais confondu avec lui. */
  sourceFileName: z.string().min(1).nullable().optional(),
  /**
   * SHA-256 hex minuscule du fichier source une fois uploadé (calculé sur les
   * octets du fichier, jamais sur le texte extrait) — sert uniquement à
   * repérer un fichier identique déjà importé (K4), ne remplace jamais
   * `sourceFileUrl`. Nullable/absent tant qu'aucun fichier réel n'est associé.
   */
  sourceFileHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/)
    .nullable()
    .optional(),
  status: z.enum(["pending", "processing", "needs_review", "done", "error"]),
  rawExtraction: z.unknown().nullable(),
  proposedRecipe: z.unknown().nullable(),
  errors: z.array(z.string()),
  recipeId: z.uuid().nullable(),
});
export type ImportItem = z.infer<typeof importItemSchema>;

/**
 * Bibliothèque unifiée des visuels IA (matière première, recette, entreprise,
 * catégorie) — propriété de data-security-agent (structure), ai-visuals-agent
 * (génération). Un seul visuel `approved` peut être `isPrimary` par objet.
 */
export const visualAssetSchema = z.object({
  id: z.uuid(),
  subjectType: z.enum(["ingredient", "recipe", "source", "sourceCategory"]),
  subjectId: z.uuid(),
  status: visualAssetStatusSchema,
  isPrimary: z.boolean(),
  imageUrl: z.url(),
  sourcePhotoUrl: z.url().nullable(),
  prompt: z.string().min(1),
  presetVersion: z.string().min(1),
  createdAt: z.iso.datetime(),
});
export type VisualAsset = z.infer<typeof visualAssetSchema>;
