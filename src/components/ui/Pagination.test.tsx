import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("ne rend rien pour une seule page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("désactive Précédent sur la première page et Suivant sur la dernière", () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Précédent/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Suivant/ })).not.toBeDisabled();

    rerender(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Précédent/ })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /Suivant/ })).toBeDisabled();
  });

  it("appelle onPageChange avec la page suivante/précédente", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: /Suivant/ }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByRole("button", { name: /Précédent/ }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
