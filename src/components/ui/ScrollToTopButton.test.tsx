import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScrollToTopButton } from "./ScrollToTopButton";

function setScrollY(value: number) {
  Object.defineProperty(window, "scrollY", { value, configurable: true });
}

describe("ScrollToTopButton", () => {
  it("reste invisible tant que le défilement est faible", () => {
    setScrollY(0);
    render(<ScrollToTopButton />);
    expect(screen.queryByRole("button", { name: "Remonter en haut de la page" })).not.toBeInTheDocument();
  });

  it("apparaît après un défilement suffisant", () => {
    setScrollY(0);
    render(<ScrollToTopButton />);
    setScrollY(500);
    fireEvent.scroll(window);
    expect(screen.getByRole("button", { name: "Remonter en haut de la page" })).toBeInTheDocument();
  });
});
