import { describe, expect, it } from "vitest";
import { getAllVisualSubjects, getVisualSubject } from "./subjects";

describe("getAllVisualSubjects (E3)", () => {
  it("liste les quatre types d'usage, catégories propres à leur entreprise", async () => {
    const subjects = await getAllVisualSubjects();
    const types = new Set(subjects.map((subject) => subject.type));
    expect(types).toEqual(new Set(["ingredient", "recipe", "source", "sourceCategory"]));

    const categories = subjects.filter((subject) => subject.type === "sourceCategory");
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) {
      expect(category.parentLabel).toBeTruthy();
    }
  });

  it("retrouve un sujet précis par type + id", async () => {
    const [first] = await getAllVisualSubjects();
    expect(await getVisualSubject(first.type, first.id)).toEqual(first);
    expect(await getVisualSubject(first.type, "id-inexistant")).toBeUndefined();
  });

  it("déduplique les alias d'un même ingrédient canonique (K6) : jus/zeste/purée de citron -> un seul sujet Citron", async () => {
    const subjects = await getAllVisualSubjects();
    const ingredientSubjects = subjects.filter((subject) => subject.type === "ingredient");

    const citronSubjects = ingredientSubjects.filter((subject) => subject.label === "Citron");
    expect(citronSubjects).toHaveLength(1);

    // Aucun doublon d'identifiant sur l'ensemble des sujets, tous types confondus.
    const ids = ingredientSubjects.map((subject) => `${subject.type}:${subject.id}`);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ne dérive jamais l'apparence d'une recette à partir d'un ingrédient non confirmé (K6)", async () => {
    const subjects = await getAllVisualSubjects();
    // « Tarte au citron (Hennessy) » : zeste (proposed), jus (confirmed), purée (needs_review).
    const tarte = subjects.find((subject) => subject.type === "recipe" && subject.slug === "tarte-au-citron-hennessy");
    expect(tarte).toBeDefined();
    expect(tarte?.validatedKeyIngredientNames).toContain("Citron");
    expect(tarte?.validatedKeyIngredientNames).toHaveLength(1);
    expect(tarte?.preparationNames?.length).toBeGreaterThan(0);
    expect(tarte?.additionalInformation).toBeTruthy();
  });
});
