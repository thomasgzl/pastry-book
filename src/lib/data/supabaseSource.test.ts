import { describe, expect, it } from "vitest";
import { recipeIngredientFromRow } from "./supabaseSource";
import type { RecipeIngredientRow } from "@/lib/supabase/types";

function baseRow(overrides: Partial<RecipeIngredientRow> = {}): RecipeIngredientRow {
  return {
    id: "ing-1",
    recipe_section_id: "section-1",
    original_name: "Farine T55",
    canonical_ingredient_id: null,
    original_quantity_text: "250",
    quantity_decimal: "250",
    unit: "g",
    position: 0,
    verification_status: "confirmed",
    confidence: null,
    ...overrides,
  };
}

describe("recipeIngredientFromRow", () => {
  it("convertit quantity_decimal en chaîne même si PostgREST renvoie un nombre JSON (numeric SQL)", () => {
    // Malgré le type déclaré `Nullable<string>`, PostgREST sérialise une
    // colonne `numeric` en nombre JSON — reproduit ici tel quel (cast
    // délibéré) pour vérifier que le mapping corrige bien l'écart au runtime.
    const row = baseRow({ quantity_decimal: 250 as unknown as string });
    expect(recipeIngredientFromRow(row).quantityDecimal).toBe("250");
  });

  it("garde quantity_decimal à null sans le transformer en chaîne « null »", () => {
    const row = baseRow({ quantity_decimal: null });
    expect(recipeIngredientFromRow(row).quantityDecimal).toBeNull();
  });
});
