/**
 * Test ciblé niveau 1 (K3-UI) — réorganisation des préparations (monter/
 * descendre), même patron que `moveFile` (FilesStep, K3-IMPORT). Les boutons
 * n'apparaissent qu'à partir de deux préparations (rien à réordonner sinon).
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecipeDetailsStep } from "./RecipeDetailsStep";
import { createEmptyDraft, createEmptySection } from "../draftFactory";
import type { ImportRecipeDraft } from "@/lib/import/schema";

function draftWithTwoSections(): ImportRecipeDraft {
  const base = createEmptyDraft("source-1");
  const first = { ...createEmptySection(), id: "section-a", name: "Pâte sablée" };
  const second = { ...createEmptySection(), id: "section-b", name: "Crème citron" };
  return { ...base, sections: [first, second] };
}

describe("RecipeDetailsStep — réorganisation des préparations", () => {
  it("n'affiche aucun bouton de réorganisation pour une seule préparation", () => {
    render(
      <RecipeDetailsStep
        draft={createEmptyDraft("source-1")}
        canonicalIngredients={[]}
        specificities={[]}
        allergens={[]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /Descendre la préparation/ })).not.toBeInTheDocument();
  });

  it("échange deux préparations en cliquant sur « Descendre »", () => {
    const draft = draftWithTwoSections();
    const onChange = vi.fn();
    render(
      <RecipeDetailsStep
        draft={draft}
        canonicalIngredients={[]}
        specificities={[]}
        allergens={[]}
        onChange={(updater) => onChange(updater(draft))}
      />,
    );

    fireEvent.click(screen.getByLabelText("Descendre la préparation Pâte sablée"));
    expect(onChange).toHaveBeenCalledTimes(1);
    const result = onChange.mock.calls[0][0] as ImportRecipeDraft;
    expect(result.sections.map((s) => s.id)).toEqual(["section-b", "section-a"]);
  });

  it("désactive « Monter » sur la première préparation et « Descendre » sur la dernière", () => {
    const draft = draftWithTwoSections();
    render(
      <RecipeDetailsStep
        draft={draft}
        canonicalIngredients={[]}
        specificities={[]}
        allergens={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Monter la préparation Pâte sablée")).toBeDisabled();
    expect(screen.getByLabelText("Descendre la préparation Crème citron")).toBeDisabled();
    expect(screen.getByLabelText("Descendre la préparation Pâte sablée")).not.toBeDisabled();
    expect(screen.getByLabelText("Monter la préparation Crème citron")).not.toBeDisabled();
  });
});
