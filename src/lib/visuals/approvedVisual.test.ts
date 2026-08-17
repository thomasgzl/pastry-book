import { beforeEach, describe, expect, it } from "vitest";
import { approveVisualAsset, createDraftVisualAsset, seedVisualAssetsStore } from "./storage";
import { getApprovedVisualUrl } from "./approvedVisual";

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

describe("getApprovedVisualUrl (lot J, mode mémoire — Supabase non configuré dans les tests)", () => {
  it("retourne null si le sujet n'a aucun visuel", async () => {
    expect(await getApprovedVisualUrl(SUBJECT.subjectType, SUBJECT.subjectId)).toBeNull();
  });

  it("retourne null si le sujet n'a qu'un brouillon (jamais publié)", async () => {
    await createDraftVisualAsset(draftInput());
    expect(await getApprovedVisualUrl(SUBJECT.subjectType, SUBJECT.subjectId)).toBeNull();
  });

  it("RÈGLE NON NÉGOCIABLE : ne retourne jamais un brouillon, même si un autre sujet a un principal", async () => {
    await createDraftVisualAsset(draftInput());
    await createDraftVisualAsset(draftInput({ subjectId: "00000000-0000-4000-8000-000000009002" }));
    const otherApproved = await createDraftVisualAsset(
      draftInput({ subjectId: "00000000-0000-4000-8000-000000009002" }),
    );
    await approveVisualAsset(otherApproved.id);

    expect(await getApprovedVisualUrl(SUBJECT.subjectType, SUBJECT.subjectId)).toBeNull();
  });

  it("retourne la data URI du visuel principal approuvé telle quelle (aucune re-signature)", async () => {
    const asset = await createDraftVisualAsset(draftInput({ imageUrl: "data:image/png;base64,ZZZZ" }));
    await approveVisualAsset(asset.id);

    expect(await getApprovedVisualUrl(SUBJECT.subjectType, SUBJECT.subjectId)).toBe("data:image/png;base64,ZZZZ");
  });

  it("un second visuel approuvé mais non principal n'est jamais retourné (un seul principal par sujet)", async () => {
    const first = await createDraftVisualAsset(draftInput({ imageUrl: "data:image/png;base64,FIRST" }));
    await approveVisualAsset(first.id);
    const second = await createDraftVisualAsset(draftInput({ imageUrl: "data:image/png;base64,SECOND" }));
    await approveVisualAsset(second.id);

    expect(await getApprovedVisualUrl(SUBJECT.subjectType, SUBJECT.subjectId)).toBe("data:image/png;base64,FIRST");
  });
});
