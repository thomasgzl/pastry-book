import { expect, test } from "@playwright/test";

// Import manuel assisté (lot D, D1-D3). Parcours complet ciblé tablette
// portrait (appareil principal de consultation, CLAUDE.md) : source →
// catégorie → exemple de démonstration (D3, aucun appel IA réel) →
// vérification → enregistrement, sans aucune sauvegarde automatique avant
// le clic final.
test.describe("Import assisté (D1-D3)", () => {
  test("parcours complet : source, catégorie, exemple démo, vérification, enregistrement", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablette portrait", "Parcours import vérifié sur tablette portrait uniquement");

    await page.goto("/importer");
    await expect(page.getByRole("heading", { name: "Importer une recette" })).toBeVisible();

    // Étape 1 — source.
    await page.getByRole("radio", { name: "CAP Pâtissier" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();

    // Étape 2 — catégorie (facultative, on passe directement).
    await expect(page.getByRole("heading", { name: "Catégorie locale" })).toBeVisible();
    await page.getByRole("button", { name: "Suivant" }).click();

    // Étape 3 — fichiers : charge l'exemple de démonstration CAP (mode démo, aucun appel réseau réel).
    await expect(page.getByRole("heading", { name: "Fichiers ou texte source" })).toBeVisible();
    await page.getByRole("button", { name: "Exemple CAP — Tarte aux pommes" }).click();

    // L'exemple pré-remplit directement l'étape 4 (informations reconnues + correction manuelle).
    await expect(page.getByLabel("Titre")).toHaveValue("Tarte aux pommes (CAP)");
    const qsField = page.getByLabel("Quantité d'origine").last();
    await expect(qsField).toHaveValue("QS");

    await page.getByRole("button", { name: "Vérifier", exact: true }).click();

    // Étape 5 — vérification récapitulative, aucune section vide.
    await expect(page.getByRole("heading", { name: "Vérification avant enregistrement" })).toBeVisible();
    await expect(page.getByText("Tarte aux pommes (CAP)").first()).toBeVisible();

    const saveButton = page.getByRole("button", { name: "Enregistrer la recette" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByRole("heading", { name: "Recette enregistrée" })).toBeVisible();
    await expect(page.getByText("« Tarte aux pommes (CAP) » a bien été enregistrée")).toBeVisible();

    // Zéro défilement horizontal sur tablette portrait.
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
