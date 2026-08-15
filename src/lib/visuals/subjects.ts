import { getCanonicalIngredients } from "@/lib/data/canonical-ingredients";
import { getCategoriesForSource } from "@/lib/data/categories";
import { getRecipeDetail, getRecipes } from "@/lib/data/recipes";
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
  /**
   * Recette uniquement (K6) : noms des préparations réellement présentes
   * (titre de section non vide), dans leur ordre d'origine — jamais
   * complétées ni inventées si la recette n'en décrit aucune.
   */
  preparationNames?: string[];
  /**
   * Recette uniquement (K6) : noms des matières premières canoniques dont au
   * moins un ingrédient source est confirmé (`verificationStatus:
   * "confirmed"`). Les propositions non validées (`proposed`/`needs_review`)
   * ne doivent jamais orienter l'apparence d'un visuel généré.
   */
  validatedKeyIngredientNames?: string[];
  /** Recette uniquement (K6) : informations complémentaires réellement saisies (`null` si absentes — jamais inventées). */
  additionalInformation?: string | null;
}

/** Déduplique par identifiant stable, dernière occurrence gagnante — filet de sécurité explicite avant toute génération (K6), même si chaque source est déjà unique par construction (registre canonique, id UUID). */
function dedupeById<T extends { id: string }>(subjects: T[]): T[] {
  return [...new Map(subjects.map((subject) => [subject.id, subject])).values()];
}

/** Ré-exporté depuis `kindLabels.ts` (module client-safe, sans dépendance à `src/lib/data/*`) — voir ce fichier pour la raison de la séparation (K5). */
export { VISUAL_KIND_LABELS } from "./kindLabels";

/**
 * Univers des sujets illustrables (E3), toutes sources en lecture seule
 * (`src/lib/data/*` — Supabase en Preview/Production, démo sinon, K1).
 * Aucune écriture ici — cette fonction ne fait que lister, jamais générer.
 */
export async function getAllVisualSubjects(): Promise<VisualSubject[]> {
  const [canonicalIngredients, recipes, sources] = await Promise.all([
    getCanonicalIngredients(),
    getRecipes(),
    getSources(),
  ]);

  // Une matière première canonique = une illustration unique. Le registre
  // canonique lui-même est déjà la couche de déduplication des alias : « jus
  // de citron » / « zeste de citron » / « purée de citron » sont des lignes
  // `ingredient_aliases` qui pointent vers CE SEUL enregistrement « Citron »
  // (`src/lib/data/canonical-ingredients.ts`), jamais des sujets distincts.
  // Chaque ligne du registre est soit reliée à au moins une recette réelle,
  // soit créée explicitement (ex. Pistache, exemple de référence sans
  // recette démo) — jamais un sujet arbitraire inventé ici.
  const ingredients: VisualSubject[] = dedupeById(
    canonicalIngredients.map((ingredient) => ({
      type: "ingredient" as const,
      id: ingredient.id,
      slug: ingredient.slug,
      label: ingredient.name,
    })),
  );

  const canonicalNameById = new Map(canonicalIngredients.map((ingredient) => [ingredient.id, ingredient.name]));
  const recipeDetails = await Promise.all(recipes.map((recipe) => getRecipeDetail(recipe.slug)));
  const recipeSubjects: VisualSubject[] = dedupeById(
    recipes.map((recipe, index) => {
      const detail = recipeDetails[index];
      const preparationNames = detail
        ? [...new Set(detail.sections.map((section) => section.name).filter((name): name is string => Boolean(name)))]
        : [];
      const validatedKeyIngredientNames = detail
        ? [
            ...new Set(
              detail.sections
                .flatMap((section) => section.ingredients)
                .filter((ingredient) => ingredient.verificationStatus === "confirmed" && ingredient.canonicalIngredientId)
                .map((ingredient) => canonicalNameById.get(ingredient.canonicalIngredientId!))
                .filter((name): name is string => Boolean(name)),
            ),
          ]
        : [];

      return {
        type: "recipe" as const,
        id: recipe.id,
        slug: recipe.slug,
        label: recipe.title,
        photoUrl: recipe.photoUrl,
        preparationNames,
        validatedKeyIngredientNames,
        additionalInformation: recipe.additionalInformation,
      };
    }),
  );

  const sourceSubjects: VisualSubject[] = dedupeById(
    sources.map((source) => ({
      type: "source" as const,
      id: source.id,
      slug: source.slug,
      label: source.name,
    })),
  );

  const categoriesPerSource = await Promise.all(sources.map((source) => getCategoriesForSource(source.id)));
  const categories: VisualSubject[] = dedupeById(
    sources.flatMap((source, index) =>
      categoriesPerSource[index].map((category) => ({
        type: "sourceCategory" as const,
        id: category.id,
        slug: category.slug,
        label: category.name,
        categorySlug: category.slug,
        parentLabel: source.name,
      })),
    ),
  );

  return [...ingredients, ...recipeSubjects, ...sourceSubjects, ...categories];
}

export async function getVisualSubject(type: VisualSubjectKind, id: string): Promise<VisualSubject | undefined> {
  const subjects = await getAllVisualSubjects();
  return subjects.find((subject) => subject.type === type && subject.id === id);
}
