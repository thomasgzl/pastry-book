import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("affiche le message par défaut", () => {
    render(<EmptyState />);
    expect(screen.getByText("Aucun résultat.")).toBeInTheDocument();
  });

  it("accepte un message personnalisé", () => {
    render(<EmptyState message="Aucune recette pour ce filtre." />);
    expect(screen.getByText("Aucune recette pour ce filtre.")).toBeInTheDocument();
  });

  it("n'affiche l'action que si libellé et callback sont fournis ensemble", () => {
    const { rerender } = render(<EmptyState actionLabel="Réinitialiser" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    const onAction = vi.fn();
    rerender(<EmptyState actionLabel="Réinitialiser" onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
