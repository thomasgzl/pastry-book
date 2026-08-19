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
import { detectDuplicateSections, reconcileCompleteness } from "./completeness";
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
  ExtractSourceInput,
  ExtractedIngredient,
  ExtractionCompleteness,
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

/**
 * Correction lot G : la formulation précédente (« une seule recette par
 * appel : si le texte semble contenir plusieurs recettes, extrait
 * uniquement la première ») confondait « plusieurs recettes distinctes »
 * avec « plusieurs préparations d'UNE MÊME recette » — cause probable de
 * l'extraction tronquée à « Riz au lait » sur les 4 préparations attendues
 * (Riz au lait / Caramel / Opaline / Sorbet au lait). Les définitions
 * ci-dessous lèvent explicitement cette ambiguïté.
 */
const SYSTEM_PROMPT = `Tu extrais le contenu structuré d'une fiche de recette de pâtisserie professionnelle, sans jamais inventer d'information.

Définitions strictes (ambiguïté fréquente à ne jamais commettre) :
- Une "recette" est LE plat/dessert final documenté par le(s) fichier(s) fournis (ex. « Riz au lait Vanille Caramel »).
- Une "préparation" (une entrée de "sections") est un SOUS-ENSEMBLE de cette même recette : un titre ou intertitre suivi de ses propres ingrédients (ex. « Riz au lait », « Caramel », « Opaline », « Sorbet au lait » sont 4 préparations D'UNE SEULE recette — jamais 4 recettes distinctes, même si chacune a son propre titre et sa propre liste d'ingrédients).
- « Plusieurs recettes » ne s'applique qu'à un document qui documente réellement des plats sans rapport entre eux (ex. plusieurs desserts indépendants dans un même classeur) — jamais aux préparations d'un même dessert.

Règles strictes :
- Repère TOUS les titres et intertitres visibles dans le document, dans l'ordre où ils apparaissent, et crée une entrée "sections" DISTINCTE pour chacun. Ne t'arrête jamais après le premier bloc identifié.
- Ne fusionne jamais deux préparations différentes dans la même section, même si leurs ingrédients se ressemblent.
- Ne complète jamais un champ absent ou illisible dans la source : renvoie null pour ce champ (titre, procédé, température, informations complémentaires, quantité ou unité d'un ingrédient).
- Si une préparation a son propre procédé écrit séparément dans la source, place-le dans "procedureText" de CETTE section — jamais fusionné avec le procédé global de la recette, jamais recopié dans une autre préparation.
- La quantité "QS" (quantité suffisante) reste le texte "QS" tel quel — ne la convertis jamais en nombre ni en null.
- N'invente jamais un procédé, une température ou une information complémentaire qui ne serait pas explicitement écrit dans le texte source.
- Ne déduis jamais qu'une recette est "vegan" ou "sans gluten" à partir de la seule absence d'un ingrédient contraire — tu n'as pas à le décider, laisse ce champ en dehors de ta réponse.
- Si plusieurs fichiers/pages sont fournis, ce sont des captures successives d'UNE SEULE recette : regroupe-les dans l'ordre fourni. Si deux pages semblent montrer la même préparation (chevauchement de capture), n'en extrais qu'une seule occurrence et signale-le dans "warnings".
- Une seule recette véritablement distincte par appel (voir définitions ci-dessus) : si le document semble documenter plusieurs plats sans rapport, extrait uniquement le premier et signale les autres dans "warnings" — jamais pour des préparations d'un même plat.
- Ajoute une entrée dans "warnings" pour chaque champ incertain, illisible ou ambigu, en langage clair et bref.
- Conserve l'ordre d'origine des préparations et des ingrédients.

Contrôle de complétude — obligatoire à chaque réponse, jamais optionnel :
- "detectedPreparationTitles" : TOUS les titres/intertitres repérés dans le document, même ceux que tu n'as pas pu extraire entièrement.
- "extractedPreparationTitles" : les titres pour lesquels tu as effectivement produit une entrée dans "sections" — même ordre, même nombre que "sections".
- "completenessStatus" : "complete" SEULEMENT si "detectedPreparationTitles" et "extractedPreparationTitles" contiennent exactement les mêmes titres, dans le même nombre, et que le document ne semble pas coupé/tronqué. "possibly_incomplete" en cas de doute (ex. bas de page qui semble manquant). "needs_review" si tu sais qu'au moins un titre détecté n'a pas été extrait.
- "missingOrUnclearSections" : titres détectés mais non extraits, ou zones illisibles empêchant une extraction complète — tableau vide si aucun.
Ne déclare jamais "complete" uniquement parce que la structure JSON est valide : ce champ reflète la complétude RÉELLE par rapport au document, pas la validité du format.

Matières premières principales — "proposedKeyIngredientNames", obligatoire à chaque réponse (tableau vide si aucune) :
- Sélectionne UNIQUEMENT les ingrédients qui définissent l'identité gustative de la recette : fruits, agrumes, fruits à coque, chocolats, pralinés, cafés, vanilles, épices, alcools, caramels, thés, herbes aromatiques, ou tout autre ingrédient à identité gustative claire.
- Ignore TOUJOURS farine, beurre, œufs, lait, crème, sucre, glucose, sel, huiles neutres, levures, gélifiants, épaississants, stabilisants, poudres à lever, eau — sauf si l'un de ces ingrédients constitue EXCEPTIONNELLEMENT la saveur principale affichée de la recette (rarissime).
- Un ingrédient présent en quantité minime ou purement technique (texture, conservation) ne devient jamais un tag.
- Entre 0 et 6 tags, idéalement 3 à 6 quand assez d'ingrédients gustatifs pertinents existent réellement dans la recette. Ne complète JAMAIS artificiellement jusqu'à 3 : 0, 1 ou 2 tags sont des réponses valides si la recette n'a pas assez d'ingrédients gustatifs distincts.
- Règle chocolat : regroupe TOUJOURS "chocolat" seul, "chocolat 55/64/70 %" (ou toute autre teneur, sans mention de lait), "couverture" suivi seulement d'un pourcentage, et "chocolat noir" vers le même tag "Chocolat noir". "chocolat au lait" devient "Chocolat au lait". "chocolat blanc" devient "Chocolat blanc". "Dulcey" ou "chocolat blond" devient "Chocolat blond Dulcey". Ne regroupe JAMAIS si une variante est explicitement nommée (ex. "chocolat noisette", "chocolat praliné" restent des tags distincts, jamais fondus dans "Chocolat noir").
- Normalise chaque nom de tag avant de le renvoyer : ignore casse/accents/singulier-pluriel simple/variations typographiques, retire les préfixes "jus de", "zeste de", "purée de", "poudre de", "pâte de" quand ils désignent le même ingrédient principal (ex. "jus de citron"/"zeste de citron"/"purée de citron" → "Citron" ; "gousse de vanille"/"vanille liquide"/"poudre de vanille" → "Vanille" ; "café soluble"/"extrait de café"/"grains de café" → "Café" ; "pâte de pistache"/"pistaches torréfiées" → "Pistache"). Cette normalisation ne s'applique QU'au nom du tag renvoyé ici, jamais au libellé original d'un ingrédient dans "sections".
- N'invente jamais un ingrédient qui n'est pas explicitement dans la recette.`;

