import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanonicalIngredient } from "@/lib/domain/schemas";
import { seedVisualAssetsStore } from "./storage";

/**
 * K13 — confirme structurellement qu'un nouvel ingrédient canonique validé
 * (persisté dans le registre canonique, quel que soit le point d'entrée qui
 * l'a créé — import ou saisie directe) apparaît AUTOMATIQUEMENT dans la file
 * des illustrations manquantes, sans aucune action supplémentaire de ce lot.
 *
 * `getAllVisualSubjects()` (K6) dérive les sujets `ingredient` directement
 * depuis `getCanonicalIngredients()` (src/lib/data/canonical-ingredients.ts),
 * jamais d'une liste figée — ce mock simule uniquement l'état « déjà
 * enregistré en base » d'un ingrédient tout juste validé, sans toucher au
 * fichier réel ni à `store.ts` (hors périmètre de cette tâche).
 */
const NEW_CANONICAL_INGREDIENT: CanonicalIngredient = {
  id: "9d5a6f2e-0b1a-4a3e-9c4d-3f2b1a0e7c11",
  name: "Fruit de la passion (K13 test)",
  slug: "fruit-de-la-passion-k13-test",
  parentId: null,
  containsGluten: "unknown",
  containsLactose: "unknown",
  containsTreeNuts: "unknown",
};

vi.mock("@/lib/data/canonical-ingredients", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/canonical-ingredients")>();
  return {
    ...actual,
    getCanonicalIngredients: async () => [...(await actual.getCanonicalIngredients()), NEW_CANONICAL_INGREDIENT],
  };
});

beforeEach(() => {
  seedVisualAssetsStore([]);
});

describe("K13 — nouveau canonique validé remonte automatiquement dans les manquants", () => {
  it("apparaît dans getAllVisualSubjects() (K6)", async () => {
    const { getAllVisualSubjects } = await import("./subjects");
    const subjects = await getAllVisualSubjects();
    const found = subjects.find((s) => s.type === "ingredient" && s.id === NEW_CANONICAL_INGREDIENT.id);
    expect(found).toBeDefined();
    expect(found?.label).toBe(NEW_CANONICAL_INGREDIENT.name);
  });

  it("apparaît dans getMissingVisualSubjects() sans qu'aucun visuel n'ait été généré (K8)", async () => {
    const { getMissingVisualSubjects } = await import("./queue");
    const missing = await getMissingVisualSubjects();
    const found = missing.find((s) => s.type === "ingredient" && s.id === NEW_CANONICAL_INGREDIENT.id);
    expect(found).toBeDefined();
  });

  it("disparaît de la file dès qu'un visuel principal est approuvé pour lui (comportement normal, non spécifique à K13)", async () => {
    const { getMissingVisualSubjects } = await import("./queue");
    const { createDraftVisualAsset, approveVisualAsset } = await import("./storage");
    const draft = await createDraftVisualAsset({
      subjectType: "ingredient",
      subjectId: NEW_CANONICAL_INGREDIENT.id,
      imageUrl: "data:image/svg+xml;base64,AAAA",
      sourcePhotoUrl: null,
      prompt: "prompt de test",
      presetVersion: "v1",
    });
    await approveVisualAsset(draft.id);

    const missing = await getMissingVisualSubjects();
    expect(missing.find((s) => s.type === "ingredient" && s.id === NEW_CANONICAL_INGREDIENT.id)).toBeUndefined();
  });
});
