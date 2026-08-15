import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IllustrationAction } from "./IllustrationAction";

describe("IllustrationAction", () => {
  it("sujet manquant : « Créer une illustration » vers la file des manquants filtrée sur ce sujet", () => {
    render(<IllustrationAction subjectType="recipe" hasVisual={false} label="Tarte au citron" />);
    const link = screen.getByRole("link", { name: "Créer une illustration" });
    expect(link).toHaveAttribute("href", "/illustrations/manquantes?q=Tarte%20au%20citron");
  });

  it("sujet déjà pourvu : « Nouvelle version » vers le centre filtré, jamais un appel direct", () => {
    render(<IllustrationAction subjectType="ingredient" hasVisual label="Citron" />);
    const link = screen.getByRole("link", { name: "Nouvelle version" });
    expect(link).toHaveAttribute("href", "/illustrations?type=ingredient&q=Citron");
  });
});
