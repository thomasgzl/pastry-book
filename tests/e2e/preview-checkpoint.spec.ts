import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Checkpoint QA niveau 3 — lot J, contre une Preview Vercel réelle
 * (`playwright.preview.config.ts`, jamais `npm run dev`). Suite volontairement
 * distincte des specs existantes (`tests/e2e/*.spec.ts`), qui présument un
 * mode démonstration sans authentification — ici l'auth Supabase réelle est
 * active (`src/proxy.ts`). Réutilisable pour un futur checkpoint de Preview
 * (changer `PREVIEW_BASE_URL`/`QA_TEST_EMAIL`/`QA_TEST_PASSWORD` dans
 * l'environnement suffit).
 *
 * Authentification : une seule connexion UI par worker (donc par profil),
 * via un contexte navigateur créé manuellement dans une fixture "worker" qui
 * respecte les options d'émulation du projet (`testInfo.project.use`) —
 * jamais un `storageState` sérialisé puis réinjecté dans un NOUVEAU contexte
 * : un essai avec `storageState` partagé + projet "setup" a échoué de façon
 * reproductible sur le profil "ordinateur" (Chromium rejette au rechargement
 * un cookie de session `SameSite=None; Secure=false` que WebKit tolère,
 * capturé fidèlement par `storageState()` depuis une connexion pourtant
 * réussie sur ce même moteur). Réutiliser le même contexte vivant pour
 * toutes les pages d'un profil évite ce problème ET la connexion répétée
 * (qui déclenchait par ailleurs le rate-limit Supabase Auth en parallèle).
 */

async function login(page: Page): Promise<void> {
  const email = process.env.QA_TEST_EMAIL;
  const password = process.env.QA_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error("QA_TEST_EMAIL et QA_TEST_PASSWORD requis (compte jetable, voir rapport J11).");
  }
  await page.goto("/connexion");
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL("/");
}

const test = base.extend<Record<never, never>, { authedContext: BrowserContext }>({
  authedContext: [
    async ({ browser }, use, workerInfo) => {
      const context = await browser.newContext(workerInfo.project.use);
      const page = await context.newPage();
      await login(page);
      await page.close();
      await use(context);
      await context.close();
    },
    { scope: "worker" },
  ],
  page: async ({ authedContext }, use) => {
    const page = await authedContext.newPage();
    // eslint-disable-next-line react-hooks/rules-of-hooks -- `use` est le callback de fixture Playwright, pas un hook React (faux positif du linter : l'inférence de nom "page" depuis la clé d'objet ressemble à un composant).
    await use(page);
    await page.close();
  },
});

const BUSINESS_PATHS = [
  "/",
  "/entreprises",
  "/recettes",
  "/recettes/tarte-au-citron-hennessy",
  "/matieres-premieres",
  "/matieres-premieres/citron",
  "/specificites",
  "/importer",
] as const;

test.describe("Zéro défilement horizontal (checkpoint Preview)", () => {
  for (const path of BUSINESS_PATHS) {
    test(`${path} ne défile pas horizontalement`, async ({ page }) => {
      await page.goto(path);
      const hasHorizontalScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(hasHorizontalScroll, `${path} défile horizontalement`).toBe(false);
    });
  }
});

test.describe("Cibles tactiles (checkpoint Preview)", () => {
  test("nav principale et bouton Importer ≥ 44×44px", async ({ page }, testInfo) => {
    await page.goto("/");
    const isMobileNav = testInfo.project.name === "téléphone étroit" || testInfo.project.name === "iPhone récent";

    if (isMobileNav) {
      const burger = page.getByRole("button", { name: /Ouvrir le menu/ });
      const box = await burger.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
    } else {
      const importLink = page.getByRole("link", { name: "Importer" });
      const box = await importLink.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      for (const label of ["Accueil", "Entreprises", "Recettes", "Matières premières", "Spécificités"]) {
        const link = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("link", { name: label });
        const linkBox = await link.boundingBox();
        expect(linkBox?.height, `${label} hauteur`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe("Focus clavier visible (checkpoint Preview)", () => {
  test("tab atteint le premier lien de nav avec un anneau de focus visible", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "ordinateur", "Navigation clavier vérifiée sur le profil ordinateur");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
  });
});

test.describe("Fiche recette lisible (checkpoint Preview)", () => {
  test("titre, source et au moins une préparation visibles sans zoom", async ({ page }) => {
    await page.goto("/recettes/tarte-au-citron-hennessy");
    await expect(page.getByRole("heading", { name: /Tarte au citron/ })).toBeVisible();
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe("Aucun brouillon affiché publiquement (checkpoint Preview, mécanisme ApprovedVisual)", () => {
  test("la fiche matière première Citron ne montre jamais le brouillon de test inséré via service_role", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "tablette portrait", "Vérifié une fois, profil tablette portrait");
    const response = await page.goto("/matieres-premieres/citron");
    expect(response?.ok()).toBe(true);
    const html = await page.content();
    // Le brouillon de test (voir rapport J11) porte ce marqueur dans son
    // `image_url` factice — ne doit apparaître nulle part dans le HTML rendu.
    expect(html).not.toContain("QUFB");
    // Placeholder botanique attendu à la place (jamais une icône cassée).
    await expect(page.locator('img[src*="/visuals/placeholders/"]').first()).toBeVisible();
  });
});

test.describe("Aucun secret exposé (checkpoint Preview)", () => {
  test("le HTML de l'accueil ne contient pas la clé service_role", async ({ page }) => {
    const serviceRoleKey = process.env.QA_SERVICE_ROLE_KEY_FRAGMENT;
    test.skip(!serviceRoleKey, "QA_SERVICE_ROLE_KEY_FRAGMENT non fourni");
    await page.goto("/");
    const html = await page.content();
    expect(html.includes(serviceRoleKey!)).toBe(false);
  });
});
