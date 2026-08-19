/**
 * Pont D3 → D2 : transforme la sortie du port d'extraction (`ImportAIProvider`)
 * en un brouillon partiel exploitable par le formulaire `/importer`
 * (`ImportRecipeDraft`, moins `sourceId`/`sourceCategoryId` — choisis par la
 * personne aux étapes 1/2 du parcours, jamais déduits par l'IA). Résout les
 * propositions canoniques/allergènes/spécificités vers de vrais identifiants
 * du référentiel de démonstration ; toute proposition sans correspondance
 * est simplement omise, jamais inventée.
 */

import { getAllergens, getSpecificities } from "@/lib/data/specificities";
import { getCanonicalIngredients, getIngredientAliases } from "@/lib/data/canonical-ingredients";
import type {
  ImportAllergenDraft,
  ImportFileRef,
  ImportIngredientDraft,
  ImportSectionDraft,
  ImportSpecificityDraft,
} from "@/lib/import/schema";
import { deriveQuantity } from "@/lib/import/model";
import {
  evaluateRecipeSpecificities,
  isValidatedSpecificitySlug,
  VALIDATED_SPECIFICITY_SLUGS,
} from "@/lib/import/specificityValidation";
import type { ProposedKeyIngredientTag, Specificity } from "@/lib/domain/schemas";
import { demoImportProvider } from "./demoProvider";
import { ambiguousIngredientWarnings, resolveKeyIngredientTags } from "./rules";
import { DEMO_FIXTURES, type DemoFixture, type DemoFixtureId } from "./fixtures";
import type {
  ExtractedIngredient,
  ExtractedSection,
  ExtractionCompleteness,
  ExtractionMethod,
  ExtractOptions,
  ExtractSourceInput,
  ImportAIProvider,
} from "./types";

export interface DemoExtractionDraft {
  /** Méthode ayant réellement produit ce brouillon — `"manual"` signale un échec/repli (clé absente, contenu illisible, refus du modèle…), jamais une extraction réussie. L'appelant (Server Action `/importer`) doit vérifier ce champ avant d'appliquer le brouillon : `buildImportDraft` ne lève jamais d'exception pour un échec d'extraction connu, il retourne toujours un brouillon exploitable (sections vides), ce champ est le seul signal fiable de succès/échec. */
  method: ExtractionMethod;
  title: string;
  procedure: string | null;
  temperature: string | null;
  additionalInformation: string | null;
  sections: ImportSectionDraft[];
  specificities: ImportSpecificityDraft[];
  allergens: ImportAllergenDraft[];
  /** Matières premières principales déjà dédoublonnées contre le référentiel (F-KEY1) — voir `resolveKeyIngredientTags`. */
  proposedKeyIngredients: ProposedKeyIngredientTag[];
  originalFiles: ImportFileRef[];
  warnings: string[];
  /**
   * Contrôle de complétude (lot G) — méta-donnée d'IMPORT uniquement,
   * jamais reprise dans `ImportRecipeDraft` (voir `ImporterWizard.applyExtractedDraft`,
   * qui ne copie que les champs de contenu réel de la recette).
   */
  completeness: ExtractionCompleteness;
}

let localIdCounter = 0;
function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
}

async function buildIngredientDraft(
  ingredient: ExtractedIngredient,
  canonicalSlug: string | null,
): Promise<ImportIngredientDraft> {
  const canonical = canonicalSlug
    ? (await getCanonicalIngredients()).find((c) => c.slug === canonicalSlug)
    : undefined;
  const { quantityDecimal, verificationStatus } = deriveQuantity(ingredient.originalQuantityText);
  return {
    id: nextLocalId("ing"),
    originalName: ingredient.originalName,
    canonicalIngredientId: canonical?.id ?? null,
    originalQuantityText: ingredient.originalQuantityText,
    quantityDecimal,
    unit: ingredient.unit,
    verificationStatus,
  };
}

