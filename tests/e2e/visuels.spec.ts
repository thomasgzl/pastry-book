import { expect, test } from "@playwright/test";

// Galerie de validation des visuels IA (lot E, E3/E4). Ciblé "tablette
// portrait" uniquement (mode économie de tokens, docs/12-INTEGRATION_PROTOCOL.md §9) :
// c'est l'appareil principal de consultation en laboratoire (CLAUDE.md).
test.describe("Visuels IA — galerie de validation (E3/E4)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "tablette portrait", "Vérifié sur le profil tablette portrait dédié");
  });

  test("liste les quatre types de sujets sans défilement horizontal", async ({ page }) => {
    await page.goto("/visuels");
    await expect(page.getByRole("heading", { name: "Visuels IA" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Matières premières" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recettes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Entreprises" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Catégories d'entreprise" })).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test("un visuel déjà approuvé (Citron) ne propose jamais de le réapprouver, seulement régénérer/rejeter", async ({
    page,
  }) => {
    await page.goto("/visuels");
    const citronLabel = page.getByText("Citron", { exact: true });
    await citronLabel.click();

    const citronCard = page.locator("details").filter({ has: page.getByText("Citron", { exact: true }) });
    await expect(citronCard.getByText("Approuvé", { exact: true }).first()).toBeVisible();
    await expect(citronCard.getByRole("button", { name: "Régénérer" })).toBeVisible();
    await expect(citronCard.getByRole("button", { name: "Approuver" })).toHaveCount(0);
  });

  test("Pistache illustre le cycle rejeté -> régénéré : deux variantes distinctes visibles", async ({ page }) => {
    await page.goto("/visuels");
    const pistacheLabel = page.getByText("Pistache", { exact: true });
    await pistacheLabel.click();

    const pistacheCard = page.locator("details").filter({ has: page.getByText("Pistache", { exact: true }) });
    await expect(pistacheCard.getByText("Rejeté", { exact: true })).toBeVisible();
    await expect(pistacheCard.getByText("Brouillon", { exact: true }).first()).toBeVisible();
    await expect(pistacheCard.getByRole("button", { name: "Approuver" })).toBeVisible();
  });

  test("la génération en lot affiche fournisseur/modèle/coût et exige une confirmation nommée", async ({ page }) => {
    await page.goto("/visuels");
    await expect(page.getByText(/Fournisseur : Démonstration/)).toBeVisible();

    const confirmationInput = page.getByLabel(/Pour confirmer, tapez exactement/);
    await expect(confirmationInput).toBeVisible();
    await confirmationInput.fill("mauvaise confirmation");
    await page.getByRole("button", { name: /Générer les .* visuels manquants/ }).click();
    await expect(page.getByText("Confirmation invalide")).toBeVisible();
  });
});
