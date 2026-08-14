import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecipeCard } from "./RecipeCard";

describe("RecipeCard", () => {
  it("affiche le titre, la source et un lien vers la fiche", () => {
    render(<RecipeCard title="Tarte au citron" sourceName="CAP Pâtissier" href="/recettes/tarte-au-citron" />);

    const link = screen.getByRole("link", { name: /Tarte au citron/ });
    expect(link).toHaveAttribute("href", "/recettes/tarte-au-citron");
    expect(screen.getByText("CAP Pâtissier")).toBeInTheDocument();
  });

  it("affiche la catégorie locale seulement si fournie", () => {
    const { rerender } = render(
      <RecipeCard title="Tarte au citron" sourceName="Hennessy" href="/recettes/1" />,
    );
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();

    rerender(
      <RecipeCard
        title="Tarte au citron"
        sourceName="Hennessy"
        categoryName="Desserts boutique"
        href="/recettes/1"
      />,
    );
    expect(screen.getByText("Hennessy · Desserts boutique")).toBeInTheDocument();
  });

  it("n'affiche jamais plus de deux tags même si la liste en contient davantage", () => {
    render(
      <RecipeCard
        title="Tarte au citron"
        sourceName="Hennessy"
        ingredientTags={["Citron", "Beurre", "Œuf", "Farine"]}
        href="/recettes/1"
      />,
    );
    expect(screen.getByText("Citron")).toBeInTheDocument();
    expect(screen.getByText("Beurre")).toBeInTheDocument();
    expect(screen.queryByText("Œuf")).not.toBeInTheDocument();
    expect(screen.queryByText("Farine")).not.toBeInTheDocument();
  });
});
