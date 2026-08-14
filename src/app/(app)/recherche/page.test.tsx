import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecherchePage from "./page";

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/recherche",
  useSearchParams: () => searchParams,
}));

describe("RecherchePage", () => {
  beforeEach(() => {
    replace.mockReset();
    searchParams = new URLSearchParams();
  });

  it("invite à saisir une recherche quand la requête est vide", () => {
    render(<RecherchePage />);
    expect(screen.getByText("Tapez une recherche pour commencer.")).toBeInTheDocument();
  });

  it("« citron » retrouve la matière première et la recette, groupées par type", () => {
    searchParams = new URLSearchParams("q=citron");
    render(<RecherchePage />);

    expect(screen.getByRole("heading", { name: "Matières premières" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recettes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Citron" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron/ })).toBeInTheDocument();
  });

  it("« hennessy » retrouve l'entreprise et ses catégories, chaque catégorie indiquant sa source", () => {
    searchParams = new URLSearchParams("q=hennessy");
    render(<RecherchePage />);

    expect(screen.getByRole("heading", { name: "Entreprises" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hennessy" })).toBeInTheDocument();
  });

  it("affiche un état vide pour une recherche sans résultat", () => {
    searchParams = new URLSearchParams("q=xyzabc-inexistant");
    render(<RecherchePage />);
    expect(screen.getByText("Aucun résultat pour cette recherche.")).toBeInTheDocument();
  });
});
