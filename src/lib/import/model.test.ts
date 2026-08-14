import { describe, expect, it } from "vitest";
import { deriveQuantity, findDuplicateRecipe, isTitleNeedsReview, slugify } from "./model";

describe("deriveQuantity", () => {
  it("quantité absente/illisible → null + needs_review, jamais une valeur inventée", () => {
    expect(deriveQuantity(null)).toEqual({ quantityDecimal: null, verificationStatus: "needs_review" });
    expect(deriveQuantity("   ")).toEqual({ quantityDecimal: null, verificationStatus: "needs_review" });
  });

  it("QS reste QS : jamais converti, statut proposed", () => {
    expect(deriveQuantity("QS")).toEqual({ quantityDecimal: null, verificationStatus: "proposed" });
    expect(deriveQuantity("qs")).toEqual({ quantityDecimal: null, verificationStatus: "proposed" });
  });

  it("nombre décimal propre (virgule ou point) → converti et confirmed", () => {
    expect(deriveQuantity("250")).toEqual({ quantityDecimal: "250", verificationStatus: "confirmed" });
    expect(deriveQuantity("62,5")).toEqual({ quantityDecimal: "62.5", verificationStatus: "confirmed" });
  });

  it("fraction ou texte libre → non calculé (null), statut proposed (jamais deviné)", () => {
    expect(deriveQuantity("1/2")).toEqual({ quantityDecimal: null, verificationStatus: "proposed" });
    expect(deriveQuantity("une pincée")).toEqual({ quantityDecimal: null, verificationStatus: "proposed" });
  });
});

describe("isTitleNeedsReview", () => {
  it("détecte le placeholder « À vérifier »", () => {
    expect(isTitleNeedsReview("À vérifier")).toBe(true);
    expect(isTitleNeedsReview("Tarte au citron")).toBe(false);
  });
});

describe("slugify", () => {
  it("dérive un slug lisible à partir du titre", () => {
    expect(slugify("Tarte au citron (Hennessy)")).toBe("tarte-au-citron-hennessy");
  });

  it("retombe sur un slug par défaut si le titre ne produit aucun caractère exploitable", () => {
    expect(slugify("???")).toBe("recette");
  });
});

describe("findDuplicateRecipe", () => {
  const existing = [
    { title: "Tarte au citron (Hennessy)", sourceId: "source-hennessy" },
    { title: "Crème pâtissière (CAP)", sourceId: "source-cap" },
  ];

  it("détecte un doublon même titre + même source, insensible aux accents/casse", () => {
    const match = findDuplicateRecipe("tarte AU citron (hennessy)", "source-hennessy", existing);
    expect(match).toEqual(existing[0]);
  });

  it("ne détecte aucun doublon si même titre mais source différente (préparations non globalisées)", () => {
    const match = findDuplicateRecipe("Crème pâtissière (CAP)", "source-hennessy", existing);
    expect(match).toBeNull();
  });

  it("ne détecte aucun doublon pour un titre différent", () => {
    expect(findDuplicateRecipe("Financiers noisette", "source-cap", existing)).toBeNull();
  });
});
