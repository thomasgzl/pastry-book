import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetAiCostGuardForTests } from "@/lib/domain/aiCostGuard";
import { approveVisualAsset, listVisualAssets, seedVisualAssetsStore } from "@/lib/visuals/storage";
import { generateRealVisualDraft } from "./real-generation";
import * as service from "./service";

const SUBJECT = { subjectType: "ingredient" as const, subjectId: "00000000-0000-4000-8000-000000009101" };

beforeEach(() => {
  seedVisualAssetsStore([]);
  resetAiCostGuardForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("generateRealVisualDraft — sans clé configurée", () => {
  it("refuse proprement, sans crash (repli démo côté appelant)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const result = await generateRealVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("provider_unavailable");
  });
});

describe("generateRealVisualDraft — avec clé factice de test (fetch mocké, aucun appel réel)", () => {
  function stubFetchSuccess() {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ b64_json: "aW1n" }] }) }),
    );
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");
  }

  it("RÈGLE NON NÉGOCIABLE : refuse si le sujet a déjà un visuel approuvé/principal, aucun nouvel asset créé", async () => {
    stubFetchSuccess();
    const draft = await service.generateVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });
    approveVisualAsset(draft.id);

    const before = listVisualAssets(SUBJECT.subjectType, SUBJECT.subjectId).length;
    const result = await generateRealVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("conflict");
    expect(listVisualAssets(SUBJECT.subjectType, SUBJECT.subjectId).length).toBe(before);
  });

  it("anti-double-clic : deux appels avec le même identifiant de demande, le second est refusé pendant que le premier est en cours", async () => {
    stubFetchSuccess();
    const input = { ...SUBJECT, subjectLabel: "Citron", requestId: "click-1" };

    const first = generateRealVisualDraft(input);
    const second = await generateRealVisualDraft(input);

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("conflict");

    const firstResult = await first;
    expect(firstResult.ok).toBe(true);
  });

  it("succès : crée un brouillon (jamais approuvé) avec le prompt/preset/modèle attendus", async () => {
    stubFetchSuccess();
    const result = await generateRealVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.status).toBe("draft");
      expect(result.data.isPrimary).toBe(false);
      expect(result.data.prompt).toContain("Citron");
      expect(result.data.imageUrl).toBe("data:image/png;base64,aW1n");
    }
  });

  it("échec fournisseur (sortie invalide) → état d'erreur propre, pas de crash, aucun asset créé", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const result = await generateRealVisualDraft({ ...SUBJECT, subjectLabel: "Citron" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unknown");
  });
});
