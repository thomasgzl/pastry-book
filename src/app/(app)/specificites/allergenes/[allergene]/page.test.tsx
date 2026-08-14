import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AllergenePage from "./page";

describe("AllergenePage", () => {
  it("distingue confirmé et proposé/à vérifier pour un même allergène", async () => {
    render(await AllergenePage({ params: Promise.resolve({ allergene: "lait" }) }));

    // Crème pâtissière (Hennessy) : lait confirmé. Tarte au citron (Hennessy) : lait proposé.
    expect(screen.getAllByText("confirmé").length).toBeGreaterThan(0);
    expect(screen.getAllByText("proposé, à vérifier").length).toBeGreaterThan(0);
  });

  it("un allergène needs_review n'est jamais affiché comme confirmé", async () => {
    render(await AllergenePage({ params: Promise.resolve({ allergene: "gluten" }) }));
    // Crème pâtissière (Hennessy) : gluten en needs_review -> affiché « à vérifier ».
    const cremeLink = screen.getByRole("link", { name: /Crème pâtissière \(Hennessy\)/ });
    const card = cremeLink.closest("div")?.parentElement;
    expect(card?.textContent).toContain("à vérifier");
  });

  it("404 pour un slug inconnu", async () => {
    await expect(AllergenePage({ params: Promise.resolve({ allergene: "inexistant" }) })).rejects.toThrow();
  });
});
