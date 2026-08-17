import { expect, test } from "@playwright/test";

// Complète import.spec.ts (déjà présent : parcours CAP minimal) avec les
// deux autres exemples de démonstration (D3) — checkpoint niveau 3, lot I.
// Ciblé tablette portrait uniquement (appareil principal de consultation,
// CLAUDE.md ; économie de tests, docs/12-INTEGRATION_PROTOCOL.md §9).

test.describe("Import assisté — exemple Hennessy (préparations multiples)", () => {
  test("plusieurs préparations distinctes ressortent à la vérification", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablette portrait", "Parcours import vérifié sur tablette portrait uniquement");

    await page.goto("/importer");
    await page.getByRole("radio", { name: "Hennessy" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();

    await expect(page.getByRole("heading", { name: "Catégorie locale" })).toBeVisible();
    await page.getByRole("button", { name: "Suivant" }).click();

    await expect(page.getByRole("heading", { name: "Fichiers ou texte source" })).toBeVisible();
    await page.getByRole("button", { name: "Exemple Hennessy — Tartelette citron meringuée" }).click();

    // Prérempli directement à l'étape 4 — trois préparations nommées distinctes
    // (même libellé de champ répété pour chaque préparation : vérifié par position).
    await expect(page.getByLabel("Titre")).toHaveValue("Tartelette citron meringuée (Hennessy)");
    const sectionNameInputs = page.getByLabel("Nom de la préparation (facultatif — laisser vide pour une liste simple)");
    await expect(sectionNameInputs).toHaveCount(3);
    await expect(sectionNameInputs.nth(0)).toHaveValue("Pâte sucrée");
    await expect(sectionNameInputs.nth(1)).toHaveValue("Crème citron");
    await expect(sectionNameInputs.nth(2)).toHaveValue("Meringue française");

    await page.getByRole("button", { name: "Vérifier", exact: true }).click();

    // Étape 5 — les trois préparations restent distinctes, aucune fusion.
    await expect(page.getByRole("heading", { name: "Vérification avant enregistrement" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pâte sucrée" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Crème citron" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meringue française" })).toBeVisible();
    // Informations complémentaires (procédé/température) : aucune section vide affichée à tort.
    await expect(page.getByText("Informations complémentaires")).toBeVisible();

    const saveButton = page.getByRole("button", { name: "Enregistrer la recette" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.getByRole("heading", { name: "Recette enregistrée" })).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe("Import assisté — exemple capture difficile (quantité illisible)", () => {
  test("une quantité illisible ressort « À vérifier », jamais une valeur inventée", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "tablette portrait", "Parcours import vérifié sur tablette portrait uniquement");

    await page.goto("/importer");
    await page.getByRole("radio", { name: "CAP Pâtissier" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();
    await page.getByRole("button", { name: "Suivant" }).click();

    await expect(page.getByRole("heading", { name: "Fichiers ou texte source" })).toBeVisible();
    await page.getByRole("button", { name: "Exemple capture — quantité illisible" }).click();

    await expect(page.getByLabel("Titre")).toHaveValue("Sablés noisette (capture)");
    // La quantité du Beurre est absente (jamais estimée) — affichage prévu « À vérifier » dès l'étape 4.
    await expect(page.getByText("Affichage prévu : À vérifier")).toBeVisible();

    await page.getByRole("button", { name: "Vérifier", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Vérification avant enregistrement" })).toBeVisible();
    await expect(page.getByText("Avertissements")).toBeVisible();
    await expect(page.getByText(/Quantité du « Beurre » illisible/)).toBeVisible();
    await expect(page.getByText("À vérifier", { exact: true })).toBeVisible();

    const saveButton = page.getByRole("button", { name: "Enregistrer la recette" });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await expect(page.getByRole("heading", { name: "Recette enregistrée" })).toBeVisible();
  });
});

test.describe("Navigation clavier de base", () => {
  test("l'accueil est atteignable et activable au clavier (Tab puis Entrée)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Navigation clavier vérifiée sur le profil ordinateur (pas de survol/clavier physique attendu sur les profils tactiles)");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" })).toBeVisible();

    // Tabule jusqu'au premier lien/bouton interactif atteint et vérifie qu'il
    // reçoit bien le focus visuellement (pas de piège au clavier, pas de
    // dépendance à la souris — CLAUDE.md, cibles ≥44px + navigation clavier).
    await page.keyboard.press("Tab");
    const firstFocused = page.locator(":focus");
    await expect(firstFocused).toBeVisible();

    // Atteint le lien "Recettes" au clavier et l'active avec Entrée.
    let guard = 0;
    while (guard < 20) {
      const tag = await page.evaluate(() => document.activeElement?.tagName);
      const text = await page.evaluate(() => document.activeElement?.textContent?.trim());
      if (tag === "A" && text === "Recettes") break;
      await page.keyboard.press("Tab");
      guard += 1;
    }
    await expect(page.locator(":focus")).toHaveText("Recettes");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/recettes");
  });
});
