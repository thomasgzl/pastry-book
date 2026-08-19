import { z } from "zod";
import {
  specificitySourceSchema,
  specificityStatusSchema,
  verificationStatusSchema,
} from "@/lib/domain/schemas";

/**
 * Modèle d'import (D2) — schéma Zod local au parcours `/importer`, distinct
 * de `src/lib/domain/schemas.ts` (gelé, lecture seule). Concrétise ce que le
 * contrat gelé laisse `unknown` dans `ImportItem.proposedRecipe`.
 *
 * Règle absolue (CLAUDE.md, principes 3/4/7) : un champ incertain reste vide
 * ou `"À vérifier"`, jamais une valeur inventée. `QS` est une valeur de
 * quantité valide en soi, conservée telle quelle, jamais convertie. Le
 * libellé original d'un ingrédient reste toujours séparé de la proposition
 * d'ingrédient canonique (jamais fusionnés dans le même champ). Une
 * préparation (`ImportSectionDraft`) n'existe qu'à l'intérieur d'une seule
 * recette de brouillon — aucune table de préparations partagées.
 */

/** Version du schéma d'import — à journaliser à chaque enregistrement (règle CLAUDE.md « journaliser… la version du schéma »). */
export const IMPORT_SCHEMA_VERSION = "1";

/** Placeholder explicite pour un titre illisible/absent — jamais une chaîne inventée à sa place. */
export const TITLE_PLACEHOLDER = "À vérifier";

const DECIMAL_STRING_PATTERN = /^\d+(\.\d+)?$/;

/** Chaîne facultative : `null`/absent/blanc après recadrage deviennent uniformément `null`, jamais `""` stocké. */
function optionalText() {
  return z
    .string()
    .nullable()
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    });
}

export const importIngredientDraftSchema = z.object({
  /** Identifiant local au brouillon (pas un UUID base — généré côté client, ex. `crypto.randomUUID()`). */
  id: z.string().min(1),
  /** Libellé exactement tel qu'écrit dans la source — jamais modifié par la normalisation. */
  originalName: z.string().min(1, "Le libellé original de l'ingrédient est obligatoire."),
  /** Proposition d'ingrédient canonique, TOUJOURS un champ séparé de `originalName` (jamais fusionnés). */
  canonicalIngredientId: z.uuid().nullable().default(null),
  /** Texte de quantité brut : nombre, fraction, `QS`, ou `null` si absent/illisible. Jamais reformaté ici. */
  originalQuantityText: optionalText(),
  /** Décimal fiable uniquement — `null` si `QS`, fraction, ou illisible (voir `deriveQuantity` dans `model.ts`). */
  quantityDecimal: z.string().regex(DECIMAL_STRING_PATTERN).nullable().default(null),
  unit: optionalText(),
  verificationStatus: verificationStatusSchema,
});
export type ImportIngredientDraft = z.infer<typeof importIngredientDraftSchema>;

export const importSectionDraftSchema = z.object({
  id: z.string().min(1),
  /** `null` → liste d'ingrédients simple, sans préparation nommée (ex. recette CAP minimale). */
  name: optionalText(),
  /** Texte source brut conservé si collé/scanné, indépendant des champs structurés ci-dessous. */
  originalText: optionalText(),
  ingredients: z.array(importIngredientDraftSchema).min(1, "Au moins un ingrédient est requis par préparation."),
});
export type ImportSectionDraft = z.infer<typeof importSectionDraftSchema>;

export const importSpecificityDraftSchema = z.object({
  specificityId: z.uuid(),
  status: specificityStatusSchema,
  reason: optionalText(),
  source: specificitySourceSchema,
});
export type ImportSpecificityDraft = z.infer<typeof importSpecificityDraftSchema>;

export const importAllergenDraftSchema = z.object({
  allergenId: z.uuid(),
  status: verificationStatusSchema,
});
export type ImportAllergenDraft = z.infer<typeof importAllergenDraftSchema>;

