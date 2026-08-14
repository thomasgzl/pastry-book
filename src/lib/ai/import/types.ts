/**
 * Port d'extraction IA pour l'import (D3) — interface indépendante du
 * fournisseur (CLAUDE.md, docs/05-AI_IMPORT.md). Le code métier (`/importer`,
 * `src/lib/import/**`) ne connaît que ces types ; jamais un SDK fournisseur.
 * OpenAI sera le premier adaptateur réel branché derrière ce même port —
 * aucun appel réseau ni secret dans cette tranche, seulement le contrat et
 * un adaptateur de démonstration déterministe (`demoProvider.ts`).
 *
 * Chaque proposition porte un statut de vérification : jamais `confirmed`
 * automatiquement, quelle que soit la confiance de la règle/du modèle —
 * seule une action humaine explicite dans l'écran de vérification confirme
 * ou rejette (CLAUDE.md, principe 8).
 */

import type { SpecificitySource, SpecificityStatus, VerificationStatus } from "@/lib/domain/schemas";

export interface ExtractedIngredient {
  originalName: string;
  /** Texte brut de quantité tel qu'observé — `null` si illisible/absent, jamais deviné. */
  originalQuantityText: string | null;
  unit: string | null;
}

export interface ExtractedSection {
  /** `null` → préparation sans nom (liste simple). */
  name: string | null;
  ingredients: ExtractedIngredient[];
}

/** Méthode ayant produit le texte : extraction locale (PDF/DOCX) ou vision/OCR (scans, photos, captures) — jamais l'inverse (docs/05-AI_IMPORT.md § Formats et priorité). */
export type ExtractionMethod = "local-text" | "ocr" | "manual";

export interface RawExtractionResult {
  method: ExtractionMethod;
  /** `null` si le titre n'a pas pu être identifié avec certitude — jamais un titre inventé. */
  title: string | null;
  sections: ExtractedSection[];
  /** Procédé, température, informations complémentaires : `null` chacun si absents du document — jamais déduits. */
  procedure: string | null;
  temperature: string | null;
  additionalInformation: string | null;
  /** Avertissements de l'extraction (champ illisible, ingrédient ambigu…) — toujours affichés, jamais tus. */
  warnings: string[];
}

export interface CanonicalIngredientProposal {
  originalName: string;
  /** `null` si aucune correspondance canonique trouvée. */
  canonicalIngredientSlug: string | null;
}

export interface AllergenProposal {
  allergenSlug: string;
  status: VerificationStatus;
  reason: string;
}

export interface SpecificityProposal {
  specificitySlug: string;
  status: SpecificityStatus;
  reason: string | null;
  source: SpecificitySource;
}

/**
 * Port serveur d'extraction/normalisation d'import. Toutes les méthodes sont
 * asynchrones (traitement d'import asynchrone, CLAUDE.md) même quand
 * l'adaptateur de démonstration résout immédiatement.
 */
export interface ImportAIProvider {
  readonly name: string;
  extractText(file: { name: string; type: string }): Promise<RawExtractionResult>;
  proposeCanonicalIngredients(ingredients: ExtractedIngredient[]): Promise<CanonicalIngredientProposal[]>;
  proposeAllergens(ingredients: ExtractedIngredient[]): Promise<AllergenProposal[]>;
  proposeSpecificities(ingredients: ExtractedIngredient[]): Promise<SpecificityProposal[]>;
}
