/**
 * Adaptateur OpenAI réel pour l'extraction (F-IA1) — implémente `ImportAIProvider`
 * (voir `types.ts`) avec le SDK officiel `openai`, Responses API, Structured
 * Outputs contraints par un schéma Zod (revalidé côté serveur avant toute
 * confiance, jamais le JSON du modèle tel quel). Aucun appel n'est déclenché
 * par ce fichier lui-même — seule une invocation explicite de `extractText`
 * avec une vraie clé API le ferait.
 *
 * `proposeCanonicalIngredients` / `proposeAllergens` / `proposeSpecificities`
 * réutilisent les règles déterministes existantes (`rules.ts`), comme
 * l'adaptateur de démonstration : « règles déterministes d'abord »
 * (docs/05-AI_IMPORT.md). Aucun appel payant supplémentaire ici.
 * ponytail: router les cas ambigus (voir `ambiguousIngredientWarnings`) vers
 * un appel IA dédié est un vrai futur possible, mais hors du périmètre
 * testé/demandé pour F-IA1 (uniquement l'extraction) — à ouvrir en tâche
 * séparée si le besoin se confirme à l'usage.
 */

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { EasyInputMessage, ResponseInputImage, ResponseInputText } from "openai/resources/responses/responses";
import { z } from "zod";
import { beginAiRequest, completeAiRequest } from "@/lib/domain/aiCostGuard";
import { getSpecificities } from "@/lib/data/specificities";
import {
  proposeAllergensFromIngredients,
  proposeCanonicalIngredientsFromNames,
  proposeSpecificitiesFromIngredients,
} from "./rules";
import type {
  AllergenProposal,
  CanonicalIngredientProposal,
  ExtractOptions,
  ExtractSourceFile,
  ExtractedIngredient,
  ExtractionMethod,
  ImportAIProvider,
  RawExtractionResult,
  SpecificityProposal,
} from "./types";

/** Modèle par défaut si `OPENAI_EXTRACTION_MODEL` est absent — définie UNE SEULE FOIS ici, jamais recopiée ailleurs. */
const OPENAI_EXTRACTION_MODEL_DEFAULT = "gpt-5-mini";

function getExtractionModel(): string {
  return process.env.OPENAI_EXTRACTION_MODEL?.trim() || OPENAI_EXTRACTION_MODEL_DEFAULT;
}

// Limites explicites (docs/05-AI_IMPORT.md § Règles de sécurité et de coût) :
// une fiche recette tient largement dans ces bornes ; au-delà, on refuse
// plutôt que d'envoyer un contenu tronqué en silence.
const MAX_TEXT_CHARS = 20_000; // ~quelques pages de texte de recette dense
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 Mo — capture/scan unique, pas un document volumineux
const MAX_PDF_PAGES = 6; // une fiche recette tient rarement au-delà

/** Délai minimal entre deux appels d'extraction (garde de coût) — évite qu'un double-clic déclenche deux appels payants quasi simultanés. */
const MIN_DELAY_BETWEEN_CALLS_MS = 3_000;

const SECRET_PATTERN = /sk-[A-Za-z0-9_-]{10,}/g;

/** Ne jamais laisser une clé API apparaître dans un message d'erreur journalisé ou renvoyé à l'appelant. */
export function redactSecrets(message: string): string {
  return message.replace(SECRET_PATTERN, "[clé masquée]");
}

function describeCaughtError(error: unknown): string {
  const raw = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return redactSecrets(raw);
}

const SYSTEM_PROMPT = `Tu extrais le contenu structuré d'une fiche de recette de pâtisserie professionnelle, sans jamais inventer d'information.
Règles strictes :
- Ne complète jamais un champ absent ou illisible dans la source : renvoie null pour ce champ (titre, procédé, température, informations complémentaires, quantité ou unité d'un ingrédient).
- La quantité "QS" (quantité suffisante) reste le texte "QS" tel quel — ne la convertis jamais en nombre ni en null.
- N'invente jamais un procédé, une température ou une information complémentaire qui ne serait pas explicitement écrit dans le texte source.
- Ne déduis jamais qu'une recette est "vegan" ou "sans gluten" à partir de la seule absence d'un ingrédient contraire — tu n'as pas à le décider, laisse ce champ en dehors de ta réponse.
- Une seule recette par appel : si le texte semble contenir plusieurs recettes, extrait uniquement la première et signale les autres dans "warnings".
- Ajoute une entrée dans "warnings" pour chaque champ incertain, illisible ou ambigu, en langage clair et bref.
- Conserve l'ordre d'origine des préparations et des ingrédients.`;

