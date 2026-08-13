import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CategoriePage from "./page";

describe("CategoriePage", () => {
  it("affiche les recettes de la catégorie et le fil d'Ariane complet", async () => {
    render(
      await CategoriePage({
        params: Promise.resolve({ source: "hennessy", categorie: "desserts-boutique" }),
      }),
    );

    expect(screen.getByRole("heading", { name: "Desserts boutique" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeInTheDocument();
    expect(screen.getByText("Hennessy")).toBeInTheDocument();
  });

  it("404 pour une catégorie inconnue", async () => {
    await expect(
      CategoriePage({ params: Promise.resolve({ source: "hennessy", categorie: "inexistante" }) }),
    ).rejects.toThrow();
  });

  it("404 si la catégorie demandée n'appartient pas à cette source", async () => {
    await expect(
      CategoriePage({ params: Promise.resolve({ source: "cap-patissier", categorie: "desserts-boutique" }) }),
    ).rejects.toThrow();
  });
});
