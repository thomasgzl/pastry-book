import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("affiche un message d'erreur clair avec le rôle alert", () => {
    render(<ErrorState message="Impossible de charger les recettes." />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Impossible de charger les recettes.",
    );
  });

  it("n'affiche pas d'action de reprise si onRetry est absent", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("appelle onRetry au clic sur Réessayer", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
