import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests ciblés (niveau 1, K11 + K-R2) de `getApprovedVisualUrl` sur la voie
 * Supabase (métadonnées) + R2 (fichier) réellement configurés avec un chemin
 * réel (K10) — client base/R2 entièrement mocké, aucune connexion réseau
 * réelle. Couvre les DEUX backends possibles pour un même chemin de la même
 * forme (`{subjectType}/{subjectId}/{uuid}.{ext}`) : objet réellement en R2
 * (bascule K-R2) vs. repli Supabase legacy (upload antérieur à la bascule,
 * `existsInR2` renvoie faux). Complète `approvedVisual.test.ts` (mode
 * mémoire, data URI uniquement) sans le dupliquer.
 */

const STORAGE_PATH = "ingredient/00000000-0000-4000-8000-000000009401/generated.png";

const { maybeSingleMock, getR2DownloadUrlMock, existsInR2Mock, createSignedUrlMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  getR2DownloadUrlMock: vi.fn(),
  existsInR2Mock: vi.fn(),
  createSignedUrlMock: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseConfig: () => true,
}));

vi.mock("@/lib/r2", () => ({
  hasR2Config: () => true,
  existsInR2: existsInR2Mock,
  getR2DownloadUrl: getR2DownloadUrlMock,
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
  getR2DownloadUrlMock.mockReset();
  existsInR2Mock.mockReset();
  createSignedUrlMock.mockReset();
});

describe("getApprovedVisualUrl (K11 + K-R2) — chemin réel signé, deux backends possibles", () => {
  it("objet réellement présent en R2 : signe via R2, jamais via Supabase", async () => {
    maybeSingleMock.mockResolvedValue({ data: DB_ROW, error: null });
    existsInR2Mock.mockResolvedValue(true);
    getR2DownloadUrlMock.mockResolvedValue("https://example.r2.cloudflarestorage.com/signed/abc?token=xyz");

    const url = await getApprovedVisualUrl("ingredient", DB_ROW.subject_id);

    expect(existsInR2Mock).toHaveBeenCalledWith(STORAGE_PATH);
    expect(getR2DownloadUrlMock).toHaveBeenCalledWith(STORAGE_PATH);
    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(url).toBe("https://example.r2.cloudflarestorage.com/signed/abc?token=xyz");
  });

  it("objet absent de R2 (upload antérieur à la bascule) : repli Supabase, jamais cassé", async () => {
    maybeSingleMock.mockResolvedValue({ data: DB_ROW, error: null });
    existsInR2Mock.mockResolvedValue(false);
    createSignedUrlMock.mockResolvedValue({
      data: { signedUrl: "https://example.supabase.co/signed/abc?token=xyz" },
      error: null,
    });

    const url = await getApprovedVisualUrl("ingredient", DB_ROW.subject_id);

    expect(createSignedUrlMock).toHaveBeenCalledWith(STORAGE_PATH, 3600);
    expect(getR2DownloadUrlMock).not.toHaveBeenCalled();
    expect(url).toBe("https://example.supabase.co/signed/abc?token=xyz");
  });

  it("échec de signature (ni R2 ni Supabase) : erreur explicite, jamais un chemin brut inexploitable renvoyé silencieusement", async () => {
    maybeSingleMock.mockResolvedValue({ data: DB_ROW, error: null });
    existsInR2Mock.mockResolvedValue(false);
    createSignedUrlMock.mockResolvedValue({ data: null, error: { message: "objet introuvable" } });

    await expect(getApprovedVisualUrl("ingredient", DB_ROW.subject_id)).rejects.toThrow(
      VisualAssetPersistenceError,
    );
  });

  it("data URI : jamais passée à R2 ni Supabase (repli inchangé)", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { ...DB_ROW, image_url: "data:image/png;base64,ZZZZ" },
      error: null,
    });

    const url = await getApprovedVisualUrl("ingredient", DB_ROW.subject_id);

    expect(existsInR2Mock).not.toHaveBeenCalled();
    expect(createSignedUrlMock).not.toHaveBeenCalled();
    expect(url).toBe("data:image/png;base64,ZZZZ");
  });
});
