import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("ne se rend pas sans élément", () => {
    const { container } = render(<Breadcrumb items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche des liens pour tous les éléments sauf le dernier", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Entreprises", href: "/entreprises" },
          { label: "Hennessy", href: "/entreprises/hennessy" },
          { label: "Desserts boutique" },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Entreprises" })).toHaveAttribute(
      "href",
      "/entreprises",
    );
    expect(screen.getByRole("link", { name: "Hennessy" })).toHaveAttribute(
      "href",
      "/entreprises/hennessy",
    );
    // Dernier élément : page courante, jamais un lien, même si un href avait
    // été fourni.
    expect(
      screen.queryByRole("link", { name: "Desserts boutique" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Desserts boutique")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
