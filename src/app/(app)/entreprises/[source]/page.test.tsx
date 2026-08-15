import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EntreprisePage from "./page";

describe("EntreprisePage — Hennessy", () => {
  it("affiche uniquement les catégories Hennessy non vides", async () => {
    render(await EntreprisePage({ params: Promise.resolve({ source: "hennessy" }) }));

    expect(screen.getByRole("link", { name: /Desserts boutique/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Recettes de base/ })).toBeInTheDocument();
    // Vides dans le jeu démo : jamais affichées (CLAUDE.md, aucune section vide).
    expect(screen.queryByRole("link", { name: /Desserts à l'assiette/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Petit-déjeuner/ })).not.toBeInTheDocument();
  });

  it("n'affiche jamais les catégories Hennessy pour une autre source", async () => {
    render(await EntreprisePage({ params: Promise.resolve({ source: "cap-patissier" }) }));

    for (const label of ["Desserts à l'assiette", "Desserts boutique", "Recettes de base", "Petit-déjeuner"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("affiche directement les recettes sans catégorie d'une source sans catégories", async () => {
    render(await EntreprisePage({ params: Promise.resolve({ source: "cap-patissier" }) }));

    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Crème pâtissière \(CAP\)/ })).toBeInTheDocument();
  });

  it("404 pour une source inconnue", async () => {
    await expect(EntreprisePage({ params: Promise.resolve({ source: "inexistante" }) })).rejects.toThrow();
  });

  it("aucun visuel approuvé : portrait placeholder + action « Créer une illustration » (K12)", async () => {
    const { container } = render(await EntreprisePage({ params: Promise.resolve({ source: "cap-patissier" }) }));

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByRole("link", { name: "Créer une illustration" })).toHaveAttribute(
      "href",
      "/illustrations/manquantes?q=CAP%20P%C3%A2tissier",
    );
  });

  it("Hennessy n'a qu'un brouillon (démo) : jamais affiché, considéré comme non illustré (K12)", async () => {
    const { container } = render(await EntreprisePage({ params: Promise.resolve({ source: "hennessy" }) }));

    // Le portrait de tête de page reste le repli placeholder — le brouillon
    // existant (`status: "draft"`, fixtures E4) n'est jamais principal ni
    // rendu publiquement (`getApprovedVisualUrl` exige `approved`+`isPrimary`).
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.getByRole("link", { name: "Créer une illustration" })).toHaveAttribute(
      "href",
      "/illustrations/manquantes?q=Hennessy",
    );
  });
});
