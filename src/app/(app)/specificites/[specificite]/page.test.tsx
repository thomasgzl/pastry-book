import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpecificitePage from "./page";

describe("SpecificitePage", () => {
  it("affiche la recette confirmée vegan avec un badge confirmé", async () => {
    render(await SpecificitePage({ params: Promise.resolve({ specificite: "vegan" }) }));

    expect(screen.getByRole("link", { name: /Pain aux noisettes/ })).toBeInTheDocument();
    expect(screen.getByText("confirmé")).toBeInTheDocument();
  });

  it("affiche la recette proposée sans jamais la présenter comme confirmée", async () => {
    render(await SpecificitePage({ params: Promise.resolve({ specificite: "sans-lactose" }) }));

    expect(screen.getByRole("link", { name: /Tarte au citron/ })).toBeInTheDocument();
    expect(screen.getByText("proposé, à vérifier")).toBeInTheDocument();
    expect(screen.queryByText("confirmé")).not.toBeInTheDocument();
  });

  it("affiche un état vide pour une spécificité sans recette", async () => {
    render(await SpecificitePage({ params: Promise.resolve({ specificite: "sans-gluten" }) }));
    expect(screen.getByText("Aucune recette pour cette spécificité pour le moment.")).toBeInTheDocument();
  });

  it("404 pour un slug inconnu", async () => {
    await expect(SpecificitePage({ params: Promise.resolve({ specificite: "inexistante" }) })).rejects.toThrow();
  });
});
