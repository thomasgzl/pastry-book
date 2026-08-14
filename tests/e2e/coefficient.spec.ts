import { expect, test } from "@playwright/test";

// Fiche recette adaptative + coefficient (lot C batch 3, C5/C6). La recette
// « Tarte au citron (Hennessy) » a une quantité décimale (62,5 → cf. pâte
// sablée CAP ; ici on utilise « 125 ml » de jus de citron, doublé sans
// artefact flottant).
test.describe("Fiche recette — coefficient (C6)", () => {
  test("changer le coefficient recalcule les quantités, garde l'original visible, et × 1 restitue l'affichage initial", async ({
    page,
  }) => {
    await page.goto("/recettes/tarte-au-citron-hennessy");
    await expect(page.getByRole("heading", { name: "Tarte au citron (Hennessy)" })).toBeVisible();

    const ingredientRow = page.locator("li", { hasText: "jus de citron" });
    await expect(ingredientRow).toContainText("125 ml");

    await page.getByRole("button", { name: "× 2" }).click();
    await expect(ingredientRow).toContainText("250 ml");
    // Quantité originale toujours visible en complément.
    await expect(ingredientRow).toContainText("125 ml");

    await page.getByRole("button", { name: "× 1", exact: true }).click();
    await expect(ingredientRow).toContainText("125 ml");
    await expect(ingredientRow).not.toContainText("250 ml");
  });

  test("les boutons du coefficient restent utilisables au doigt (≥44px) sur téléphone étroit", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "téléphone étroit", "Vérifié sur le profil téléphone étroit dédié");

    await page.goto("/recettes/tarte-au-citron-hennessy");
    const button = page.getByRole("button", { name: "× 1,5" });
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
