import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("affiche son contenu dans un conteneur non interactif", () => {
    render(<Card>Contenu de la carte</Card>);
    const content = screen.getByText("Contenu de la carte");
    expect(content).toBeInTheDocument();
    // Conteneur purement visuel : aucun rôle interactif ne doit être imposé.
    expect(content.closest("[role]")).toBeNull();
  });

  it("accepte des classes additionnelles sans perdre les classes de base", () => {
    render(<Card className="test-extra">Texte</Card>);
    const card = screen.getByText("Texte");
    expect(card.className).toContain("test-extra");
    expect(card.className).toContain("border");
  });
});