const EXTRACTION_INSTRUCTIONS =
  "Extrait la recette ci-dessous selon les règles strictes définies dans les instructions système. Réponds uniquement avec la structure demandée.";

const MULTI_FILE_INSTRUCTIONS =
  "Les fichiers suivants sont des pages/captures successives d'UNE SEULE recette, à regrouper dans l'ordre fourni.";

const extractedIngredientSchema = z.object({
  originalName: z.string().min(1),
  originalQuantityText: z.string().min(1).nullable(),
  unit: z.string().min(1).nullable(),
});

const extractedSectionSchema = z.object({
  name: z.string().min(1).nullable(),
  /** Procédé propre à cette préparation — `null` s'il n'existe pas dans la source (correction lot G). Requis (jamais `.optional()`, voir note sur `modelExtractionSchema`). */
  procedureText: z.string().min(1).nullable(),
  ingredients: z.array(extractedIngredientSchema),
});

const completenessStatusSchema = z.enum(["complete", "possibly_incomplete", "needs_review"]);

/**
 * Schéma Zod du contrat Structured Outputs — envoyé à OpenAI (via
 * `zodTextFormat`) ET réutilisé pour revalider strictement la sortie une
 * fois reçue (jamais de confiance aveugle dans le JSON du modèle, même
 * garanti par Structured Outputs). Champs alignés sur les conventions déjà
 * définies dans `src/lib/domain/schemas.ts` (quantité en texte brut jamais
 * un nombre, champs incertains nullable plutôt qu'inventés).
 *
 * Champs de complétude REQUIS (jamais `.optional()` : OpenAI Structured
 * Outputs strict mode exige que toute propriété du schéma soit listée dans
 * `required` — un `.optional()` fait échouer `zodTextFormat` à l'appel,
 * jamais un rejet silencieux gracieux). Le prompt exige explicitement ces
 * champs à chaque réponse ; `reconcileCompleteness` reste défensif malgré
 * tout (voir `completeness.ts`) au cas où une réponse plus ancienne/hors
 * contrat les omettrait quand même après revalidation côté client.
 */
const modelExtractionSchema = z.object({
  title: z.string().min(1).nullable(),
  procedure: z.string().min(1).nullable(),
  temperature: z.string().min(1).nullable(),
  additionalInformation: z.string().min(1).nullable(),
  sections: z.array(extractedSectionSchema),
  warnings: z.array(z.string().min(1)),
  detectedPreparationTitles: z.array(z.string().min(1)),
  extractedPreparationTitles: z.array(z.string().min(1)),
  completenessStatus: completenessStatusSchema,
  missingOrUnclearSections: z.array(z.string().min(1)),
  /** Noms bruts (pas encore résolus vers un identifiant canonique) — voir `RawExtractionResult.proposedKeyIngredientNames`. Requis (jamais `.optional()`, même raison que les champs de complétude ci-dessus) ; tableau vide accepté et attendu quand aucun ingrédient gustatif pertinent n'existe. */
  proposedKeyIngredientNames: z.array(z.string().min(1)),
});
type ModelExtraction = z.infer<typeof modelExtractionSchema>;

