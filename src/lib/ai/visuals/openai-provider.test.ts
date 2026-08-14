import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAiImageProvider,
  describeRealImageGenerationRequest,
  isOpenAiImageProviderConfigured,
  OPENAI_IMAGE_MODEL,
  OPENAI_PROVIDER_NAME,
  RealImageGenerationError,
} from "./openai-provider";

/** Réponse d'échec minimale réaliste : `.headers.get` disponible comme sur un vrai `Response`. */
function errorResponse(status: number, body: unknown = null) {
  return {
    ok: false,
    status,
    headers: { get: (name: string) => (name === "x-request-id" ? "req_test_123" : null) },
    json: async () => body ?? {},
  };
}

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

  it("correction : n'envoie jamais background=transparent, même demandé — gpt-image-2 ne le supporte pas (erreur 400 confirmée)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ b64_json: "ZmFrZQ==" }] }) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(requestInit.body as string);
    expect(sentBody.background).toBe("opaque");
    expect(sentBody.size).toBe("1024x1024");
    expect(sentBody.quality).toBe("low");
  });

  it("classifie 401 → clé refusée, jamais un 500 générique", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(401)));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect(error).toBeInstanceOf(RealImageGenerationError);
      const e = error as RealImageGenerationError;
      expect(e.category).toBe("invalid_key");
      expect(e.status).toBe(401);
      expect(e.providerRequestId).toBe("req_test_123");
      expect(e.message).toBe("Clé OpenAI refusée.");
    }
  });

  it("classifie 403 → accès modèle, distinct d'une clé invalide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(403)));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect((error as RealImageGenerationError).category).toBe("model_access");
      expect((error as RealImageGenerationError).message).toBe("Modèle non accessible pour ce projet.");
    }
  });

  it("classifie 429 avec code quota → crédit insuffisant", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(429, { error: { code: "insufficient_quota" } })));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect((error as RealImageGenerationError).category).toBe("insufficient_quota");
    }
  });

  it("classifie 400 → paramètre invalide", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(400)));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect((error as RealImageGenerationError).category).toBe("invalid_parameter");
    }
  });

  it("classifie 500 → service temporairement indisponible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errorResponse(500)));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect((error as RealImageGenerationError).category).toBe("transient");
    }
  });

  it("gère une réponse sans image (refus modèle) proprement → erreur de décodage, jamais un brouillon créé", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }));
    vi.stubEnv("OPENAI_API_KEY", "test-key-not-real");

    const provider = createOpenAiImageProvider("draft")!;
    try {
      await provider.generate({ prompt: "Citron", ratio: "1:1", background: "transparent" });
      throw new Error("devait rejeter");
    } catch (error) {
      expect((error as RealImageGenerationError).category).toBe("decode_error");
      expect((error as RealImageGenerationError).message).toBe("Image générée mais impossible à enregistrer.");
    }
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
