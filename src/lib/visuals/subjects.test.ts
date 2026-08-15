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
});
