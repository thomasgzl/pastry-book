import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AllergenBadge, SpecificityBadge } from "./StatusBadge";

describe("SpecificityBadge", () => {
  it("affiche le nom et jamais une certitude pour un statut proposé", () => {
    render(<SpecificityBadge name="Vegan" status="proposed" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Vegan");
    expect(badge).toHaveTextContent("proposé");
  });

  it("distingue confirmé et proposé par le texte, pas seulement la couleur", () => {
    const { rerender } = render(<SpecificityBadge name="Sans gluten" status="confirmed" />);
    expect(screen.getByRole("status").textContent).toContain("confirmé");

    rerender(<SpecificityBadge name="Sans gluten" status="proposed" />);
    expect(screen.getByRole("status").textContent).toContain("proposé");
  });
});

describe("AllergenBadge", () => {
  it("affiche le nom de l'allergène et son statut", () => {
    render(<AllergenBadge name="Fruits à coque" status="confirmed" />);
    expect(screen.getByRole("status")).toHaveTextContent("Fruits à coque");
    expect(screen.getByRole("status")).toHaveTextContent("confirmé");
  });
});
