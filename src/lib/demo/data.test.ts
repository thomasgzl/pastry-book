import { describe, expect, it } from "vitest";
import {
  allergenSchema,
  canonicalIngredientSchema,
  ingredientAliasSchema,
  recipeAllergenSchema,
  recipeIngredientSchema,
  recipeSchema,
  recipeSectionSchema,
  recipeSpecificitySchema,
  sourceCategorySchema,
  sourceSchema,
  specificitySchema,
} from "@/lib/domain/schemas";
import {
  allergens,
  canonicalIngredients,
  ingredientAliases,
  recipeAllergens,
  recipeIngredients,
  recipeSections,
  recipeSpecificities,
  recipes,
  sourceCategories,
  sources,
  specificities,
} from "./data";

/**
 * Garde-fou fort et peu coûteux : chaque enregistrement du jeu de données
 * démo doit être valide au regard des contrats Zod gelés
 * (`src/lib/domain/schemas.ts`), source de vérité unique du domaine.
 */
describe("jeu de données démo — conformité aux schémas Zod", () => {
  it.each(sources)("source %#: $name", (record) => {
    expect(sourceSchema.safeParse(record).success).toBe(true);
  });

  it.each(sourceCategories)("catégorie %#: $name", (record) => {
    expect(sourceCategorySchema.safeParse(record).success).toBe(true);
  });

  it.each(canonicalIngredients)("ingrédient canonique %#: $name", (record) => {
    expect(canonicalIngredientSchema.safeParse(record).success).toBe(true);
  });

  it.each(ingredientAliases)("alias %#: $alias", (record) => {
    expect(ingredientAliasSchema.safeParse(record).success).toBe(true);
  });

  it.each(allergens)("allergène %#: $name", (record) => {
    expect(allergenSchema.safeParse(record).success).toBe(true);
  });

  it.each(specificities)("spécificité %#: $name", (record) => {
    expect(specificitySchema.safeParse(record).success).toBe(true);
  });

  it.each(recipes)("recette %#: $title", (record) => {
    expect(recipeSchema.safeParse(record).success).toBe(true);
  });

  it.each(recipeSections)("section %#: $id", (record) => {
    expect(recipeSectionSchema.safeParse(record).success).toBe(true);
  });

  it.each(recipeIngredients)("ingrédient de recette %#: $originalName", (record) => {
    expect(recipeIngredientSchema.safeParse(record).success).toBe(true);
  });

  it.each(recipeAllergens)("allergène de recette %#", (record) => {
    expect(recipeAllergenSchema.safeParse(record).success).toBe(true);
  });

  it.each(recipeSpecificities)("spécificité de recette %#", (record) => {
    expect(recipeSpecificitySchema.safeParse(record).success).toBe(true);
  });

  it("ne contient que des catégories propres à Hennessy", () => {
    const hennessy = sources.find((source) => source.slug === "hennessy")!;
    expect(sourceCategories.every((category) => category.sourceId === hennessy.id)).toBe(true);
  });

  it("contient les deux recettes homonymes « Crème pâtissière » de sources différentes", () => {
    const homonymes = recipes.filter((recipe) => recipe.title.startsWith("Crème pâtissière"));
    expect(homonymes).toHaveLength(2);
    expect(new Set(homonymes.map((recipe) => recipe.sourceId)).size).toBe(2);
  });
});
