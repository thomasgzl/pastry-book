import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EntreprisesPage from "./page";

describe("EntreprisesPage", () => {
  it("affiche les 4 sources avec un nombre de recettes calculé", () => {
    render(<EntreprisesPage />);

    const hennessyLink = screen.getByRole("link", { name: /Hennessy/ });
    expect(hennessyLink).toHaveAttribute("href", "/entreprises/hennessy");
    expect(within(hennessyLink).getByText("2 recettes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CAP Pâtissier/ })).toHaveAttribute(
      "href",
      "/entreprises/cap-patissier",
    );
  });

  it("affiche le fil d'Ariane Accueil > Entreprises", () => {
    render(<EntreprisesPage />);
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeInTheDocument();
  });
});
