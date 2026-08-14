import { describe, expect, it } from "vitest";
import {
  applyCoefficient,
  formatOriginalQuantity,
  getIngredientQuantityDisplay,
  isValidCoefficient,
} from "./coefficient";

describe("isValidCoefficient", () => {
  it("accepte les préréglages et une valeur personnalisée strictement positive", () => {
    expect(isValidCoefficient(0.5)).toBe(true);
    expect(isValidCoefficient(1)).toBe(true);
    expect(isValidCoefficient(1.5)).toBe(true);
    expect(isValidCoefficient(2)).toBe(true);
    expect(isValidCoefficient(3.25)).toBe(true);
  });

  it("rejette zéro, les valeurs négatives, NaN et l'infini", () => {
    expect(isValidCoefficient(0)).toBe(false);
    expect(isValidCoefficient(-1)).toBe(false);
    expect(isValidCoefficient(Number.NaN)).toBe(false);
    expect(isValidCoefficient(Number.POSITIVE_INFINITY)).toBe(false);
  });
});

describe("applyCoefficient", () => {
  it("multiplie une quantité entière", () => {
    expect(applyCoefficient("200", 2)).toBe("400");
  });

  it("multiplie une quantité décimale (62,5 × 1,5)", () => {
    expect(applyCoefficient("62.5", 1.5)).toBe("93,75");
  });

  it("applique × 0,5", () => {
    expect(applyCoefficient("500", 0.5)).toBe("250");
  });

  it("applique × 1 (identité)", () => {
    expect(applyCoefficient("62.5", 1)).toBe("62,5");
  });

  it("applique × 2", () => {
    expect(applyCoefficient("125", 2)).toBe("250");
  });

  it("applique un coefficient personnalisé valide", () => {
    expect(applyCoefficient("100", 3.25)).toBe("325");
  });

  it("arrondit à 2 décimales et supprime les zéros superflus sans artefact flottant", () => {
    // 0.1 + 0.2 côté binaire donne 0.30000000000000004 : le résultat affiché
    // doit rester propre.
    expect(applyCoefficient("0.1", 3)).toBe("0,3");
    expect(applyCoefficient("10", 0.005)).toBe("0,05");
  });

  it("retourne null pour une quantité absente (QS/PM/illisible) — jamais recalculée", () => {
    expect(applyCoefficient(null, 2)).toBeNull();
  });

  it("rejette un coefficient invalide : la quantité ne s'applique pas", () => {
    expect(applyCoefficient("100", 0)).toBeNull();
    expect(applyCoefficient("100", -1)).toBeNull();
    expect(applyCoefficient("100", Number.NaN)).toBeNull();
  });
});

describe("formatOriginalQuantity", () => {
  it("combine texte et unité", () => {
    expect(formatOriginalQuantity("62,5", "g")).toBe("62,5 g");
  });

  it("retourne le texte seul sans unité", () => {
    expect(formatOriginalQuantity("QS", null)).toBe("QS");
  });

  it("retourne null si aucune quantité d'origine", () => {
    expect(formatOriginalQuantity(null, null)).toBeNull();
    expect(formatOriginalQuantity("", "g")).toBeNull();
  });
});

describe("getIngredientQuantityDisplay", () => {
  const confirmedGrams = {
    quantityDecimal: "200",
    originalQuantityText: "200",
    unit: "g",
    verificationStatus: "confirmed" as const,
  };

  const decimalGrams = {
    quantityDecimal: "62.5",
    originalQuantityText: "62,5",
    unit: "g",
    verificationStatus: "confirmed" as const,
  };

  const qs = {
    quantityDecimal: null,
    originalQuantityText: "QS",
    unit: null,
    verificationStatus: "proposed" as const,
  };

  const missing = {
    quantityDecimal: null,
    originalQuantityText: null,
    unit: null,
    verificationStatus: "needs_review" as const,
  };

  const needsReviewWithText = {
    quantityDecimal: null,
    originalQuantityText: "1/2",
    unit: null,
    verificationStatus: "needs_review" as const,
  };

  it("QS/PM n'est jamais recalculé : affiché tel quel, sans doublon en secondaire", () => {
    const display = getIngredientQuantityDisplay(qs, 2);
    expect(display.primary).toBe("QS");
    expect(display.original).toBeNull();
  });

  it("quantité absente reste absente, jamais inventée", () => {
    const display = getIngredientQuantityDisplay(missing, 2);
    expect(display.primary).toBe("À vérifier");
    expect(display.original).toBeNull();
  });

  it("needs_review force « À vérifier » quelle que soit quantityDecimal, mais garde l'original en secondaire s'il existe", () => {
    const display = getIngredientQuantityDisplay(needsReviewWithText, 2);
    expect(display.primary).toBe("À vérifier");
    expect(display.original).toBe("1/2");
  });

  it("recalcule et affiche l'unité pour une quantité fiable", () => {
    const display = getIngredientQuantityDisplay(decimalGrams, 2);
    expect(display.primary).toBe("125 g");
    expect(display.original).toBe("62,5 g");
  });

  it("retour à × 1 restitue exactement l'affichage original (identité)", () => {
    const display = getIngredientQuantityDisplay(decimalGrams, 1);
    expect(display.primary).toBe("62,5 g");
    // Identique à l'original : pas de répétition inutile en secondaire.
    expect(display.original).toBeNull();

    const displayInt = getIngredientQuantityDisplay(confirmedGrams, 1);
    expect(displayInt.primary).toBe("200 g");
    expect(displayInt.original).toBeNull();
  });
});
