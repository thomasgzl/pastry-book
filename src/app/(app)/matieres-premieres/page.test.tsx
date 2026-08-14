import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatieresPremieresPage from "./page";

describe("MatieresPremieresPage", () => {
  it("liste au moins Citron, Pistache, Chocolat, Vanille, Noisette, Poire", () => {
    render(<MatieresPremieresPage />);
    for (const name of ["Citron", "Pistache", "Chocolat", "Vanille", "Noisette", "Poire"]) {
      expect(screen.getByRole("link", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("affiche un nombre de recettes calculé dynamiquement", () => {
    render(<MatieresPremieresPage />);
    const citronLink = screen.getByRole("link", { name: /Citron/ });
    expect(citronLink).toHaveTextContent("1 recette");
  });
});
