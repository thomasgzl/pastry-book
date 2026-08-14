import { getCanonicalIngredients } from "@/lib/data/canonical-ingredients";
import { getCategoriesForSource } from "@/lib/data/categories";
import { getRecipes } from "@/lib/data/recipes";
import { getSources } from "@/lib/data/sources";
import type { VisualSubjectKind } from "./preset";

export interface VisualSubject {
  type: VisualSubjectKind;
  id: string;
  slug: string;
  label: string;
  /** Recette uniquement : présence d'une photo -> mode « photo vers illustration », sinon « description vers illustration ». */
  photoUrl?: string | null;
  /** Catégorie d'entreprise uniquement : affine le symbole représenté (preset E2). */
  categorySlug?: string;
  /** Catégorie d'entreprise uniquement : nom de l'entreprise parente, pour l'affichage (catégories jamais globalisées). */
  parentLabel?: string;
}

export const VISUAL_KIND_LABELS: Record<VisualSubjectKind, string> = {
  ingredient: "Matières premières",
  recipe: "Recettes",
  source: "Entreprises",
  sourceCategory: "Catégories d'entreprise",
};

/**
 * Univers des sujets illustrables (E3), toutes sources en lecture seule
 * (`src/lib/data/*`, mode démo). Aucune écriture ici — cette fonction ne fait
 * que lister, jamais générer.
 */
export function getAllVisualSubjects(): VisualSubject[] {
  const ingredients: VisualSubject[] = getCanonicalIngredients().map((ingredient) => ({
    type: "ingredient",
    id: ingredient.id,
    slug: ingredient.slug,
    label: ingredient.name,
  }));

  const recipes: VisualSubject[] = getRecipes().map((recipe) => ({
    type: "recipe",
    id: recipe.id,
    slug: recipe.slug,
    label: recipe.title,
    photoUrl: recipe.photoUrl,
  }));

  const sources: VisualSubject[] = getSources().map((source) => ({
    type: "source",
    id: source.id,
    slug: source.slug,
    label: source.name,
  }));

  const categories: VisualSubject[] = getSources().flatMap((source) =>
    getCategoriesForSource(source.id).map((category) => ({
      type: "sourceCategory" as const,
      id: category.id,
      slug: category.slug,
      label: category.name,
      categorySlug: category.slug,
      parentLabel: source.name,
    })),
  );

  return [...ingredients, ...recipes, ...sources, ...categories];
}

export function getVisualSubject(type: VisualSubjectKind, id: string): VisualSubject | undefined {
  return getAllVisualSubjects().find((subject) => subject.type === type && subject.id === id);
}
