import { expect, test } from "@playwright/test";

test.describe("Cibles tactiles (B9)", () => {
  test("les boutons existants respectent 44x44px minimum", async ({ page }) => {
    await page.goto("/");
    const homeButton = page.getByRole("button", { name: "Voir la recette" });
    const homeBox = await homeButton.boundingBox();
    expect(homeBox?.width).toBeGreaterThanOrEqual(44);
    expect(homeBox?.height).toBeGreaterThanOrEqual(44);

    await page.goto("/connexion");
    const submitButton = page.getByRole("button", { name: "Se connecter" });
    const submitBox = await submitButton.boundingBox();
    expect(submitBox?.width).toBeGreaterThanOrEqual(44);
    expect(submitBox?.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("Rotation tablette (B9)", () => {
  // Gabarits iPad (gen 7) portrait/paysage — ne s'exécute que sur le profil
  // dédié : les autres projets ont une taille de viewport fixe non
  // pertinente pour un test de rotation.
  test("changement d'orientation sans rupture de mise en page", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "tablette portrait",
      "Rotation vérifiée sur le profil tablette dédié uniquement",
    );

    await page.setViewportSize({ width: 810, height: 1080 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);

    await page.setViewportSize({ width: 1080, height: 810 });
    await expect(
      page.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  });
});