type ContentPart = ResponseInputText | ResponseInputImage;

type BuildContentResult =
  | { ok: true; method: ExtractionMethod; content: ContentPart[] }
  | { ok: false; reason: string };

/**
 * Décide texte local vs vision par fichier : le texte prioritaire n'est
 * jamais envoyé en vision (coût et fidélité — docs/05-AI_IMPORT.md). Refuse
 * plutôt que de tronquer silencieusement un contenu trop volumineux.
 *
 * Accepte PLUSIEURS fichiers (correction lot G — recette répartie sur
 * plusieurs captures Quantara) : regroupés dans UN SEUL message, dans
 * l'ordre fourni, jamais un appel par fichier.
 */
function buildModelContent(files: ExtractSourceFile[], options: ExtractOptions | undefined): BuildContentResult {
  const intro = files.length > 1 ? `${EXTRACTION_INSTRUCTIONS}\n\n${MULTI_FILE_INSTRUCTIONS}` : EXTRACTION_INSTRUCTIONS;
  const content: ContentPart[] = [{ type: "input_text", text: intro }];
  let usedVision = false;

  for (const [index, file] of files.entries()) {
    const label = files.length > 1 ? ` (page ${index + 1}/${files.length}, ${file.name})` : "";

    const text = file.text?.trim();
    if (text) {
      if (text.length > MAX_TEXT_CHARS) {
        return {
          ok: false,
          reason: `Texte trop long${label} (${text.length} caractères, limite ${MAX_TEXT_CHARS}) — le réduire avant l'extraction.`,
        };
      }
      content.push({ type: "input_text", text: `---${label}\n${text}` });
      continue;
    }

    const fileBase64 = file.fileBase64?.trim();
    if (fileBase64) {
      const approxBytes = Math.ceil((fileBase64.length * 3) / 4);
      if (approxBytes > MAX_FILE_SIZE_BYTES) {
        return {
          ok: false,
          reason: `Fichier trop volumineux${label} (${Math.round(approxBytes / (1024 * 1024))} Mo, limite ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} Mo).`,
        };
      }
      if (file.pageCount && file.pageCount > MAX_PDF_PAGES) {
        return { ok: false, reason: `Document trop long${label} (${file.pageCount} pages, limite ${MAX_PDF_PAGES}).` };
      }
      content.push({
        type: "input_image",
        image_url: `data:${file.type};base64,${fileBase64}`,
        detail: options?.documentDifficult ? "high" : "low",
      });
      usedVision = true;
      continue;
    }

    return { ok: false, reason: `Aucun texte ni fichier exploitable fourni${label} — saisie manuelle requise.` };
  }

  return { ok: true, method: usedVision ? "ocr" : "local-text", content };
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

function toRawExtractionResult(
  data: ModelExtraction,
  method: ExtractionMethod,
  completeness: ExtractionCompleteness,
  extraWarnings: string[],
): RawExtractionResult {
  return {
    method,
    title: data.title,
    procedure: data.procedure,
    temperature: data.temperature,
    additionalInformation: data.additionalInformation,
    sections: data.sections,
    warnings: [...withMissingQuantityWarnings(data), ...extraWarnings],
    completeness,
    proposedKeyIngredientNames: data.proposedKeyIngredientNames,
  };
}

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

export const openaiImportProvider: ImportAIProvider = {
  name: "openai",

  async extractText(files: ExtractSourceInput, options?: ExtractOptions): Promise<RawExtractionResult> {
    const fileList = Array.isArray(files) ? files : [files];

    const client = getClient();
    if (!client) {
      // Pas de clé : bascule propre, jamais une erreur bloquante (CLAUDE.md, mode démonstration obligatoire).
      return manualFallback("Extraction OpenAI indisponible : clé API absente côté serveur — saisie manuelle requise.");
    }

    const contentResult = buildModelContent(fileList, options);
    if (!contentResult.ok) {
      return manualFallback(contentResult.reason);
    }

    const requestId = options?.requestId ?? `extraction-${fileList.map((f) => f.name).join("+")}-${Date.now()}`;
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

      const completeness = reconcileCompleteness({
        sections: revalidated.data.sections,
        detectedPreparationTitles: revalidated.data.detectedPreparationTitles,
        extractedPreparationTitles: revalidated.data.extractedPreparationTitles,
        completenessStatus: revalidated.data.completenessStatus,
        missingOrUnclearSections: revalidated.data.missingOrUnclearSections,
      });
      const duplicateWarnings = detectDuplicateSections(revalidated.data.sections);

      return toRawExtractionResult(revalidated.data, contentResult.method, completeness, duplicateWarnings);
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
    const availableSlugs = (await getSpecificities()).map((specificity) => specificity.slug);
    return proposeSpecificitiesFromIngredients(ingredients, availableSlugs);
  },
};
