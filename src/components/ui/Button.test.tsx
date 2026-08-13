import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("a le rôle bouton, est focusable et activable (élément natif)", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Valider</Button>);

    const button = screen.getByRole("button", { name: "Valider" });
    // Aucun tabIndex négatif : atteignable au clavier par tabulation.
    expect(button).not.toHaveAttribute("tabindex", "-1");

    button.focus();
    expect(button).toHaveFocus();

    // Un <button> natif déclenche "click" aussi bien au clic qu'à la
    // validation clavier (Entrée/Espace) : le comportement essentiel ne
    // dépend donc jamais du survol souris.
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respecte une cible tactile d'au moins 44x44px", () => {
    render(<Button>Valider</Button>);
    const button = screen.getByRole("button", { name: "Valider" });
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("min-w-11");
  });

  it("n'envoie pas de formulaire par défaut", () => {
    render(<Button>Valider</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
