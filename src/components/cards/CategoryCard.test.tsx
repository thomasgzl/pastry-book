import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryCard } from "./CategoryCard";

describe("CategoryCard", () => {
  it("affiche le nom, le nombre de recettes et un lien", () => {
    render(<CategoryCard name="Desserts boutique" recipeCount={8} href="/entreprises/hennessy/desserts-boutique" />);

    const link = screen.getByRole("link", { name: /Desserts boutique/ });
    expect(link).toHaveAttribute("href", "/entreprises/hennessy/desserts-boutique");
    expect(screen.getByText("8 recettes")).toBeInTheDocument();
  });
});
