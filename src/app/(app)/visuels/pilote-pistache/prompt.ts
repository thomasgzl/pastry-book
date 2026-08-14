/**
 * Brief créatif « Pistache » — réplique de STYLE du pilote Citron (G3),
 * jamais de contenu : le texte de style (`PILOT_STYLE_DESCRIPTOR`) est
 * réutilisé VERBATIM depuis `pilote/prompt.ts`, seule la phrase décrivant
 * le sujet change. Citron n'apparaît nulle part dans le contenu de l'image.
 */

import { buildPilotPrompt, PILOT_STYLE_DESCRIPTOR } from "../pilotStyleKit";

const PISTACHE_SUBJECT_BODY = `Illustration botanique éditoriale raffinée d'une pistache entière en coque entrouverte, accompagnée d'une pistache décortiquée et de quelques éclats, vert pistache naturel et discret.`;

/** Prompt final exact envoyé au fournisseur — stocké tel quel avec le visuel (`VisualAsset.prompt`), jamais reconstruit après coup. */
export function buildPistachePilotPrompt(): string {
  return buildPilotPrompt(PISTACHE_SUBJECT_BODY);
}

export { PILOT_STYLE_DESCRIPTOR };
