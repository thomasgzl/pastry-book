"use server";

/**
 * Action serveur du pilote illustration réelle Pistache (lot G, réplique
 * de style G3) — UN sujet fixe (Pistache), UN appel maximum par clic,
 * jamais de relance automatique. Même mécanisme que `pilote/actions.ts`
 * (Citron) : appel explicite à `generateRealVisualDraft`, jamais le
 * chemin démo.
 */

import { generateRealVisualDraft } from "@/lib/ai/visuals/real-generation";
import type { VisualAsset } from "@/lib/domain/schemas";
import { getCanonicalIngredientBySlug } from "@/lib/data/canonical-ingredients";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { buildPistachePilotPrompt } from "./prompt";

export async function runPistachePilotGeneration(): Promise<VisualAsset> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("Génération réelle indisponible : clé API absente côté serveur.");
  }
  const pistache = getCanonicalIngredientBySlug("pistache");
  if (!pistache) {
    throw new Error("Matière première « Pistache » introuvable dans le référentiel.");
  }

  const alreadyPrimary = Boolean(await getPrimaryVisualAsset("ingredient", pistache.id));

  const result = await generateRealVisualDraft({
    subjectType: "ingredient",
    subjectId: pistache.id,
    subjectLabel: pistache.name,
    requestId: `pilot-visual-pistache-${Date.now()}`,
    quality: "draft",
    promptOverride: buildPistachePilotPrompt(),
    allowAdditionalVersion: alreadyPrimary,
  });

  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}
