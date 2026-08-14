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
import { getCanonicalIngredients } from "@/lib/data/canonical-ingredients";
import type {
  ImportAllergenDraft,
  ImportFileRef,
  ImportIngredientDraft,
  ImportSectionDraft,
  ImportSpecificityDraft,
} from "@/lib/import/schema";
import { deriveQuantity } from "@/lib/import/model";
import { demoImportProvider } from "./demoProvider";
import { ambiguousIngredientWarnings } from "./rules";
import { DEMO_FIXTURES, type DemoFixture, type DemoFixtureId } from "./fixtures";
import type {
  ExtractedIngredient,
  ExtractedSection,
  ExtractionCompleteness,
  ExtractOptions,
  ExtractSourceInput,
  ImportAIProvider,
} from "./types";

export interface DemoExtractionDraft {
  title: string;
  procedure: string | null;
  temperature: string | null;
  additionalInformation: string | null;
  sections: ImportSectionDraft[];
  specificities: ImportSpecificityDraft[];
  allergens: ImportAllergenDraft[];
  originalFiles: ImportFileRef[];
  warnings: string[];
  /**
   * Contrôle de complétude (lot G) — méta-donnée d'IMPORT uniquement,
   * jamais reprise dans `ImportRecipeDraft` (voir `ImporterWizard.applyDemoExtraction`,
   * qui ne copie que les champs de contenu réel de la recette).
   */
  completeness: ExtractionCompleteness;
}

let localIdCounter = 0;
function nextLocalId(prefix: string): string {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}`;
}

function buildIngredientDraft(ingredient: ExtractedIngredient, canonicalSlug: string | null): ImportIngredientDraft {
  const canonical = canonicalSlug ? getCanonicalIngredients().find((c) => c.slug === canonicalSlug) : undefined;
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
    ingredients: section.ingredients.map((ingredient) =>
      buildIngredientDraft(ingredient, canonicalBySlug.get(ingredient.originalName) ?? null),
    ),
  };
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

  const allergenProposals = await provider.proposeAllergens(allIngredients);
  const allergenBySlug = new Map(getAllergens().map((a) => [a.slug, a]));
  const allergens: ImportAllergenDraft[] = allergenProposals
    .map((proposal) => {
      const allergen = allergenBySlug.get(proposal.allergenSlug);
      return allergen ? { allergenId: allergen.id, status: proposal.status } : null;
    })
    .filter((entry): entry is ImportAllergenDraft => entry !== null);

  const specificityProposals = await provider.proposeSpecificities(allIngredients);
  const specificityBySlug = new Map(getSpecificities().map((s) => [s.slug, s]));
  const specificities: ImportSpecificityDraft[] = specificityProposals
    .map((proposal) => {
      const specificity = specificityBySlug.get(proposal.specificitySlug);
      return specificity
        ? { specificityId: specificity.id, status: proposal.status, reason: proposal.reason, source: proposal.source }
        : null;
    })
    .filter((entry): entry is ImportSpecificityDraft => entry !== null);

  const originalFiles: ImportFileRef[] = fileList.map((file) => ({ name: file.name, type: file.type, sizeBytes: 0 }));

  return {
    // Titre absent de l'extraction → jamais inventé, placeholder explicite laissé à charge du formulaire (voir ImporterWizard).
    title: raw.title ?? "",
    procedure: raw.procedure,
    temperature: raw.temperature,
    additionalInformation: raw.additionalInformation,
    sections,
    specificities,
    allergens,
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
