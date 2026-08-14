import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

describe("LoadingState", () => {
  it("annonce le chargement aux technologies d'assistance", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…");
  });

  it("accepte un message personnalisé", () => {
    render(<LoadingState message="Chargement des recettes…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement des recettes…");
  });
});
