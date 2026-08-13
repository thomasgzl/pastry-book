import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SourceCard } from "./SourceCard";

describe("SourceCard", () => {
  it("affiche le nom, le nombre de recettes et un lien vers la source", () => {
    render(<SourceCard name="Hennessy" recipeCount={12} href="/entreprises/hennessy" />);

    const link = screen.getByRole("link", { name: /Hennessy/ });
    expect(link).toHaveAttribute("href", "/entreprises/hennessy");
    expect(screen.getByText("12 recettes")).toBeInTheDocument();
  });

  it("accorde « recette » au singulier", () => {
    render(<SourceCard name="Personnel" recipeCount={1} href="/entreprises/personnel" />);
    expect(screen.getByText("1 recette")).toBeInTheDocument();
  });

  it("affiche un monogramme placeholder sans imageUrl", () => {
    const { container } = render(<SourceCard name="CAP Pâtissier" recipeCount={3} href="/entreprises/cap" />);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});