async function buildSectionDraft(provider: ImportAIProvider, section: ExtractedSection): Promise<ImportSectionDraft> {
  const canonicalProposals = await provider.proposeCanonicalIngredients(section.ingredients);
  const canonicalBySlug = new Map(canonicalProposals.map((p) => [p.originalName, p.canonicalIngredientSlug]));
  return {
    id: nextLocalId("sec"),
    name: section.name,
    // Procédé propre à CETTE préparation quand la source en fournit un séparément (correction lot G) — jamais partagé avec les autres préparations.
    originalText: section.procedureText ?? null,
    ingredients: await Promise.all(
      section.ingredients.map((ingredient) =>
        buildIngredientDraft(ingredient, canonicalBySlug.get(ingredient.originalName) ?? null),
      ),
    ),
  };
}

/**
 * Traduit l'évaluation déterministe (`evaluateRecipeSpecificities`) en
 * propositions d'import pour les 3 spécificités contrôlées — jamais
 * `confirmed` (seule une action humaine explicite confirme, CLAUDE.md
 * principe 8) : `incompatible` n'est même pas proposée (rien à confirmer,
 * l'incompatibilité est certaine) ; `needs_review`/`unverified` restent
 * `proposed`, avec la raison réellement calculée (jamais le texte générique
 * de l'ancienne règle par mot-clé pour ces 3 slugs).
 */
function buildControlledSpecificityDrafts(
  evaluation: ReturnType<typeof evaluateRecipeSpecificities>,
  specificityBySlug: Map<string, Specificity>,
): ImportSpecificityDraft[] {
  const drafts: ImportSpecificityDraft[] = [];
  for (const slug of Object.values(VALIDATED_SPECIFICITY_SLUGS)) {
    const specificity = specificityBySlug.get(slug);
    if (!specificity) continue; // spécificité non disponible dans ce référentiel — rien à proposer
    const result = evaluation[slug];
    if (result.state === "incompatible") continue;
    drafts.push({
      specificityId: specificity.id,
      status: "proposed",
      reason:
        result.state === "needs_review"
          ? result.message
          : "Aucun ingrédient incompatible identifié dans la liste — liste possiblement incomplète, à vérifier.",
      source: "rule",
    });
  }
  return drafts;
}

/** Défaut déterministe quand le fournisseur ne calcule pas de contrôle de complétude (démonstration, repli manuel) — toutes les préparations produites sont par construction celles attendues. */
function defaultCompleteness(sections: ImportSectionDraft[]): ExtractionCompleteness {
  const titles = sections.map((section, index) => section.name ?? `Préparation ${index + 1}`);
  return { detectedPreparationTitles: titles, extractedPreparationTitles: titles, status: "complete", missingOrUnclearSections: [] };
}

/**
 * Pipeline d'extraction générique (D3), indépendant du fournisseur —
 * consommé par `runDemoExtraction` (démonstration) ET par le pilote réel
 * (G2, `/importer` server action) derrière le même port `ImportAIProvider`.
 * Construit un brouillon de recette pré-rempli, entièrement corrigible
 * ensuite dans le formulaire — jamais enregistré directement.
 */
