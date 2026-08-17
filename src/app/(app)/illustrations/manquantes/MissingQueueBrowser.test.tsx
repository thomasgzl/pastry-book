/**
 * Tests ciblés niveau 1 (K9) — écran de confirmation avant toute génération,
 * individuelle OU groupée. `./actions` est mocké : ces tests portent
 * uniquement sur ce que l'écran affiche/exige AVANT tout déclenchement,
 * jamais sur l'exécution réelle du moteur de file (déjà couverte par
 * `queue.test.ts`, K8).
 *
 * Note technique : les vérifications de texte réparti sur plusieurs noeuds
 * (ex. `<p>` mêlant texte brut et `<strong>`) utilisent `panel.textContent`
 * plutôt que `getByText` avec une expression régulière — un `getByText`
 * regex remonte aussi les ancêtres dont le texte concaténé contient la même
 * sous-chaîne et lève « plusieurs éléments trouvés ». `getByRole`/
 * `getByLabelText`/chaînes exactes restent utilisés pour les éléments
 * interactifs ou les noeuds dont le texte propre est exactement la valeur
 * recherchée (sans ambiguïté d'ancêtre).
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MissingQueueBrowser, type MissingSubjectEntry } from "./MissingQueueBrowser";
import { PRESET_EXCLUSIONS } from "@/lib/visuals/preset";

vi.mock("./actions", () => ({
  runMissingQueueAction: vi.fn(async (previous: unknown) => previous),
}));

const CITRON: MissingSubjectEntry = {
  type: "ingredient",
  id: "00000000-0000-4000-8000-000000000001",
  label: "Citron",
};

const RECETTE: MissingSubjectEntry = {
  type: "recipe",
  id: "00000000-0000-4000-8000-000000000002",
  label: "Tarte au citron",
  photoUrl: null,
  preparationNames: ["Pâte sucrée", "Crème citron"],
  validatedKeyIngredientNames: ["Citron", "Beurre"],
  additionalInformation: "Dressage à la poche à douille cannelée.",
};

const DIMENSIONS = {
  ingredient: { ratio: "1:1", size: "1024x1024" },
  recipe: { ratio: "4:3", size: "1536x1024" },
  source: { ratio: "16:9", size: "1536x1024" },
  sourceCategory: { ratio: "4:3", size: "1536x1024" },
} as const;

function renderBrowser(overrides: Partial<Parameters<typeof MissingQueueBrowser>[0]> = {}) {
  render(
    <MissingQueueBrowser
      entries={[CITRON, RECETTE]}
      providerName="OpenAI Images"
      providerModel="gpt-image-2"
      quality="draft"
      costPerImageEstimateEur={null}
      costDocUrl="https://example.test/pricing"
      dimensionsByType={DIMENSIONS}
      {...overrides}
    />,
  );
  return screen.getByLabelText("Confirmation avant génération");
}

function textOf(panel: HTMLElement): string {
  return panel.textContent ?? "";
}

describe("MissingQueueBrowser — écran de confirmation (K9)", () => {
  it("n'affiche aucune confirmation tant qu'aucun sujet n'est sélectionné", () => {
    const panel = renderBrowser();
    expect(within(panel).queryByLabelText(/Pour confirmer, tapez exactement/)).not.toBeInTheDocument();
  });

  it("un sujet unique : le clic ne déclenche rien immédiatement, il ouvre l'écran de confirmation complet", () => {
    renderBrowser();
    fireEvent.click(screen.getAllByRole("button", { name: "Générer ce sujet…" })[0]);

    const panel = screen.getByLabelText("Confirmation avant génération");
    const text = textOf(panel);

    // Opération + sujet exact (pas un total générique), type du sujet.
    expect(text).toContain("Opération :");
    expect((text.match(/Citron — Matières premières/g) ?? []).length).toBeGreaterThanOrEqual(2); // liste des sujets + résumé du prompt repliable
    expect(text).not.toContain("Tarte au citron");

    // Fournisseur / modèle / qualité / dimensions.
    expect(within(panel).getByText("OpenAI Images")).toBeInTheDocument();
    expect(within(panel).getByText("gpt-image-2")).toBeInTheDocument();
    expect(text).toContain("draft");
    expect(text).toContain("ratio 1:1, 1024x1024");

    // Nombre d'images / nombre d'appels distincts, tous deux à 1.
    expect(text).toContain("images :");
    expect(text).toContain("appels :");

    // Exclusions du preset listées.
    for (const exclusion of PRESET_EXCLUSIONS) {
      expect(text).toContain(exclusion);
    }

    // Confirmation explicite nommée, même pour un seul sujet — pas un "OK" générique.
    expect(within(panel).getByLabelText(/Pour confirmer, tapez exactement « GENERER LOT 1 »/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Générer ce sujet" })).toBeInTheDocument();
  });

  it("le prompt repliable d'une recette reflète ses préparations/ingrédients validés/information complémentaire réels", () => {
    renderBrowser();
    fireEvent.click(screen.getAllByRole("button", { name: "Générer ce sujet…" })[1]);

    const panel = screen.getByLabelText("Confirmation avant génération");
    const details = [...panel.querySelectorAll("details")].find((node) =>
      node.querySelector("summary")?.textContent?.includes("Tarte au citron"),
    );
    expect(details).toBeTruthy();
    const promptText = details!.querySelector("pre")!.textContent ?? "";

    expect(promptText).toContain("Tarte au citron");
    expect(promptText).toContain("Pâte sucrée");
    expect(promptText).toContain("Crème citron");
    expect(promptText).toContain("Citron");
    expect(promptText).toContain("Beurre");
    expect(promptText).toContain("Dressage à la poche à douille cannelée.");
  });

  it("coût non fiable : « Estimation indisponible » et lien documentaire, jamais un prix inventé", () => {
    renderBrowser({ costPerImageEstimateEur: null });
    fireEvent.click(screen.getAllByRole("button", { name: "Générer ce sujet…" })[0]);

    const panel = screen.getByLabelText("Confirmation avant génération");
    expect(within(panel).getByText("Estimation indisponible")).toBeInTheDocument();
    const link = within(panel).getByRole("link", { name: /barème tarifaire officiel/ });
    expect(link).toHaveAttribute("href", "https://example.test/pricing");
  });

  it("coût fiable : affiche un montant calculé, jamais « Estimation indisponible »", () => {
    renderBrowser({ costPerImageEstimateEur: 0.5 });
    fireEvent.click(screen.getAllByRole("button", { name: "Générer ce sujet…" })[0]);

    const panel = screen.getByLabelText("Confirmation avant génération");
    expect(textOf(panel)).toContain("0.50 € estimés");
    expect(within(panel).queryByText("Estimation indisponible")).not.toBeInTheDocument();
  });

  it("lot de plusieurs sujets : liste tous les sujets exacts et exige la phrase adaptée au nombre", () => {
    renderBrowser();
    fireEvent.click(screen.getByRole("checkbox", { name: /Citron/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Tarte au citron/ }));

    const panel = screen.getByLabelText("Confirmation avant génération");
    const text = textOf(panel);
    expect(text).toContain("Citron — Matières premières");
    expect(text).toContain("Tarte au citron — Recettes");
    expect(within(panel).getByLabelText(/Pour confirmer, tapez exactement « GENERER LOT 2 »/)).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Générer le lot (2)" })).toBeInTheDocument();
  });
});

describe("MissingQueueBrowser — deep-link approché depuis une fiche métier (K12)", () => {
  it("`initialQuery` pré-remplit la recherche et filtre sur le sujet visé, sans rien présélectionner ni confirmer", () => {
    renderBrowser({ initialQuery: "Tarte au citron" });

    expect(screen.getByRole("searchbox", { name: "Rechercher un sujet manquant par nom" })).toHaveValue(
      "Tarte au citron",
    );
    expect(screen.getByText("Tarte au citron")).toBeInTheDocument();
    // "Citron" (ingrédient) est écarté : sa recherche par sous-chaîne ne le
    // retient pas pour la requête "Tarte au citron" (l'inverse serait vrai).
    expect(screen.queryByText("Citron")).not.toBeInTheDocument();
    // Reste une recherche normale, modifiable : aucune sélection ni
    // confirmation automatique — l'utilisateur doit encore agir.
    expect(screen.queryByLabelText(/Pour confirmer, tapez exactement/)).not.toBeInTheDocument();
  });
});
