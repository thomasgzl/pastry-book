import { beforeEach, describe, expect, it } from "vitest";
import {
  VisualAssetActionError,
  approveVisualAsset,
  createDraftVisualAsset,
  getPrimaryVisualAsset,
  getVisualAssetById,
  hasAnyVisualAsset,
  listVisualAssets,
  rejectVisualAsset,
  seedVisualAssetsStore,
  setPrimaryVisualAsset,
} from "./storage";

const SUBJECT = { subjectType: "ingredient" as const, subjectId: "00000000-0000-4000-8000-000000009001" };

function draftInput(overrides: Partial<Parameters<typeof createDraftVisualAsset>[0]> = {}) {
  return {
    ...SUBJECT,
    imageUrl: "data:image/svg+xml;base64,AAAA",
    sourcePhotoUrl: null,
    prompt: "prompt de test",
    presetVersion: "v1",
    ...overrides,
  };
}

beforeEach(() => {
  seedVisualAssetsStore([]);
});

describe("storage des visuels IA (E1, mode mémoire — I5 : Supabase non configuré dans les tests)", () => {
  it("crée un brouillon avec les métadonnées de traçabilité complètes", async () => {
    const asset = await createDraftVisualAsset(draftInput());
    expect(asset.status).toBe("draft");
    expect(asset.isPrimary).toBe(false);
    expect(asset.prompt).toBe("prompt de test");
    expect(asset.presetVersion).toBe("v1");
    expect(asset.createdAt).toBeTruthy();
    expect(await hasAnyVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId)).toBe(true);
  });

  it("l'approbation du premier visuel d'un sujet le publie automatiquement comme principal", async () => {
    const asset = await createDraftVisualAsset(draftInput());
    const approved = await approveVisualAsset(asset.id);
    expect(approved.status).toBe("approved");
    expect(approved.isPrimary).toBe(true);
    expect((await getPrimaryVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId))?.id).toBe(asset.id);
  });

  it("RÈGLE NON NÉGOCIABLE : approuver un second visuel ne remplace jamais silencieusement le principal existant", async () => {
    const first = await createDraftVisualAsset(draftInput());
    await approveVisualAsset(first.id);

    const second = await createDraftVisualAsset(draftInput());
    const approvedSecond = await approveVisualAsset(second.id);

    expect(approvedSecond.status).toBe("approved");
    expect(approvedSecond.isPrimary).toBe(false);
    expect((await getPrimaryVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId))?.id).toBe(first.id);
  });

  it("une nouvelle génération pour un sujet déjà approuvé crée un brouillon à côté, sans toucher l'existant", async () => {
    const first = await createDraftVisualAsset(draftInput());
    const approved = await approveVisualAsset(first.id);

    const regenerated = await createDraftVisualAsset(draftInput());

    expect(regenerated.id).not.toBe(approved.id);
    expect(regenerated.status).toBe("draft");
    expect(await getVisualAssetById(approved.id)).toEqual(approved);
    expect(await listVisualAssets(SUBJECT.subjectType, SUBJECT.subjectId)).toHaveLength(2);
  });

  it("« Définir comme principal » exige un visuel déjà approuvé", async () => {
    const draft = await createDraftVisualAsset(draftInput());
    await expect(setPrimaryVisualAsset(draft.id)).rejects.toThrow(VisualAssetActionError);
  });

  it("« Définir comme principal » transfère le statut sans rejeter ni supprimer l'ancien principal", async () => {
    const first = await createDraftVisualAsset(draftInput());
    await approveVisualAsset(first.id);
    const second = await createDraftVisualAsset(draftInput());
    await approveVisualAsset(second.id);

    const promoted = await setPrimaryVisualAsset(second.id);

    expect(promoted.isPrimary).toBe(true);
    const oldPrimary = (await getVisualAssetById(first.id))!;
    expect(oldPrimary.isPrimary).toBe(false);
    expect(oldPrimary.status).toBe("approved");
  });

  it("parcours de versionnement (G3) : approuver puis définir comme principal un nouveau brouillon bascule atomiquement, jamais deux principaux", async () => {
    const first = await createDraftVisualAsset(draftInput());
    await approveVisualAsset(first.id); // devient principal (premier du sujet)

    const second = await createDraftVisualAsset(draftInput()); // coexiste avec l'approuvé, sans le toucher
    expect((await getPrimaryVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId))?.id).toBe(first.id);

    await approveVisualAsset(second.id);
    const promoted = await setPrimaryVisualAsset(second.id); // séquence utilisée par `approveAsPrimaryAction`

    expect(promoted.status).toBe("approved");
    expect(promoted.isPrimary).toBe(true);
    const oldPrimary = (await getVisualAssetById(first.id))!;
    expect(oldPrimary.status).toBe("approved");
    expect(oldPrimary.isPrimary).toBe(false);

    const allPrimary = (await listVisualAssets(SUBJECT.subjectType, SUBJECT.subjectId)).filter((a) => a.isPrimary);
    expect(allPrimary).toHaveLength(1);
    expect(allPrimary[0].id).toBe(second.id);
  });

  it("rejeter un brouillon coexistant n'affecte jamais le principal approuvé", async () => {
    const first = await createDraftVisualAsset(draftInput());
    await approveVisualAsset(first.id);
    const second = await createDraftVisualAsset(draftInput());

    const rejected = await rejectVisualAsset(second.id);

    expect(rejected.status).toBe("rejected");
    const primary = (await getVisualAssetById(first.id))!;
    expect(primary.status).toBe("approved");
    expect(primary.isPrimary).toBe(true);
  });

  it("le rejet retire le statut principal éventuel", async () => {
    const asset = await createDraftVisualAsset(draftInput());
    await approveVisualAsset(asset.id);
    const rejected = await rejectVisualAsset(asset.id);
    expect(rejected.status).toBe("rejected");
    expect(rejected.isPrimary).toBe(false);
  });

  it("une action sur un identifiant inconnu échoue explicitement (jamais une valeur inventée)", async () => {
    await expect(approveVisualAsset("00000000-0000-4000-8000-999999999999")).rejects.toThrow(VisualAssetActionError);
  });
});
