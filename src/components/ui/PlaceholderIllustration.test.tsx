import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceholderIllustration } from "./PlaceholderIllustration";

describe("PlaceholderIllustration", () => {
  it("affiche l'initiale du nom, masquée aux lecteurs d'écran", () => {
    const { container } = render(<PlaceholderIllustration label="Citron" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.textContent).toBe("C");
  });

  it("retombe sur un point d'interrogation si le nom est vide", () => {
    const { container } = render(<PlaceholderIllustration label="   " />);
    expect(container.querySelector("text")?.textContent).toBe("?");
  });
});
