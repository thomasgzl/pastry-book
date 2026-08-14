import { describe, expect, it } from "vitest";
import { getRecipeCountForSource, getSourceBySlug, getSources } from "./sources";

describe("getSources", () => {
  it("retourne les 4 sources du jeu démo", () => {
    expect(getSources()).toHaveLength(4);
  });
});

describe("getSourceBySlug", () => {
  it("trouve Hennessy par son slug", () => {
    expect(getSourceBySlug("hennessy")?.name).toBe("Hennessy");
  });

  it("retourne undefined pour un slug inconnu", () => {
    expect(getSourceBySlug("inexistant")).toBeUndefined();
  });
});

describe("getRecipeCountForSource", () => {
  it("calcule dynamiquement le nombre de recettes (jamais codé en dur)", () => {
    const hennessy = getSourceBySlug("hennessy")!;
    expect(getRecipeCountForSource(hennessy.id)).toBe(2);
  });
});
