/**
 * Adaptateur de démonstration (D3) — implémente `ImportAIProvider` sans
 * aucun appel réseau ni clé API : mode démonstration déterministe obligatoire
 * (CLAUDE.md). `extractText` ne « lit » que les 3 exemples contrôlés
 * (`fixtures.ts`) par nom de fichier ; tout autre fichier retombe sur la
 * saisie manuelle, jamais un contenu inventé. Les propositions
 * allergènes/spécificités/canoniques réutilisent les règles déterministes de
 * `rules.ts`. OpenAI (ou un autre fournisseur réel) implémentera ce même
 * port plus tard, sans changer le code appelant.
 */

import { getSpecificities } from "@/lib/data/specificities";
import { DEMO_FIXTURES } from "./fixtures";
import {
  ambiguousIngredientWarnings,
  proposeAllergensFromIngredients,
  proposeCanonicalIngredientsFromNames,
  proposeSpecificitiesFromIngredients,
} from "./rules";
import type {
  AllergenProposal,
  CanonicalIngredientProposal,
  ExtractedIngredient,
  ImportAIProvider,
  RawExtractionResult,
  SpecificityProposal,
} from "./types";

function findFixtureByFileName(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  return Object.values(DEMO_FIXTURES).find((fixture) => fixture.fileName.toLowerCase() === normalized);
}

export const demoImportProvider: ImportAIProvider = {
  name: "demo",

  async extractText(files: { name: string; type: string } | { name: string; type: string }[]): Promise<RawExtractionResult> {
    const list = Array.isArray(files) ? files : [files];
    const fixture = findFixtureByFileName(list[0].name);
    if (fixture) return fixture.extraction;

    // Mode démonstration : aucun moteur d'OCR/extraction réel branché ici
    // (aucun appel payant). Un fichier hors des 3 exemples contrôlés reste
    // donc à saisir manuellement — jamais un contenu simulé au hasard.
    return {
      method: "manual",
      title: null,
      procedure: null,
      temperature: null,
      additionalInformation: null,
      sections: [],
      warnings: [
        "Extraction automatique non disponible en mode démonstration pour ce fichier — saisie manuelle requise.",
      ],
    };
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

/** Avertissements d'ingrédients ambigus (composition non précisée) — exposé séparément car ce n'est pas une proposition d'allergène, seulement un signal « à vérifier ». */
export { ambiguousIngredientWarnings };
