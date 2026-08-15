import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MatierePremierePage from "./page";

describe("MatierePremierePage", () => {
  it("« citron » retrouve la tarte au citron sans modifier les libellés jus/zeste/purée", async () => {
    render(await MatierePremierePage({ params: Promise.resolve({ matiere: "citron" }) }));

    expect(screen.getByRole("heading", { name: "Citron" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeInTheDocument();
  });

  it("affiche un état vide pour une matière sans recette liée", async () => {
    render(await MatierePremierePage({ params: Promise.resolve({ matiere: "pistache" }) }));
    expect(screen.getByText("Aucune recette ne contient cette matière première pour le moment.")).toBeInTheDocument();
  });

  it("404 pour un slug inconnu", async () => {
    await expect(MatierePremierePage({ params: Promise.resolve({ matiere: "inexistante" }) })).rejects.toThrow();
  });

  it("visuel approuvé (démo, K11) : portrait réel `object-contain`, alt réel, action « Nouvelle version » (K12)", async () => {
    render(await MatierePremierePage({ params: Promise.resolve({ matiere: "citron" }) }));

    const portrait = screen.getByAltText("Citron");
    expect(portrait.className).toContain("object-contain");
    expect(portrait).toHaveAttribute("src", expect.stringMatching(/^data:image\/svg\+xml;base64,/));
    expect(screen.getByRole("link", { name: "Nouvelle version" })).toHaveAttribute(
      "href",
      "/illustrations?type=ingredient&q=Citron",
    );
  });

  it("aucun visuel approuvé (Pistache : brouillon/rejeté seulement, jamais affiché) : placeholder + « Créer une illustration » (K12)", async () => {
    const { container } = render(await MatierePremierePage({ params: Promise.resolve({ matiere: "pistache" }) }));

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("src", expect.stringMatching(/^\/visuals\/placeholders\//));
    expect(screen.getByRole("link", { name: "Créer une illustration" })).toHaveAttribute(
      "href",
      "/illustrations/manquantes?q=Pistache",
    );
  });
});
