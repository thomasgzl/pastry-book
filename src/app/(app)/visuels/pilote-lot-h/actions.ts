"use server";

/**
 * Action serveur du pilote lot H — jusqu'à 7 appels réels SÉQUENTIELS
 * (un par sujet, jamais en parallèle), arrêt immédiat au premier échec,
 * aucune relance automatique, aucun doublon pour un sujet déjà approuvé
 * (revérifié juste avant chaque appel — défense en profondeur contre une
 * approbation survenue entre l'affichage de la confirmation et le clic).
 */

import type { VisualAsset } from "@/lib/domain/schemas";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { generateRealVisualDraft } from "@/lib/ai/visuals/real-generation";
import { resolveLotHSubjects } from "./subjects";

export type LotHOutcome =
  | { key: string; status: "skipped"; reason: string }
  | { key: string; status: "ok"; asset: VisualAsset }
  | { key: string; status: "error"; message: string }
  | { key: string; status: "not_attempted" };

/**
 * Doit être ≥ au délai minimal de la garde de coût partagée
 * (`real-generation.ts`, `MIN_DELAY_MS`, 3000 ms) — celle-ci est indexée par
 * TYPE d'opération, pas par sujet, donc des appels réels consécutifs pour
 * des sujets différents seraient sinon refusés par erreur. Un espacement
 * délibéré entre appels d'un même lot confirmé une seule fois, jamais une
 * relance automatique après échec (voir la boucle : arrêt immédiat, aucune
 * pause avant un `not_attempted`).
 */
const SEQUENTIAL_PACING_MS = 3_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLotHGeneration(): Promise<LotHOutcome[]> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("Génération réelle indisponible : clé API absente côté serveur.");
  }

  const subjects = resolveLotHSubjects();
  const outcomes: LotHOutcome[] = [];
  let stopped = false;
  let callsMade = 0;

  for (const subject of subjects) {
    if (stopped) {
      outcomes.push({ key: subject.key, status: "not_attempted" });
      continue;
    }

    const stillApproved = subject.alreadyApproved || Boolean(getPrimaryVisualAsset(subject.kind, subject.subjectId));
    if (stillApproved) {
      outcomes.push({ key: subject.key, status: "skipped", reason: "Visuel déjà approuvé pour ce sujet — aucun doublon généré." });
      continue;
    }

    if (callsMade > 0) await wait(SEQUENTIAL_PACING_MS);
    callsMade += 1;

    const result = await generateRealVisualDraft({
      subjectType: subject.kind,
      subjectId: subject.subjectId,
      subjectLabel: subject.label,
      requestId: `pilot-lot-h-${subject.key}-${Date.now()}`,
      quality: "draft",
      promptOverride: subject.prompt,
      ratioOverride: "1:1",
      backgroundOverride: "ivoire",
    });

    if (result.ok) {
      outcomes.push({ key: subject.key, status: "ok", asset: result.data });
    } else {
      outcomes.push({ key: subject.key, status: "error", message: result.error.message });
      stopped = true;
    }
  }

  return outcomes;
}