/** Métadonnées du fichier d'origine, éventuellement archivé réellement (I6). */
export const importFileRefSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  /**
   * Chemin Storage réel une fois le fichier archivé dans `recipe-sources`
   * (I6, upload direct navigateur → bucket privé) — jamais une URL fictive.
   * `null` tant que l'archivage n'a pas réussi : mode démonstration sans
   * Supabase configuré, échec réseau, ou aucun fichier réel encore attaché
   * (texte collé, saisie manuelle). Distinct d'une URL publique : le bucket
   * est privé, ce chemin nécessite une URL signée pour être consulté.
   */
  sourceFileUrl: z.string().nullable().optional().default(null),
});
export type ImportFileRef = z.infer<typeof importFileRefSchema>;

export const importRecipeDraftSchema = z.object({
  /** Identifiant local, stable pour toute la session d'édition (sert à la ré-soumission idempotente, voir `store.ts`). */
  id: z.string().min(1),
  /** Peut valoir littéralement `TITLE_PLACEHOLDER` si illisible — jamais une autre chaîne inventée. */
  title: z.string().min(1, "Le titre est obligatoire (ou « À vérifier » si illisible)."),
  sourceId: z.uuid(),
  /** Catégorie locale à `sourceId` — facultative, jamais partagée entre entreprises. */
  sourceCategoryId: z.uuid().nullable().default(null),
  procedure: optionalText(),
  temperature: optionalText(),
  additionalInformation: optionalText(),
  sections: z.array(importSectionDraftSchema).min(1, "Au moins une préparation (ou liste d'ingrédients) est requise."),
  specificities: z.array(importSpecificityDraftSchema).default([]),
  allergens: z.array(importAllergenDraftSchema).default([]),
  originalFiles: z.array(importFileRefSchema).default([]),
  /** Texte collé directement (étape 3), conservé tel quel pour traçabilité — jamais réécrit. */
  pastedText: optionalText(),
  /** Avertissements portés par l'extraction (D3) ou ajoutés manuellement — jamais silencieux. */
  warnings: z.array(z.string()).default([]),
});
export type ImportRecipeDraft = z.infer<typeof importRecipeDraftSchema>;

/** Concatène procédé/température/informations complémentaires en un seul champ, pour correspondre au contrat gelé `recipeSchema.additionalInformation` (seul champ disponible côté domaine). `null` si les trois sont vides — jamais une section vide affichée. */
export function combineAdditionalInformation(draft: Pick<ImportRecipeDraft, "procedure" | "temperature" | "additionalInformation">): string | null {
  const parts: string[] = [];
  if (draft.procedure) parts.push(`Procédé : ${draft.procedure}`);
  if (draft.temperature) parts.push(`Température : ${draft.temperature}`);
  if (draft.additionalInformation) parts.push(draft.additionalInformation);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

/**
 * Inverse de `combineAdditionalInformation` — utilisé par la modification
 * manuelle d'une recette déjà enregistrée pour repeupler les trois champs
 * séparés du formulaire à partir du seul champ combiné stocké en base.
 * Round-trip stable avec `combineAdditionalInformation` tant que le texte
 * combiné n'a pas été modifié ailleurs (ex. directement en base) : dans ce
 * cas plus rare, tout le texte retombe dans `additionalInformation`, jamais
 * perdu ni deviné.
 * ponytail: repère les préfixes seulement à leur première occurrence, pas de
 * vrai parseur — un paragraphe d'information complémentaire qui commencerait
 * lui-même par « Procédé : » ou « Température : » serait mal reclassé ; à
 * durcir si ce cas réel se présente.
 */
export function splitAdditionalInformation(combined: string | null): {
  procedure: string | null;
  temperature: string | null;
  additionalInformation: string | null;
} {
  if (!combined) return { procedure: null, temperature: null, additionalInformation: null };

  const PROCEDURE_PREFIX = "Procédé : ";
  const TEMPERATURE_PREFIX = "Température : ";
  let procedure: string | null = null;
  let temperature: string | null = null;
  const rest: string[] = [];

  for (const part of combined.split("\n\n")) {
    if (procedure === null && part.startsWith(PROCEDURE_PREFIX)) {
      procedure = part.slice(PROCEDURE_PREFIX.length);
      continue;
    }
    if (temperature === null && part.startsWith(TEMPERATURE_PREFIX)) {
      temperature = part.slice(TEMPERATURE_PREFIX.length);
      continue;
    }
    rest.push(part);
  }

  return { procedure, temperature, additionalInformation: rest.length > 0 ? rest.join("\n\n") : null };
}
