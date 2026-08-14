import { expect, test } from "@playwright/test";

// Parcours de navigation clés du lot C batch 2 (C2-C9), profil ordinateur
// (docs/12-INTEGRATION_PROTOCOL.md §3 : les 5 profils seront revérifiés au
// batch de validation finale, pas besoin de tout dupliquer ici).
test.describe("Navigation Accueil → Entreprises → Hennessy → Catégorie", () => {
  test("atteint une recette Hennessy en 4 clics depuis l'accueil", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" })).toBeVisible();

    await page.getByRole("link", { name: "Par entreprise" }).click();
    await expect(page).toHaveURL("/entreprises");

    await page.getByRole("link", { name: /Hennessy/ }).click();
    await expect(page).toHaveURL("/entreprises/hennessy");
    await expect(page.getByRole("heading", { name: "Hennessy" })).toBeVisible();

    await page.getByRole("link", { name: /Desserts boutique/ }).click();
    await expect(page).toHaveURL("/entreprises/hennessy/desserts-boutique");
    await expect(page.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeVisible();
  });
});

test.describe("Recherche globale (C9)", () => {
  test("« citron » retrouve la matière première et la recette liée", async ({ page }) => {
    await page.goto("/recherche?q=citron");
    await expect(page.getByRole("heading", { name: "Matières premières" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Citron", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeVisible();
  });

  test("« Hennessy » retrouve l'entreprise", async ({ page }) => {
    await page.goto("/recherche?q=Hennessy");
    await expect(page.getByRole("heading", { name: "Entreprises" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Hennessy", exact: true })).toBeVisible();
  });
});

test.describe("Filtre recettes par source (C4)", () => {
  test("filtrer par CAP Pâtissier ne conserve que ses recettes et se reflète dans l'URL", async ({ page }) => {
    await page.goto("/recettes");
    await expect(page.getByRole("link", { name: /Tarte au citron/ })).toBeVisible();

    await page.getByRole("button", { name: "CAP Pâtissier" }).click();
    await expect(page).toHaveURL(/source=cap-patissier/);
    await expect(page.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tarte au citron/ })).toHaveCount(0);
  });
});
