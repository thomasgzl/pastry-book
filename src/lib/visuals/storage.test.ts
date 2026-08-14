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

describe("storage des visuels IA (E1)", () => {
  it("crée un brouillon avec les métadonnées de traçabilité complètes", () => {
    const asset = createDraftVisualAsset(draftInput());
    expect(asset.status).toBe("draft");
    expect(asset.isPrimary).toBe(false);
    expect(asset.prompt).toBe("prompt de test");
    expect(asset.presetVersion).toBe("v1");
    expect(asset.createdAt).toBeTruthy();
    expect(hasAnyVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId)).toBe(true);
  });

  it("l'approbation du premier visuel d'un sujet le publie automatiquement comme principal", () => {
    const asset = createDraftVisualAsset(draftInput());
    const approved = approveVisualAsset(asset.id);
    expect(approved.status).toBe("approved");
    expect(approved.isPrimary).toBe(true);
    expect(getPrimaryVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId)?.id).toBe(asset.id);
  });

  it("RÈGLE NON NÉGOCIABLE : approuver un second visuel ne remplace jamais silencieusement le principal existant", () => {
    const first = createDraftVisualAsset(draftInput());
    approveVisualAsset(first.id);

    const second = createDraftVisualAsset(draftInput());
    const approvedSecond = approveVisualAsset(second.id);

    expect(approvedSecond.status).toBe("approved");
    expect(approvedSecond.isPrimary).toBe(false);
    expect(getPrimaryVisualAsset(SUBJECT.subjectType, SUBJECT.subjectId)?.id).toBe(first.id);
  });

  it("une nouvelle génération pour un sujet déjà approuvé crée un brouillon à côté, sans toucher l'existant", () => {
    const first = createDraftVisualAsset(draftInput());
    const approved = approveVisualAsset(first.id);

    const regenerated = createDraftVisualAsset(draftInput());

    expect(regenerated.id).not.toBe(approved.id);
    expect(regenerated.status).toBe("draft");
    expect(getVisualAssetById(approved.id)).toEqual(approved);
    expect(listVisualAssets(SUBJECT.subjectType, SUBJECT.subjectId)).toHaveLength(2);
  });

  it("« Définir comme principal » exige un visuel déjà approuvé", () => {
    const draft = createDraftVisualAsset(draftInput());
    expect(() => setPrimaryVisualAsset(draft.id)).toThrow(VisualAssetActionError);
  });

  it("« Définir comme principal » transfère le statut sans rejeter ni supprimer l'ancien principal", () => {
    const first = createDraftVisualAsset(draftInput());
    approveVisualAsset(first.id);
    const second = createDraftVisualAsset(draftInput());
    approveVisualAsset(second.id);

    const promoted = setPrimaryVisualAsset(second.id);

    expect(promoted.isPrimary).toBe(true);
    const oldPrimary = getVisualAssetById(first.id)!;
    expect(oldPrimary.isPrimary).toBe(false);
    expect(oldPrimary.status).toBe("approved");
  });

  it("le rejet retire le statut principal éventuel", () => {
    const asset = createDraftVisualAsset(draftInput());
    approveVisualAsset(asset.id);
    const rejected = rejectVisualAsset(asset.id);
    expect(rejected.status).toBe("rejected");
    expect(rejected.isPrimary).toBe(false);
  });

  it("une action sur un identifiant inconnu échoue explicitement (jamais une valeur inventée)", () => {
    expect(() => approveVisualAsset("00000000-0000-4000-8000-999999999999")).toThrow(VisualAssetActionError);
  });
});