const EXTRACTION_INSTRUCTIONS =
  "Extrait la recette ci-dessous selon les règles strictes définies dans les instructions système. Réponds uniquement avec la structure demandée.";

const extractedIngredientSchema = z.object({
  originalName: z.string().min(1),
  originalQuantityText: z.string().min(1).nullable(),
  unit: z.string().min(1).nullable(),
});

const extractedSectionSchema = z.object({
  name: z.string().min(1).nullable(),
  ingredients: z.array(extractedIngredientSchema),
});

/**
 * Schéma Zod du contrat Structured Outputs — envoyé à OpenAI (via
 * `zodTextFormat`) ET réutilisé pour revalider strictement la sortie une
 * fois reçue (jamais de confiance aveugle dans le JSON du modèle, même
 * garanti par Structured Outputs). Champs alignés sur les conventions déjà
 * définies dans `src/lib/domain/schemas.ts` (quantité en texte brut jamais
 * un nombre, champs incertains nullable plutôt qu'inventés).
 */
const modelExtractionSchema = z.object({
  title: z.string().min(1).nullable(),
  procedure: z.string().min(1).nullable(),
  temperature: z.string().min(1).nullable(),
  additionalInformation: z.string().min(1).nullable(),
  sections: z.array(extractedSectionSchema),
  warnings: z.array(z.string().min(1)),
});
type ModelExtraction = z.infer<typeof modelExtractionSchema>;

type ContentPart = ResponseInputText | ResponseInputImage;

type BuildContentResult =
  | { ok: true; method: ExtractionMethod; content: ContentPart[] }
  | { ok: false; reason: string };

/**
 * Décide texte local vs vision : le texte prioritaire n'est jamais envoyé en
 * vision (coût et fidélité — docs/05-AI_IMPORT.md). Refuse plutôt que de
 * tronquer silencieusement un contenu trop volumineux.
 */
function buildModelContent(file: ExtractSourceFile, options: ExtractOptions | undefined): BuildContentResult {
  const text = file.text?.trim();
  if (text) {
    if (text.length > MAX_TEXT_CHARS) {
      return {
        ok: false,
        reason: `Texte trop long (${text.length} caractères, limite ${MAX_TEXT_CHARS}) — le réduire avant l'extraction.`,
      };
    }
    return {
      ok: true,
      method: "local-text",
      content: [{ type: "input_text", text: `${EXTRACTION_INSTRUCTIONS}\n\n---\n${text}` }],
    };
  }

  const fileBase64 = file.fileBase64?.trim();
  if (fileBase64) {
    const approxBytes = Math.ceil((fileBase64.length * 3) / 4);
    if (approxBytes > MAX_FILE_SIZE_BYTES) {
      return {
        ok: false,
        reason: `Fichier trop volumineux (${Math.round(approxBytes / (1024 * 1024))} Mo, limite ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} Mo).`,
      };
    }
    if (file.pageCount && file.pageCount > MAX_PDF_PAGES) {
      return {
        ok: false,
        reason: `Document trop long (${file.pageCount} pages, limite ${MAX_PDF_PAGES}).`,
      };
    }
    return {
      ok: true,
      method: "ocr",
      content: [
        { type: "input_text", text: EXTRACTION_INSTRUCTIONS },
        {
          type: "input_image",
          image_url: `data:${file.type};base64,${fileBase64}`,
          detail: options?.documentDifficult ? "high" : "low",
        },
      ],
    };
  }

  return { ok: false, reason: "Aucun texte ni fichier exploitable fourni — saisie manuelle requise." };
}

/** État « extraction indisponible » explicite — jamais un crash, jamais une donnée inventée. Réutilise le canal `method: "manual"` déjà utilisé par l'adaptateur de démonstration pour le même cas. */
function manualFallback(reason: string): RawExtractionResult {
  return {
    method: "manual",
    title: null,
    procedure: null,
    temperature: null,
    additionalInformation: null,
    sections: [],
    warnings: [reason],
  };
}

