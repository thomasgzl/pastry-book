/**
 * Brief créatif ponctuel du pilote G3 (illustration réelle « Citron ») —
 * distinct du texte générique versionné dans `@/lib/visuals/preset.ts`
 * (`BASE_PROMPT`), jamais mélangé avec lui. Sert aussi de RÉFÉRENCE DE STYLE
 * (jamais de contenu) pour les briefs suivants du même lot (voir
 * `pilotStyleKit.ts`, réutilisé verbatim par `pilote-pistache/prompt.ts`).
 */

import { buildPilotPrompt, PILOT_STYLE_DESCRIPTOR } from "../pilotStyleKit";

const CITRON_SUBJECT_BODY = `Illustration botanique éditoriale raffinée d'un citron jaune entier accompagné d'un demi-citron, d'un léger ruban de zeste et de deux feuilles discrètes, jaune citron naturel.`;

/** Prompt final exact envoyé au fournisseur — stocké tel quel avec le visuel (`VisualAsset.prompt`), jamais reconstruit après coup. */
export function buildCitronPilotPrompt(): string {
  return buildPilotPrompt(CITRON_SUBJECT_BODY);
}

/** Exposé pour vérifier par lecture directe que Pistache reprend EXACTEMENT ce même texte de style (test ciblé). */
export { PILOT_STYLE_DESCRIPTOR };
