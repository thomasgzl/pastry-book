import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests ciblés (niveau 1, K10) de `persistGeneratedVisual` sur la voie R2 +
 * Supabase réellement configurés — client R2/base entièrement mocké, aucune
 * connexion réseau réelle, aucun appel OpenAI. Couvre l'ordre imposé
 * (valider → R2 → base → `draft`), l'absence de tout succès annoncé avant
 * persistance confirmée, et les trois scénarios d'échec demandés : R2 seul,
 * base seule, échec des deux (nettoyage impossible).
 *
 * La voie « R2 non configuré » (store mémoire, data URI conservée telle
 * quelle) reste couverte par les tests existants et inchangés
 * `service.test.ts` / `real-generation.test.ts` / `storage.test.ts`.
 */

// Vrai PNG 4x4 (Sharp s'exécute réellement sur ces octets depuis K-optim — plus un contenu factice).
const PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEElEQVQImWPgEpGDIwbiOABgdAPBAI1kjQAAAABJRU5ErkJggg==";
const SVG_DATA_URI = "data:image/svg+xml;base64,PHN2Zy8+"; // format démo, jamais accepté par le bucket

const { uploadMock, removeMock, insertSingleMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
  removeMock: vi.fn(),
  insertSingleMock: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  hasSupabaseConfig: () => true,
}));

vi.mock("@/lib/r2", () => ({
  hasR2Config: () => true,
  uploadToR2: uploadMock,
  deleteFromR2: removeMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    from(table: string) {
      if (table === "visual_assets") {
        return {
          insert: () => ({
            select: () => ({
              single: insertSingleMock,
            }),
          }),
        };
      }
      throw new Error(`from("${table}") inattendu dans ce test mocké`);
    },
  }),
}));

const { persistGeneratedVisual, VisualAssetPersistenceError, VisualGenerationValidationError } = await import(
  "./storage"
);

const SUBJECT = { subjectType: "ingredient" as const, subjectId: "00000000-0000-4000-8000-000000009301" };

function baseInput(overrides: Partial<Parameters<typeof persistGeneratedVisual>[0]> = {}) {
  return {
    ...SUBJECT,
    sourcePhotoUrl: null,
    prompt: "prompt de test",
    presetVersion: "v1",
    generatedImageUrl: PNG_DATA_URI,
    ...overrides,
  };
}

const DB_ROW = {
  id: "asset-1",
  subject_type: "ingredient",
  subject_id: SUBJECT.subjectId,
  status: "draft",
  is_primary: false,
  image_url: "ingredient/00000000-0000-4000-8000-000000009301/generated-uuid.png",
  source_photo_url: null,
  prompt: "prompt de test",
  preset_version: "v1",
  created_at: "2026-08-15T00:00:00.000Z",
};

beforeEach(() => {
  uploadMock.mockReset();
  removeMock.mockReset();
  insertSingleMock.mockReset();
});

describe("persistGeneratedVisual (K10) — validation avant tout stockage", () => {
  it("rejette une réponse qui n'est pas une data URI, sans appeler Storage ni la base", async () => {
    await expect(
      persistGeneratedVisual(baseInput({ generatedImageUrl: "https://example.com/img.png" })),
    ).rejects.toThrow(VisualGenerationValidationError);
    expect(uploadMock).not.toHaveBeenCalled();
    expect(insertSingleMock).not.toHaveBeenCalled();
  });

  it("rejette un contenu décodé vide", async () => {
    await expect(
      persistGeneratedVisual(baseInput({ generatedImageUrl: "data:image/png;base64," })),
    ).rejects.toThrow(VisualGenerationValidationError);
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("rejette un type déclaré non-image", async () => {
    await expect(
      persistGeneratedVisual(baseInput({ generatedImageUrl: "data:text/plain;base64,aGVsbG8=" })),
    ).rejects.toThrow(VisualGenerationValidationError);
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

describe("persistGeneratedVisual (K10) — succès : ordre Storage puis base, statut draft", () => {
  it("stocke réellement l'image dans le bucket avant d'écrire les métadonnées, retourne un brouillon", async () => {
    const callOrder: string[] = [];
    uploadMock.mockImplementation(async () => {
      callOrder.push("upload");
    });
    insertSingleMock.mockImplementation(async () => {
      callOrder.push("insert");
      return { data: DB_ROW, error: null };
    });

    const asset = await persistGeneratedVisual(baseInput());

    expect(callOrder).toEqual(["upload", "insert"]);
    expect(asset.status).toBe("draft");
    expect(asset.isPrimary).toBe(false);
    // L'image_url persisté est un chemin R2, jamais la data URI brute renvoyée par le fournisseur.
    expect(asset.imageUrl).not.toMatch(/^data:/);
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(/^ingredient\/00000000-0000-4000-8000-000000009301\/.+\.webp$/),
      expect.any(Buffer),
      "image/webp",
    );
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("format démo (SVG) : jamais envoyé au bucket même avec Supabase configuré — data URI conservée telle quelle", async () => {
    // ponytail: le bucket `visual-assets` n'accepte que PNG/WebP (migration K-S1) —
    // le SVG de démo reste stocké en base sans upload, comportement inchangé.
    insertSingleMock.mockResolvedValue({
      data: { ...DB_ROW, image_url: SVG_DATA_URI },
      error: null,
    });

    const asset = await persistGeneratedVisual(baseInput({ generatedImageUrl: SVG_DATA_URI }));

    expect(uploadMock).not.toHaveBeenCalled();
    expect(asset.imageUrl).toBe(SVG_DATA_URI);
  });
});

describe("persistGeneratedVisual (K10) — aucun succès annoncé avant persistance confirmée", () => {
  it("échec Storage seul : rejette, n'écrit jamais en base, ne tente aucun nettoyage", async () => {
    uploadMock.mockRejectedValue(new Error("quota Storage dépassé"));

    await expect(persistGeneratedVisual(baseInput())).rejects.toThrow(VisualAssetPersistenceError);

    expect(insertSingleMock).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("échec base seul : Storage a réussi puis échoue en base → nettoyage tenté et réussi, incident journalisé, jamais de succès retourné", async () => {
    uploadMock.mockResolvedValue(undefined);
    insertSingleMock.mockResolvedValue({ data: null, error: { message: "contrainte violée" } });
    removeMock.mockResolvedValue(undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(persistGeneratedVisual(baseInput())).rejects.toThrow(VisualAssetPersistenceError);

    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(removeMock).toHaveBeenCalledTimes(1);
    const [path] = removeMock.mock.calls[0];
    expect(path).toEqual(expect.arrayContaining([expect.stringMatching(/\.webp$/)]));
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("nettoyé avec succès"),
      expect.objectContaining({ cleanup: "removed" }),
    );
    warnSpy.mockRestore();
  });

  it("échec des deux : Storage réussit, base échoue, ET le nettoyage échoue aussi → incident journalisé comme orphelin, jamais de succès, jamais perdu silencieusement", async () => {
    uploadMock.mockResolvedValue(undefined);
    insertSingleMock.mockResolvedValue({ data: null, error: { message: "contrainte violée" } });
    removeMock.mockRejectedValue(new Error("suppression impossible"));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(persistGeneratedVisual(baseInput())).rejects.toThrow(VisualAssetPersistenceError);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ÉCHEC DU NETTOYAGE"),
      expect.objectContaining({ cleanup: "cleanup_failed" }),
    );
    warnSpy.mockRestore();
  });
});
