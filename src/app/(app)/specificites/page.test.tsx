import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpecificitesPage from "./page";

describe("SpecificitesPage", () => {
  it("affiche deux sections séparées : Spécificités et Allergènes", () => {
    render(<SpecificitesPage />);
    expect(screen.getByRole("heading", { name: "Spécificités" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Allergènes" })).toBeInTheDocument();
  });

  it("liste Vegan, Sans gluten, Sans lactose et Gluten, Œufs, Lait, Fruits à coque", () => {
    render(<SpecificitesPage />);
    for (const name of ["Vegan", "Sans gluten", "Sans lactose", "Gluten", "Œufs", "Lait", "Fruits à coque"]) {
      expect(screen.getByRole("link", { name: new RegExp(name) })).toBeInTheDocument();
    }
  });

  it("lien vers la sous-page allergène distinct de la sous-page spécificité", () => {
    render(<SpecificitesPage />);
    expect(screen.getByRole("link", { name: /Vegan/ })).toHaveAttribute("href", "/specificites/vegan");
    expect(screen.getByRole("link", { name: /Gluten/ })).toHaveAttribute("href", "/specificites/allergenes/gluten");
  });
});
