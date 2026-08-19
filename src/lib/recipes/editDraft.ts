/**
 * Construit le brouillon d'édition (`ImportRecipeDraft`) d'une recette déjà
 * enregistrée à partir des données brutes lues en base
 * (`getRecipeEditData`) — réutilise le même type et le même schéma Zod que
 * le formulaire d'import (`RecipeDetailsStep`), pour réutiliser ce
 * composant tel quel plutôt que de construire un second formulaire.
 *
 * Les allergènes ne sont volontairement PAS repris ici (`allergens: []`) :
 * la fiche recette ne les affiche plus (voir `RecettePage`/`RecipeSheet`)
 * et leur modification n'est pas demandée pour cette tâche — ne pas les
 * inclure évite un formulaire qui donnerait l'illusion de pouvoir les
 * modifier alors que rien ne serait enregistré.
 */

import type { RecipeSpecificity } from "@/lib/domain/schemas";
import type { RecipeEditData } from "@/lib/data/recipes";
import { splitAdditionalInformation, type ImportRecipeDraft } from "@/lib/import/schema";
import { createEmptyIngredient, createEmptySection } from "@/app/(app)/importer/draftFactory";

export function buildEditDraft(data: RecipeEditData, specificities: RecipeSpecificity[]): ImportRecipeDraft {
  const { recipe, sections, ingredients } = data;
  const { procedure, temperature, additionalInformation } = splitAdditionalInformation(recipe.additionalInformation);

  return {
    id: recipe.id,
    title: recipe.title,
    sourceId: recipe.sourceId,
    sourceCategoryId: recipe.sourceCategoryId,
    procedure,
    temperature,
    additionalInformation,
    sections:
      sections.length > 0
        ? sections.map((section) => {
            const sectionIngredients = ingredients
              .filter((ingredient) => ingredient.recipeSectionId === section.id)
              .map((ingredient) => ({
                id: ingredient.id,
                originalName: ingredient.originalName,
                canonicalIngredientId: ingredient.canonicalIngredientId,
                originalQuantityText: ingredient.originalQuantityText,
                quantityDecimal: ingredient.quantityDecimal,
                unit: ingredient.unit,
                verificationStatus: ingredient.verificationStatus,
              }));
            return {
              id: section.id,
              name: section.name,
              originalText: section.originalText,
              // Anomalie de données jamais attendue (une préparation
              // enregistrée a toujours au moins un ingrédient) : repli
              // défensif minimal plutôt qu'un formulaire cassé, sans jamais
              // inventer de contenu réel.
              ingredients: sectionIngredients.length > 0 ? sectionIngredients : [createEmptyIngredient()],
            };
          })
        : [createEmptySection()],
    specificities: specificities
      .filter((entry) => entry.status !== "rejected")
      .map((entry) => ({
        specificityId: entry.specificityId,
        status: entry.status,
        reason: entry.reason,
        source: entry.source,
      })),
    allergens: [],
    originalFiles: [],
    pastedText: null,
    warnings: [],
  };
}
