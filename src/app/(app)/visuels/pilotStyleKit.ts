/**
 * Descripteur de style verbatim PARTAGÉ entre les briefs créatifs ponctuels
 * du lot G3 (Citron, puis Pistache en réplique de style) — garantit
 * exactement le même niveau de détail, la même finesse botanique, la même
 * aquarelle légère, le même fond ivoire, la même quantité d'espace négatif,
 * la même échelle dans le cadre et la même palette olive/sauge entre les
 * sujets. Un seul texte, jamais dupliqué/modifié indépendamment par sujet —
 * seule la phrase décrivant le SUJET (couleur naturelle propre à l'élément)
 * varie d'un brief à l'autre.
 */

import { getSubjectFraming } from "@/lib/visuals/preset";

export const PILOT_STYLE_DESCRIPTOR = `Trait fin à l'encre olive, aquarelle très légère et peu saturée, touches de vert sauge, composition élégante et aérée avec beaucoup d'espace négatif, même échelle du sujet dans le cadre qu'une étude botanique classique. Univers d'un carnet de pâtisserie français haut de gamme, délicat, artisanal et intemporel.`;

export const PILOT_EXCLUSIONS = [
  "aucun texte",
  "aucun logo",
  "aucune personne",
  "aucune vaisselle",
  "aucun décor de cuisine",
  "aucun photoréalisme",
  "aucune ombre photographique forte",
  "pas de rose",
  "pas de terracotta",
  "pas de végétation excessive",
  "pas de composition chargée",
] as const;

/** Assemble un brief : sujet propre + style partagé + contraintes techniques (ratio, fond) + exclusions — jamais `background: "transparent"` (voir `openai-provider.ts`, gpt-image-2 ne le supporte pas), le fond ivoire est demandé dans le texte. */
export function buildPilotPrompt(subjectBody: string): string {
  const framing = getSubjectFraming("ingredient");
  const formatLine = `Format : carré ${framing.ratio}, fond ivoire parfaitement uniforme (jamais transparent — non pris en charge par le modèle).`;
  const exclusionsLine = `Exclusions impératives : ${PILOT_EXCLUSIONS.join(", ")}.`;
  return [subjectBody, PILOT_STYLE_DESCRIPTOR, formatLine, exclusionsLine].join("\n\n");
}
