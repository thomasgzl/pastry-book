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

  it("aucun visuel approuvé : portrait placeholder en en-tête + action « Créer une illustration » (K12)", async () => {
    const { container } = render(
      await CategoriePage({ params: Promise.resolve({ source: "hennessy", categorie: "desserts-boutique" }) }),
    );

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByRole("link", { name: "Créer une illustration" })).toHaveAttribute(
      "href",
      "/illustrations/manquantes?q=Desserts%20boutique",
    );
  });

  it("visuel approuvé (démo, K11) : portrait réel en en-tête + action « Nouvelle version » (K12)", async () => {
    render(await CategoriePage({ params: Promise.resolve({ source: "hennessy", categorie: "recettes-de-base" }) }));

    const portrait = screen.getByAltText("Recettes de base");
    expect(portrait).toHaveAttribute("src", expect.stringMatching(/^data:image\/svg\+xml;base64,/));
    expect(screen.getByRole("link", { name: "Nouvelle version" })).toHaveAttribute(
      "href",
      "/illustrations?type=sourceCategory&q=Recettes%20de%20base",
    );
  });
});
