import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAiCostGuardForTests } from "@/lib/domain/aiCostGuard";
import { approveVisualAsset, createDraftVisualAsset, seedVisualAssetsStore } from "@/lib/visuals/storage";
import { resolveLotHSubjects } from "./subjects";
import { runLotHGeneration } from "./actions";

beforeEach(() => {
  seedVisualAssetsStore([]);
  resetAiCostGuardForTests();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function fakeImageResponse() {
  return { ok: true, json: async () => ({ data: [{ b64_json: "ZmFrZQ==" }] }) };
}

/** Exécute l'action tout en avançant les minuteurs d'espacement entre appels (`SEQUENTIAL_PACING_MS`), sans vraie attente. */
async function runWithFakeTimers() {
  const promise = runLotHGeneration();
  await vi.runAllTimersAsync();
  return promise;
}

describe("runLotHGeneration — séquentiel, arrêt immédiat au premier échec", () => {
  it("s'arrête au 3ᵉ appel en échec, conserve les 2 brouillons déjà générés, ne tente jamais les suivants", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 3) return { ok: false, status: 400, headers: { get: () => null }, json: async () => ({ error: { code: "invalid_value" } }) };
        return fakeImageResponse();
      }),
    );

    const outcomes = await runWithFakeTimers();
    const subjectsCount = resolveLotHSubjects().length;

    expect(outcomes).toHaveLength(subjectsCount);
    expect(outcomes[0].status).toBe("ok");
    expect(outcomes[1].status).toBe("ok");
    expect(outcomes[2].status).toBe("error");
    for (let i = 3; i < outcomes.length; i += 1) {
      expect(outcomes[i].status).toBe("not_attempted");
    }
    // Jamais plus d'appels réseau que de sujets tentés avant l'échec inclus (3 ici) — aucune relance automatique des suivants.
    expect(callCount).toBe(3);
  });

  it("tous statuts draft, jamais approuvés automatiquement", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeImageResponse()));

    const outcomes = await runWithFakeTimers();
    const okOutcomes = outcomes.filter((o) => o.status === "ok");
    expect(okOutcomes.length).toBeGreaterThan(0);
    for (const outcome of okOutcomes) {
      if (outcome.status === "ok") {
        expect(outcome.asset.status).toBe("draft");
        expect(outcome.asset.isPrimary).toBe(false);
      }
    }
  });

  it("un sujet déjà approuvé est ignoré (skipped), jamais dupliqué ni écrasé", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fakeImageResponse()));

    // Approuve manuellement le premier sujet du lot avant de lancer la génération.
    const [first] = resolveLotHSubjects();
    const draft = createDraftVisualAsset({
      subjectType: first.kind,
      subjectId: first.subjectId,
      imageUrl: "data:image/png;base64,ZGVqYQ==",
      sourcePhotoUrl: null,
      prompt: "déjà approuvé",
      presetVersion: "v1",
    });
    approveVisualAsset(draft.id);

    const outcomes = await runWithFakeTimers();
    expect(outcomes[0].status).toBe("skipped");
    expect(outcomes.slice(1).some((o) => o.status === "ok")).toBe(true);
  });
});
