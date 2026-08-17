import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests ciblés (niveau 1, K11) de `getApprovedVisualUrl` sur la voie Supabase
 * réellement configurée avec un chemin Storage réel (K10) — client
 * base/Storage entièrement mocké, aucune connexion réseau réelle. Complète
 * `approvedVisual.test.ts` (mode mémoire, data URI uniquement) sans le
 * dupliquer : ce fichier ne couvre QUE le nouveau cas signé.
 */

const STORAGE_PATH = "ingredient/00000000-0000-4000-8000-000000009401/generated.png";

const { maybeSingleMock, createSignedUrlMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  createSignedUrlMock: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseConfig: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from(table: string) {
      if (table === "visual_assets") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: maybeSingleMock,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`from("${table}") inattendu dans ce test mocké`);
    },
    storage: {
      from: () => ({
        createSignedUrl: createSignedUrlMock,
      }),
    },
  }),
}));

const { getApprovedVisualUrl } = await import("./approvedVisual");
const { VisualAssetPersistenceError } = await import("./storage");

const DB_ROW = {
  id: "asset-1",
  subject_type: "ingredient",
  subject_id: "00000000-0000-4000-8000-000000009401",
  status: "approved",
  is_primary: true,
  image_url: STORAGE_PATH,
  source_photo_url: null,
  prompt: "prompt de test",
  preset_version: "v1",
  created_at: "2026-08-15T00:00:00.000Z",
};

beforeEach(() => {
  maybeSingleMock.mockReset();
  createSignedUrlMock.mockReset();
});

describe("getApprovedVisualUrl (K11) — chemin Storage réel signé", () => {
  it("génère une URL signée pour un chemin Storage réel (jamais le chemin brut)", async () => {
    maybeSingleMock.mockResolvedValue({ data: DB_ROW, error: null });
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://example.supabase.co/signed/abc?token=xyz" },
      error: null,
    });

    const url = await getApprovedVisualUrl("ingredient", DB_ROW.subject_id);

    expect(createSignedUrlMock).toHaveBeenCalledWith(STORAGE_PATH, 3600);
    expect(url).toBe("https://example.supabase.co/signed/abc?token=xyz");
  });

  it("échec de signature : erreur explicite, jamais un chemin brut inexploitable renvoyé silencieusement", async () => {
    maybeSingleMock.mockResolvedValue({ data: DB_ROW, error: null });
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: "objet introuvable" } });

    await expect(getApprovedVisualUrl("ingredient", DB_ROW.subject_id)).rejects.toThrow(
      VisualAssetPersistenceError,
    );
  });

  it("data URI : jamais passée à createSignedUrl (repli inchangé)", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { ...DB_ROW, image_url: "data:image/png;base64,ZZZZ" },
      error: null,
    });

    const url = await getApprovedVisualUrl("ingredient", DB_ROW.subject_id);

    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(url).toBe("data:image/png;base64,ZZZZ");
  });
});
