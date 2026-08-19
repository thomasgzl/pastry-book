/**
 * Fabriques de brouillon vide pour le formulaire `/importer` (D1). Logique
 * d'initialisation d'état d'interface uniquement — la validation stricte vit
 * dans `src/lib/import/schema.ts` (D2), consommée en lecture seule ici.
 */

import type { ImportIngredientDraft, ImportRecipeDraft, ImportSectionDraft } from "@/lib/import/schema";

export function createEmptyIngredient(): ImportIngredientDraft {
  return {
    id: crypto.randomUUID(),
    originalName: "",
    canonicalIngredientId: null,
    originalQuantityText: null,
    quantityDecimal: null,
    unit: null,
    verificationStatus: "needs_review",
  };
}

export function createEmptySection(): ImportSectionDraft {
  return {
    id: crypto.randomUUID(),
    name: null,
    originalText: null,
    ingredients: [createEmptyIngredient()],
  };
}

export function createEmptyDraft(sourceId: string): ImportRecipeDraft {
  return {
    id: crypto.randomUUID(),
    title: "",
    sourceId,
    sourceCategoryId: null,
    procedure: null,
    temperature: null,
    additionalInformation: null,
    sections: [createEmptySection()],
    specificities: [],
    allergens: [],
    proposedKeyIngredients: [],
    originalFiles: [],
    pastedText: null,
    warnings: [],
  };
}
