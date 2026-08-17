import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { approveVisualAsset, createDraftVisualAsset, seedVisualAssetsStore } from "@/lib/visuals/storage";
import { ApprovedVisual } from "./ApprovedVisual";

const SUBJECT = { subjectType: "ingredient" as const, subjectId: "00000000-0000-4000-8000-000000009101" };

beforeEach(() => {
  seedVisualAssetsStore([]);
});

/**
 * Composant async : on l'appelle directement (`await ApprovedVisual(props)`)
 * plutôt qu'en JSX — un élément JSX async non résolu casse le
 * reconciliateur client de `@testing-library/react` (constaté lot J, voir
 * `recettes/[slug]/page.tsx`).
 */
describe("ApprovedVisual", () => {
  it("affiche le repli placeholder (alt vide) si le sujet n'a aucun visuel approuvé", async () => {
    const element = await ApprovedVisual({
      subjectType: SUBJECT.subjectType,
      subjectId: SUBJECT.subjectId,
      alt: "Citron",
    });
    const { container } = render(element);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/visuals/placeholders/placeholder-recipe-4x3.svg");
    expect(img).toHaveAttribute("alt", "");
  });

  it("affiche le visuel approuvé avec le texte alternatif fourni", async () => {
    const draft = await createDraftVisualAsset({
      ...SUBJECT,
      imageUrl: "data:image/svg+xml;base64,AAAA",
      sourcePhotoUrl: null,
      prompt: "prompt de test",
      presetVersion: "v1",
    });
    await approveVisualAsset(draft.id);

    const element = await ApprovedVisual({
      subjectType: SUBJECT.subjectType,
      subjectId: SUBJECT.subjectId,
      alt: "Citron",
    });
    const { container } = render(element);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "data:image/svg+xml;base64,AAAA");
    expect(img).toHaveAttribute("alt", "Citron");
  });

  it("matière première : cadrage `contain` (image entière visible), jamais recadrée", async () => {
    const element = await ApprovedVisual({
      subjectType: "ingredient",
      subjectId: SUBJECT.subjectId,
      alt: "Citron",
    });
    const { container } = render(element);
    expect(container.querySelector("img")?.className).toContain("object-contain");
  });
});
