import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EntreprisesPage from "./page";

// `EntreprisesPage` est un Server Component async (lot J7 : résolution des
// visuels IA approuvés) — on l'appelle directement (`await EntreprisesPage()`)
// plutôt qu'en JSX, comme le reste des pages de ce répertoire (voir
// `recettes/[slug]/page.test.tsx`) : un élément JSX async non résolu casse
// le reconciliateur client de `@testing-library/react`.
describe("EntreprisesPage", () => {
  it("affiche les 4 sources avec un nombre de recettes calculé", async () => {
    render(await EntreprisesPage());

    const hennessyLink = screen.getByRole("link", { name: /Hennessy/ });
    expect(hennessyLink).toHaveAttribute("href", "/entreprises/hennessy");
    expect(within(hennessyLink).getByText("2 recettes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CAP Pâtissier/ })).toHaveAttribute(
      "href",
      "/entreprises/cap-patissier",
    );
  });

  it("affiche le fil d'Ariane Accueil > Entreprises", async () => {
    render(await EntreprisesPage());
    expect(screen.getByRole("navigation", { name: "Fil d'Ariane" })).toBeInTheDocument();
  });
});
