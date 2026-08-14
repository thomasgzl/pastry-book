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
});
