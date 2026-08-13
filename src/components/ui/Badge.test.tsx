import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("affiche le texte « À vérifier » par défaut avec un rôle ARIA correct", () => {
    render(<Badge />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("À vérifier");
  });

  it("porte le sens par le texte et l'icône, pas uniquement par la couleur", () => {
    render(<Badge />);
    const badge = screen.getByRole("status");
    // Le texte est présent indépendamment de tout style de couleur.
    expect(badge.textContent?.trim().length).toBeGreaterThan(0);
    // Une icône décorative accompagne le texte (masquée aux lecteurs d'écran
    // pour éviter la redondance, le texte porte déjà le sens).
    expect(badge.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });

  it("accepte un texte personnalisé", () => {
    render(<Badge>Proposé</Badge>);
    expect(screen.getByRole("status")).toHaveTextContent("Proposé");
  });
});
