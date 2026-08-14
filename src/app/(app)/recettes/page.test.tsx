import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecettesPage from "./page";

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/recettes",
  useSearchParams: () => searchParams,
}));

describe("RecettesPage", () => {
  beforeEach(() => {
    replace.mockReset();
    searchParams = new URLSearchParams();
  });

  it("affiche toutes les recettes sans filtre", () => {
    render(<RecettesPage />);
    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeInTheDocument();
  });

  it("distingue les deux « Crème pâtissière » homonymes par leur source affichée", () => {
    render(<RecettesPage />);
    const links = screen.getAllByRole("link", { name: /Crème pâtissière/ });
    expect(links).toHaveLength(2);
    const sourceLines = links.map((link) => link.textContent ?? "");
    expect(sourceLines.some((text) => text.includes("CAP Pâtissier"))).toBe(true);
    expect(sourceLines.some((text) => text.includes("Hennessy"))).toBe(true);
  });

  it("filtre par titre déjà présent dans l'URL (?q=)", () => {
    searchParams = new URLSearchParams("q=citron");
    render(<RecettesPage />);
    expect(screen.getByRole("link", { name: /Tarte au citron/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Pâte sablée/ })).not.toBeInTheDocument();
  });

  it("filtre par source déjà présente dans l'URL (?source=)", () => {
    searchParams = new URLSearchParams("source=cap-patissier");
    render(<RecettesPage />);
    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Tarte au citron/ })).not.toBeInTheDocument();
  });

  it("met à jour l'URL (jamais un simple état local perdu) quand on tape dans la recherche", () => {
    render(<RecettesPage />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher une recette par titre" }), {
      target: { value: "citron" },
    });
    expect(replace).toHaveBeenCalledWith("/recettes?q=citron", { scroll: false });
  });

  it("affiche le filtre par entreprise puisque plusieurs sources ont des recettes", () => {
    render(<RecettesPage />);
    expect(screen.getByRole("group", { name: "Filtrer par entreprise" })).toBeInTheDocument();
  });

  it("affiche un état vide quand aucune recette ne correspond", () => {
    searchParams = new URLSearchParams("q=xyzabc-inexistant");
    render(<RecettesPage />);
    expect(screen.getByText("Aucune recette ne correspond à cette recherche.")).toBeInTheDocument();
  });
});
