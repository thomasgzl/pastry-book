import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("HomePage", () => {
  beforeEach(() => {
    push.mockReset();
  });

  it("affiche le titre, le sous-titre et les quatre accès de poids visuel égal", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" })).toBeInTheDocument();
    expect(screen.getByText("Archive privée de recettes professionnelles")).toBeInTheDocument();

    for (const label of ["Par entreprise", "Par recette", "Par matière première", "Par spécificité"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("n'affiche aucun bouton Importer (celui du header suffit, CBF2)", () => {
    render(<HomePage />);
    expect(screen.queryByRole("button", { name: "Importer" })).not.toBeInTheDocument();
  });

  it("les liens pointent vers les quatre répertoires attendus", () => {
    render(<HomePage />);
    expect(screen.getByRole("link", { name: "Par entreprise" })).toHaveAttribute("href", "/entreprises");
    expect(screen.getByRole("link", { name: "Par recette" })).toHaveAttribute("href", "/recettes");
    expect(screen.getByRole("link", { name: "Par matière première" })).toHaveAttribute(
      "href",
      "/matieres-premieres",
    );
    expect(screen.getByRole("link", { name: "Par spécificité" })).toHaveAttribute("href", "/specificites");
  });

  it("redirige vers /recherche avec la requête une fois débouncée", async () => {
    vi.useFakeTimers();
    render(<HomePage />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Recherche globale" }), {
      target: { value: "citron" },
    });

    vi.advanceTimersByTime(300);
    vi.useRealTimers();

    expect(push).toHaveBeenCalledWith("/recherche?q=citron");
  });
});
