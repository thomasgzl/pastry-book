import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      // ~375px de large (iPhone SE) : le gabarit le plus contraignant pour
      // le zéro-défilement-horizontal et les cibles tactiles.
      name: "téléphone étroit",
      use: { ...devices["iPhone SE (3rd gen)"] },
    },
    {
      // Anciennement "téléphone" — renommé pour le distinguer clairement du
      // profil étroit ci-dessus (B9).
      name: "iPhone récent",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "tablette portrait",
      use: { ...devices["iPad (gen 7)"] },
    },
    {
      name: "tablette paysage",
      use: { ...devices["iPad (gen 7) landscape"] },
    },
    {
      name: "ordinateur",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
