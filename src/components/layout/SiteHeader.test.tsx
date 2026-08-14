import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SiteHeader } from "./SiteHeader";

let pathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("SiteHeader", () => {
  it("affiche le titre du site et les cinq entrées de navigation principale, sans Hennessy", () => {
    pathname = "/";
    render(<SiteHeader />);

    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    ["Accueil", "Entreprises", "Recettes", "Matières premières", "Spécificités"].forEach(
      (label) => {
        expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
      },
    );
    expect(screen.queryByRole("link", { name: /Hennessy/ })).not.toBeInTheDocument();
  });

  it("marque la page courante avec aria-current", () => {
    pathname = "/recettes";
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    expect(within(nav).getByRole("link", { name: "Recettes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Accueil" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("le bouton Importer est visible mais désactivé, sans page /importer", () => {
    pathname = "/";
    render(<SiteHeader />);
    const importButtons = screen.getAllByRole("button", { name: "Importer" });
    importButtons.forEach((button) => expect(button).toBeDisabled());
  });

  it("le menu mobile s'ouvre et se ferme via le bouton hamburger", () => {
    pathname = "/";
    render(<SiteHeader />);

    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Navigation principale (mobile)" })).toBeNull();

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("navigation", { name: "Navigation principale (mobile)" }),
    ).toBeInTheDocument();
  });

  it("le bouton hamburger respecte une cible tactile d'au moins 44x44px", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Ouvrir le menu" });
    expect(toggle.className).toContain("min-h-11");
    expect(toggle.className).toContain("min-w-11");
  });
});
