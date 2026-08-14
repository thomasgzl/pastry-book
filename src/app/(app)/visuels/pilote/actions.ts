"use server";

/**
 * Action serveur du pilote illustration réelle (lot G, G3) — UN sujet fixe
 * (Citron), UN appel maximum par clic, jamais de relance automatique.
 * Appelle explicitement `generateRealVisualDraft` (jamais le chemin démo
 * `getVisualsProvider`) : sélection de fournisseur explicite, comme le
 * pilote d'extraction (G2).
 */

import { generateRealVisualDraft } from "@/lib/ai/visuals/real-generation";
import type { VisualAsset } from "@/lib/domain/schemas";
import { getCanonicalIngredientBySlug } from "@/lib/data/canonical-ingredients";
import { buildCitronPilotPrompt } from "./prompt";

export async function runCitronPilotGeneration(): Promise<VisualAsset> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("Génération réelle indisponible : clé API absente côté serveur.");
  }
  const citron = getCanonicalIngredientBySlug("citron");
  if (!citron) {
    throw new Error("Matière première « Citron » introuvable dans le référentiel.");
  }

  const result = await generateRealVisualDraft({
    subjectType: "ingredient",
    subjectId: citron.id,
    subjectLabel: citron.name,
    requestId: `pilot-visual-citron-${Date.now()}`,
    quality: "draft",
    promptOverride: buildCitronPilotPrompt(),
    // Un visuel de démonstration approuvé existe déjà pour Citron : ce pilote crée
    // explicitement une NOUVELLE version à côté (jamais un remplacement silencieux,
    // voir `real-generation.ts`) — l'approuvé actuel n'est ni modifié ni écrasé.
    allowAdditionalVersion: true,
  });

  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
