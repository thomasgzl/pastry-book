import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CoefficientControl } from "./CoefficientControl";

describe("CoefficientControl", () => {
  it("appelle onChange avec la valeur préréglée cliquée", () => {
    const onChange = vi.fn();
    render(<CoefficientControl value={1} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "× 1,5" }));
    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it("marque le préréglage courant comme pressé (aria-pressed)", () => {
    render(<CoefficientControl value={2} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "× 2" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "× 1" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("appelle onChange avec la valeur personnalisée saisie", () => {
    const onChange = vi.fn();
    render(<CoefficientControl value={1} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Personnalisé"), {
      target: { valueAsNumber: 3.5, value: "3.5" },
    });
    expect(onChange).toHaveBeenCalledWith(3.5);
  });

  it("signale visuellement une valeur non strictement positive sans bloquer la saisie", () => {
    render(<CoefficientControl value={-1} onChange={() => {}} />);
    const input = screen.getByLabelText("Personnalisé");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("boutons préréglés ont une cible tactile confortable", () => {
    render(<CoefficientControl value={1} onChange={() => {}} />);
    const button = screen.getByRole("button", { name: "× 1" });
    expect(button.className).toContain("min-h-11");
    expect(button.className).toContain("min-w-11");
  });
});
