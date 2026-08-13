import { expect, test } from "@playwright/test";

test("l'accueil affiche le titre sans défilement horizontal", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Le Grand Livre de Pâtisserie" }),
  ).toBeVisible();

  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalScroll).toBe(false);
});
