import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright dédiée aux checkpoints QA niveau 3 exécutés contre une
 * Preview Vercel réelle (jamais le serveur local `npm run dev`) — distincte
 * de `playwright.config.ts` pour ne jamais changer le comportement des
 * suites existantes (`npm run test:e2e`, `npm run test:smoke`). Réutilisable
 * pour un futur checkpoint : changer `PREVIEW_BASE_URL` suffit.
 *
 * Exige `PREVIEW_BASE_URL`, `QA_TEST_EMAIL`, `QA_TEST_PASSWORD` (compte
 * Supabase jetable créé via `service_role`, jamais un compte réel — voir
 * rapport de checkpoint J11). Chaque test se connecte lui-même via l'UI
 * (`preview-checkpoint.spec.ts`, fixture `authenticatedPage`) plutôt que de
 * réutiliser un `storageState` partagé : un essai avec `storageState`
 * partagé + projet "setup" a échoué de façon reproductible sur le profil
 * "ordinateur" (Chromium) alors qu'il réussissait sur les profils WebKit —
 * Chromium rejette au rechargement un cookie de session
 * `SameSite=None; Secure=false` que WebKit tolère (capturé fidèlement par
 * `storageState()` depuis une connexion live pourtant réussie sur ce même
 * moteur). Une connexion live par test est plus lente mais fiable sur les 5
 * profils et n'exige aucun fichier de session à gérer.
 */
const baseURL = process.env.PREVIEW_BASE_URL;
if (!baseURL) {
  throw new Error("PREVIEW_BASE_URL requis pour playwright.preview.config.ts (voir en-tête du fichier).");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["preview-checkpoint.spec.ts"],
  // Une connexion UI par worker (fixture `authedContext`, scope "worker") ;
  // `workers: 5` + `fullyParallel: false` borne exactement à 5 le nombre de
  // connexions simultanées (une par profil, un worker dédié par projet) —
  // sous le rate-limit Supabase Auth constaté avec une connexion par test.
  fullyParallel: false,
  workers: 5,
  retries: 1,
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    { name: "téléphone étroit", use: { ...devices["iPhone SE (3rd gen)"] } },
    { name: "iPhone récent", use: { ...devices["iPhone 14"] } },
    { name: "tablette portrait", use: { ...devices["iPad (gen 7)"] } },
    { name: "tablette paysage", use: { ...devices["iPad (gen 7) landscape"] } },
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
  ],
});
