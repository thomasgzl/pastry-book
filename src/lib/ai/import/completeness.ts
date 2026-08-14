/**
 * Contrôle de complétude de l'extraction (correction lot G — recette « Riz
 * au lait Vanille Caramel » extraite avec une seule préparation sur quatre).
 * Logique pure, sans appel réseau — ne fait JAMAIS confiance au seul
 * `completenessStatus` auto-déclaré par le modèle : reconcilié contre le
 * nombre réel de `sections` produites. Une extraction n'est jamais
 * `"complete"` uniquement parce que le JSON est valide.
 */

import type { CompletenessStatus, ExtractedSection, ExtractionCompleteness } from "./types";

interface ReconcileInput {
  sections: ExtractedSection[];
  detectedPreparationTitles?: string[];
  extractedPreparationTitles?: string[];
  completenessStatus?: CompletenessStatus;
  missingOrUnclearSections?: string[];
}

function fallbackTitles(sections: ExtractedSection[]): string[] {
  return sections.map((section, index) => section.name ?? `Préparation ${index + 1}`);
}

export function reconcileCompleteness(input: ReconcileInput): ExtractionCompleteness {
  const titles = fallbackTitles(input.sections);
  const detected = input.detectedPreparationTitles ?? titles;
  const extracted = input.extractedPreparationTitles ?? titles;
  const missingOrUnclearSections = input.missingOrUnclearSections ?? [];
  const countsReconcile = detected.length === extracted.length && extracted.length === input.sections.length;

  let status: CompletenessStatus;
  if (!input.completenessStatus) {
    // Le modèle n'a pas déclaré de statut (ancienne réponse, ou champ omis) : jamais "complete" par défaut.
    status = "possibly_incomplete";
  } else if (!countsReconcile) {
    // Le modèle affirme "complete" mais les comptes ne se recoupent pas : jamais accepté aveuglément.
    status = "needs_review";
  } else {
    status = input.completenessStatus;
  }

  return { detectedPreparationTitles: detected, extractedPreparationTitles: extracted, status, missingOrUnclearSections };
}

/**
 * Filet de sécurité déterministe pour les captures qui se chevauchent
 * (même préparation photographiée deux fois) — le mécanisme principal reste
 * l'instruction donnée au modèle de dédupliquer lui-même ; ceci ne fait que
 * signaler un doublon évident, jamais le supprimer automatiquement.
 */
export function detectDuplicateSections(sections: ExtractedSection[]): string[] {
  const seen = new Set<string>();
  const warnings: string[] = [];
  for (const section of sections) {
    if (!section.name && section.ingredients.length === 0) continue;
    const key = `${(section.name ?? "").trim().toLowerCase()}::${section.ingredients
      .map((ingredient) => ingredient.originalName.trim().toLowerCase())
      .sort()
      .join(",")}`;
    if (seen.has(key)) {
      warnings.push(
        `Préparation « ${section.name ?? "sans nom"} » semble dupliquée entre plusieurs captures — vérifiez le chevauchement.`,
      );
    }
    seen.add(key);
  }
  return warnings;
}
