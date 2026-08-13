import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanonicalIngredientCard } from "./CanonicalIngredientCard";

describe("CanonicalIngredientCard", () => {
  it("affiche le nom canonique, le nombre de recettes et un lien", () => {
    render(<CanonicalIngredientCard name="Citron" recipeCount={24} href="/matieres-premieres/citron" />);

    const link = screen.getByRole("link", { name: /Citron/ });
    expect(link).toHaveAttribute("href", "/matieres-premieres/citron");
    expect(screen.getByText("24 recettes")).toBeInTheDocument();
  });
});
