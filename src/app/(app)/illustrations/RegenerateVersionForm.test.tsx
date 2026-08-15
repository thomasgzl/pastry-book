/**
 * Tests ciblés niveau 1 (K11) — écran de confirmation compact « Générer une
 * nouvelle version » : mêmes champs que K9 (fournisseur/modèle/qualité/
 * dimensions/coût/prompt exact/exclusions/phrase nommée), pour UN seul
 * sujet. `./regenerateActions` mocké : ce test porte sur l'affichage, jamais
 * sur l'exécution réelle (couverte par `regenerateActions.test.ts`).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RegenerateVersionForm } from "./RegenerateVersionForm";
import { PRESET_EXCLUSIONS } from "@/lib/visuals/preset";

vi.mock("./regenerateActions", () => ({
  regenerateVersionAction: vi.fn(async (previous: unknown) => previous),
  INITIAL_REGENERATE_STATE: { error: null, success: false },
}));

function renderForm(overrides: Partial<Parameters<typeof RegenerateVersionForm>[0]> = {}) {
  render(
    <RegenerateVersionForm
      subjectType="recipe"
      subjectId="00000000-0000-4000-8000-000000007001"
      subjectLabel="Tarte au citron"
      photoUrl={null}
      preparationNames={["Pâte sucrée", "Crème citron"]}
      validatedKeyIngredientNames={["Citron"]}
      additionalInformation="Dressage à la poche à douille cannelée."
      providerName="OpenAI Images"
      providerModel="gpt-image-2"
      quality="draft"
      costPerImageEstimateEur={null}
      costDocUrl="https://example.test/pricing"
      ratio="4:3"
      size="1536x1024"
      {...overrides}
    />,
  );
}

describe("RegenerateVersionForm (K11)", () => {
  it("affiche le prompt exact avec les préparations/ingrédients validés/information complémentaire réels", () => {
    renderForm();
    const pre = document.querySelector("pre")!;
    expect(pre.textContent).toContain("Tarte au citron");
    expect(pre.textContent).toContain("Pâte sucrée");
    expect(pre.textContent).toContain("Citron");
    expect(pre.textContent).toContain("Dressage à la poche à douille cannelée.");
  });

  it("liste les exclusions du preset", () => {
    renderForm();
    for (const exclusion of PRESET_EXCLUSIONS) {
      expect(screen.getByText(exclusion)).toBeInTheDocument();
    }
  });

  it("coût non fiable : « Estimation indisponible » + lien documentaire, jamais un prix inventé", () => {
    renderForm({ costPerImageEstimateEur: null });
    expect(screen.getByText("Estimation indisponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /barème tarifaire officiel/ })).toHaveAttribute(
      "href",
      "https://example.test/pricing",
    );
  });

  it("exige la phrase de confirmation nommée « GENERER LOT 1 » (même convention que K9)", () => {
    renderForm();
    expect(screen.getByLabelText(/Pour confirmer, tapez exactement « GENERER LOT 1 »/)).toBeInTheDocument();
  });
});
