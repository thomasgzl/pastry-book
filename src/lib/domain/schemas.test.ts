import { describe, expect, it } from "vitest";
import { recipeIngredientSchema } from "./schemas";
import { err, ok } from "./errors";

describe("recipeIngredientSchema", () => {
  const base = {
    id: "b3b6b1d0-0000-4000-8000-000000000000",
    recipeSectionId: "b3b6b1d0-0000-4000-8000-000000000001",
    originalName: "Farine T55",
    canonicalIngredientId: null,
    originalQuantityText: "250",
    unit: "g",
    position: 0,
    verificationStatus: "confirmed" as const,
    confidence: null,
  };

  it("accepte une quantité décimale en chaîne", () => {
    const result = recipeIngredientSchema.safeParse({
      ...base,
      quantityDecimal: "250.5",
    });
    expect(result.success).toBe(true);
  });

  it("accepte une quantité non fiable (QS) sans quantityDecimal", () => {
    const result = recipeIngredientSchema.safeParse({
      ...base,
      originalQuantityText: "QS",
      quantityDecimal: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejette une quantité décimale non numérique (jamais de float binaire implicite)", () => {
    const result = recipeIngredientSchema.safeParse({
      ...base,
      quantityDecimal: "beaucoup",
    });
    expect(result.success).toBe(false);
  });
});

describe("Result", () => {
  it("ok() produit un résultat réussi", () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
  });

  it("err() produit un résultat en échec typé", () => {
    expect(err("not_found", "introuvable")).toEqual({
      ok: false,
      error: { code: "not_found", message: "introuvable", cause: undefined },
    });
  });
});