export async function buildImportDraft(
  provider: ImportAIProvider,
  files: ExtractSourceInput,
  options?: ExtractOptions,
): Promise<DemoExtractionDraft> {
  const fileList = Array.isArray(files) ? files : [files];
  const raw = await provider.extractText(files, options);

  const allIngredients = raw.sections.flatMap((section) => section.ingredients);
  const sections = await Promise.all(raw.sections.map((section) => buildSectionDraft(provider, section)));

  // Chargé une seule fois, réutilisé ci-dessous pour la validation des
  // spécificités contrôlées ET la résolution des matières premières
  // principales (F-KEY1) — jamais un second appel redondant.
  const canonicalIngredients = await getCanonicalIngredients();

  const allergenProposals = await provider.proposeAllergens(allIngredients);
  const allergenBySlug = new Map((await getAllergens()).map((a) => [a.slug, a]));
  const allergens: ImportAllergenDraft[] = allergenProposals
    .map((proposal) => {
      const allergen = allergenBySlug.get(proposal.allergenSlug);
      return allergen ? { allergenId: allergen.id, status: proposal.status } : null;
    })
    .filter((entry): entry is ImportAllergenDraft => entry !== null);

  // Gluten free / Sans lactose / Sans fruits à coque : autorité EXCLUSIVE de
  // `evaluateRecipeSpecificities` (déterministe, aucun appel IA) — les
  // propositions du fournisseur pour ces 3 slugs sont ignorées, jamais
  // fusionnées avec cette évaluation (CLAUDE.md, principe 9). Les autres
  // spécificités (ex. Vegan) restent inchangées, portées par
  // `proposeSpecificitiesFromIngredients` (rules.ts).
  const specificityProposals = await provider.proposeSpecificities(allIngredients);
  const allSpecificities = await getSpecificities();
  const specificityBySlug = new Map(allSpecificities.map((s) => [s.slug, s]));

  const nonControlledSpecificities: ImportSpecificityDraft[] = specificityProposals
    .filter((proposal) => !isValidatedSpecificitySlug(proposal.specificitySlug))
    .map((proposal) => {
      const specificity = specificityBySlug.get(proposal.specificitySlug);
      return specificity
        ? { specificityId: specificity.id, status: proposal.status, reason: proposal.reason, source: proposal.source }
        : null;
    })
    .filter((entry): entry is ImportSpecificityDraft => entry !== null);

  const specificityEvaluation = evaluateRecipeSpecificities(sections, canonicalIngredients);
  const controlledSpecificities = buildControlledSpecificityDrafts(specificityEvaluation, specificityBySlug);
  const specificities: ImportSpecificityDraft[] = [...nonControlledSpecificities, ...controlledSpecificities];

  const originalFiles: ImportFileRef[] = fileList.map((file) => ({
    name: file.name,
    type: file.type,
    sizeBytes: 0,
    sourceFileUrl: file.sourceFileUrl ?? null,
  }));

  // Dédoublonnage à la proposition (F-KEY1) : noms bruts déjà censés
  // respecter les règles de sélection/regroupement/normalisation du prompt,
  // résolus ici contre le référentiel réellement chargé (démo ou Supabase,
  // jamais un référentiel figé) — jamais avant ce point.
  const keyIngredientAliases = await getIngredientAliases();
  const proposedKeyIngredients = resolveKeyIngredientTags(
    raw.proposedKeyIngredientNames ?? [],
    canonicalIngredients,
    keyIngredientAliases,
  );

  return {
    method: raw.method,
    // Titre absent de l'extraction → jamais inventé, placeholder explicite laissé à charge du formulaire (voir ImporterWizard).
    title: raw.title ?? "",
    procedure: raw.procedure,
    temperature: raw.temperature,
    additionalInformation: raw.additionalInformation,
    sections,
    specificities,
    allergens,
    proposedKeyIngredients,
    originalFiles,
    warnings: [...raw.warnings, ...ambiguousIngredientWarnings(allIngredients)],
    completeness: raw.completeness ?? defaultCompleteness(sections),
  };
}

/**
 * Exécute l'extraction de démonstration pour un des 3 exemples contrôlés et
 * construit un brouillon de recette pré-rempli, entièrement corrigible
 * ensuite dans le formulaire. Aucun appel réseau réel, aucune clé consommée.
 */
export async function runDemoExtraction(fixtureId: DemoFixtureId): Promise<DemoExtractionDraft> {
  const fixture: DemoFixture = DEMO_FIXTURES[fixtureId];
  return buildImportDraft(demoImportProvider, { name: fixture.fileName, type: fixture.fileType });
}
