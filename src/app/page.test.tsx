import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("affiche le titre de l'application", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" }),
    ).toBeInTheDocument();
  });
});
