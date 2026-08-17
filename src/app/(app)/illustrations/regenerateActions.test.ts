/**
 * Tests ciblés niveau 1 (K11) — `regenerateVersionAction` : phrase de
 * confirmation nommée obligatoire, garde d'idempotence (`aiCostGuard.ts`,
 * déjà testé ailleurs — vérifié ici seulement au niveau de son effet), appel
 * de génération avec les mêmes champs de prompt que ceux affichés
 * (`preparationNames`/`validatedKeyIngredientNames`/`additionalInformation`).
 * `generateVisualDraft`/`getVisualSubject`/`next/cache` entièrement mockés :
 * aucun appel réseau, aucun appel OpenAI.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateVisualDraftMock, getVisualSubjectMock, revalidatePathMock } = vi.hoisted(() => ({
  generateVisualDraftMock: vi.fn(),
  getVisualSubjectMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/ai/visuals/service", () => ({
  generateVisualDraft: generateVisualDraftMock,
}));
vi.mock("@/lib/visuals/subjects", () => ({
  getVisualSubject: getVisualSubjectMock,
}));
vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const { regenerateVersionAction, INITIAL_REGENERATE_STATE } = await import("./regenerateActions");

const SUBJECT = {
  type: "ingredient" as const,
  id: "00000000-0000-4000-8000-000000006001",
  slug: "citron",
  label: "Citron",
  photoUrl: null,
  categorySlug: undefined,
  preparationNames: undefined,
  validatedKeyIngredientNames: undefined,
  additionalInformation: null,
};

function formData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("subjectType", SUBJECT.type);
  data.set("subjectId", SUBJECT.id);
  data.set("confirmation", "GENERER LOT 1");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

beforeEach(() => {
  generateVisualDraftMock.mockReset();
  getVisualSubjectMock.mockReset();
  revalidatePathMock.mockReset();
  getVisualSubjectMock.mockResolvedValue(SUBJECT);
});

describe("regenerateVersionAction (K11)", () => {
  it("refuse sans la phrase de confirmation exacte, ne génère rien", async () => {
    const state = await regenerateVersionAction(INITIAL_REGENERATE_STATE, formData({ confirmation: "oui" }));
    expect(state.error).toMatch(/Confirmation invalide/);
    expect(generateVisualDraftMock).not.toHaveBeenCalled();
  });

  it("refuse un sujet introuvable, ne génère rien", async () => {
    getVisualSubjectMock.mockResolvedValueOnce(undefined);
    const state = await regenerateVersionAction(INITIAL_REGENERATE_STATE, formData());
    expect(state.error).toMatch(/introuvable/);
    expect(generateVisualDraftMock).not.toHaveBeenCalled();
  });

  it("phrase correcte : génère un nouveau brouillon avec les mêmes champs de prompt que le sujet, puis revalide les pages concernées", async () => {
    generateVisualDraftMock.mockResolvedValue({ id: "new-asset", status: "draft" });

    const state = await regenerateVersionAction(INITIAL_REGENERATE_STATE, formData());

    expect(state.error).toBeNull();
    expect(state.success).toBe(true);
    expect(generateVisualDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({ subjectType: "ingredient", subjectId: SUBJECT.id, subjectLabel: "Citron" }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/illustrations");
    expect(revalidatePathMock).toHaveBeenCalledWith("/illustrations/manquantes");
    expect(revalidatePathMock).toHaveBeenCalledWith("/visuels");
  });

  it("une soumission déjà en cours pour le même sujet est refusée (idempotence, pas de doublon silencieux)", async () => {
    generateVisualDraftMock.mockImplementation(() => new Promise(() => {})); // ne se résout jamais pendant ce test
    void regenerateVersionAction(INITIAL_REGENERATE_STATE, formData());

    const second = await regenerateVersionAction(INITIAL_REGENERATE_STATE, formData());
    expect(second.error).toMatch(/déjà en cours/);
  });
});
