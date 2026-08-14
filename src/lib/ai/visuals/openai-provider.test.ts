import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAiImageProvider,
  describeRealImageGenerationRequest,
  isOpenAiImageProviderConfigured,
  OPENAI_IMAGE_MODEL,
  OPENAI_PROVIDER_NAME,
} from "./openai-provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("describeRealImageGenerationRequest (contrat, avant tout appel réel)", () => {
  it("décrit fournisseur/modèle/nombre d'images sans exécuter d'appel", () => {
    const description = describeRealImageGenerationRequest("draft");
    expect(description).toEqual({
      providerName: OPENAI_PROVIDER_NAME,
      model: OPENAI_IMAGE_MODEL,
      imageCount: 1,
      quality: "draft",
      costPerImageEstimateEur: null,
    });
  });

  it("modèle par défaut si aucune variable d'environnement ne le surcharge", () => {
    expect(OPENAI_IMAGE_MODEL).toBe("gpt-image-2");
  });
});

describe("isOpenAiImageProviderConfigured / createOpenAiImageProvider — comportement sans clé", () => {
  it("se désactive proprement sans clé (repli démo attendu côté registry)", () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(isOpenAiImageProviderConfigured()).toBe(false);
    expect(createOpenAiImageProvider("draft")).toBeNull();
  });
});

describe("createOpenAiImageProvider — contrat avec clé factice de test (aucun appel réel)", () => {
  it("décode l'image reçue en data URI, sans exposer la clé", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: "ZmFrZS1weG5n" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft");
    expect(provider).not.toBeNull();

    const result = await provider!.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });

    expect(result.imageUrl).toBe("data:image/png;base64,ZmFrZS1weG5n");
    expect(result.providerName).toBe(OPENAI_PROVIDER_NAME);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // La clé voyage légitimement dans l'en-tête Authorization (appel serveur→OpenAI) —
    // jamais ailleurs (corps de requête, résultat retourné au reste de l'app).
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe("Bearer test-key-not-real");
    expect(requestInit.body as string).not.toContain("test-key-not-real");
    expect(JSON.stringify(result)).not.toContain("test-key-not-real");
  });

  it("gère un échec HTTP proprement (pas de crash, pas de clé dans l'erreur)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    await expect(provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" })).rejects.toThrow(
      /statut 400/,
    );
  });

  it("gère une réponse sans image (refus modèle) proprement", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    await expect(
      provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" }),
    ).rejects.toThrow(/aucune image/i);
  });

  it("protection de la clé : aucune erreur sérialisée ne contient la clé", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    vi.stubEnv("OPENAI_API_KEY", "super-secret-test-key");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect(JSON.stringify((error as Error).message)).not.toContain("super-secret-test-key");
    }
  });
});
