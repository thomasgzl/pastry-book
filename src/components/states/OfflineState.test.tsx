import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OfflineState } from "./OfflineState";

describe("OfflineState", () => {
  it("affiche un titre et une explication cohérents avec la page de repli", () => {
    render(<OfflineState />);
    expect(screen.getByRole("status")).toHaveTextContent("Pas de connexion");
  });

  it("accepte un message personnalisé", () => {
    render(<OfflineState message="Les matières premières ne sont pas encore en cache." />);
    expect(screen.getByText("Les matières premières ne sont pas encore en cache.")).toBeInTheDocument();
  });
});
