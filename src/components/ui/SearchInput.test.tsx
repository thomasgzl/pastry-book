import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("appelle onChange immédiatement à chaque frappe (champ contrôlé)", () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} label="Rechercher une recette" />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher une recette" }), {
      target: { value: "citron" },
    });

    expect(onChange).toHaveBeenCalledWith("citron");
  });

  it("appelle onSearch après le délai, pas à chaque frappe", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    const { rerender } = render(
      <SearchInput value="" onChange={() => {}} onSearch={onSearch} debounceMs={300} />,
    );

    rerender(<SearchInput value="c" onChange={() => {}} onSearch={onSearch} debounceMs={300} />);
    expect(onSearch).not.toHaveBeenCalledWith("c");

    vi.advanceTimersByTime(299);
    expect(onSearch).not.toHaveBeenCalledWith("c");

    vi.advanceTimersByTime(1);
    expect(onSearch).toHaveBeenCalledWith("c");

    vi.useRealTimers();
  });

  it("est navigable au clavier (élément input natif focusable)", () => {
    render(<SearchInput value="" onChange={() => {}} label="Rechercher" />);
    const input = screen.getByRole("searchbox", { name: "Rechercher" });
    input.focus();
    expect(input).toHaveFocus();
  });
});