/** Ajoute, de façon déterministe (jamais laissée au seul modèle), un avertissement pour chaque quantité illisible — base du statut `needs_review` calculé en aval par `deriveQuantity`. */
function withMissingQuantityWarnings(data: ModelExtraction): string[] {
  const warnings = [...data.warnings];
  for (const section of data.sections) {
    for (const ingredient of section.ingredients) {
      if (ingredient.originalQuantityText === null && !warnings.some((w) => w.includes(ingredient.originalName))) {
        warnings.push(
          `Quantité de « ${ingredient.originalName} » illisible ou absente dans la source — laissée « À vérifier », jamais estimée.`,
        );
      }
    }
  }
  return warnings;
}

function toRawExtractionResult(data: ModelExtraction, method: ExtractionMethod): RawExtractionResult {
  return {
    method,
    title: data.title,
    procedure: data.procedure,
    temperature: data.temperature,
    additionalInformation: data.additionalInformation,
    sections: data.sections,
    warnings: withMissingQuantityWarnings(data),
  };
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export const openaiImportProvider: ImportAIProvider = {
  name: "openai",

  async extractText(file: ExtractSourceFile, options?: ExtractOptions): Promise<RawExtractionResult> {
    const client = getClient();
    if (!client) {
      // Pas de clé : bascule propre, jamais une erreur bloquante (CLAUDE.md, mode démonstration obligatoire).
      return manualFallback("Extraction OpenAI indisponible : clé API absente côté serveur — saisie manuelle requise.");
    }

    const contentResult = buildModelContent(file, options);
    if (!contentResult.ok) {
      return manualFallback(contentResult.reason);
    }

    const requestId = options?.requestId ?? `extraction-${file.name}-${Date.now()}`;
    const guard = beginAiRequest(requestId, "extraction", { minDelayMs: MIN_DELAY_BETWEEN_CALLS_MS });
    if (!guard.ok) {
      // Jamais de relance automatique en boucle : on renvoie un état explicite, l'utilisatrice réessaiera elle-même.
      return manualFallback(`Appel d'extraction refusé par la garde de coût : ${guard.error.message}`);
    }

    try {
      const systemMessage: EasyInputMessage = { role: "system", content: SYSTEM_PROMPT };
      const userMessage: EasyInputMessage = { role: "user", content: contentResult.content };

      const response = await client.responses.parse({
        model: getExtractionModel(),
        input: [systemMessage, userMessage],
        text: { format: zodTextFormat(modelExtractionSchema, "recipe_extraction") },
      });

      const parsed = response.output_parsed;
      if (!parsed) {
        // Refus du modèle / contenu bloqué / sortie vide : état d'erreur explicite, jamais une donnée par défaut inventée.
        return manualFallback("Le modèle n'a produit aucune extraction exploitable (refus ou contenu bloqué).");
      }

      // Revalidation stricte côté serveur — ne jamais faire confiance au JSON du modèle tel quel, même avec Structured Outputs.
      const revalidated = modelExtractionSchema.safeParse(parsed);
      if (!revalidated.success) {
        return manualFallback(
          `Sortie du modèle invalide après revalidation stricte : ${revalidated.error.issues.map((issue) => issue.message).join("; ")}`,
        );
      }

      return toRawExtractionResult(revalidated.data, contentResult.method);
    } catch (error) {
      return manualFallback(`Appel OpenAI en échec : ${describeCaughtError(error)}`);
    } finally {
      completeAiRequest(requestId);
    }
  },

  async proposeCanonicalIngredients(ingredients: ExtractedIngredient[]): Promise<CanonicalIngredientProposal[]> {
    return proposeCanonicalIngredientsFromNames(ingredients);
  },

  async proposeAllergens(ingredients: ExtractedIngredient[]): Promise<AllergenProposal[]> {
    return proposeAllergensFromIngredients(ingredients);
  },

  async proposeSpecificities(ingredients: ExtractedIngredient[]): Promise<SpecificityProposal[]> {
    const availableSlugs = getSpecificities().map((specificity) => specificity.slug);
    return proposeSpecificitiesFromIngredients(ingredients, availableSlugs);
  },
};
