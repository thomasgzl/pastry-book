/**
 * Test ciblé niveau 1 (K3-IMPORT/K4) : `checkImportDuplicates` (K3-DATA)
 * branché à l'écran de vérification — présenté à titre purement informatif,
 * jamais bloquant, jamais de fusion automatique.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReviewStep } from "./ReviewStep";
import { createEmptyDraft } from "../draftFactory";

const SOURCE_ID = "11111111-1111-1111-1111-111111111111";

function baseProps() {
  return {
    draft: { ...createEmptyDraft(SOURCE_ID), title: "Tartelette citron" },
    canonicalIngredients: [],
    specificities: [],
    allergens: [],
    sourceName: "Hennessy",
    categoryName: null,
    validationErrors: [],
    duplicate: null,
    acknowledgeDuplicate: false,
    onAcknowledgeDuplicateChange: vi.fn(),
    duplicateChecking: false,
    duplicateCheckError: null,
    onRetryDuplicateCheck: vi.fn(),
    importDuplicates: [],
    importDuplicatesError: null,
    completeness: null,
    acknowledgeIncomplete: false,
    onAcknowledgeIncompleteChange: vi.fn(),
    saveError: null,
  };
}

describe("ReviewStep — différences K4", () => {
  it("n'affiche rien quand aucune différence n'est trouvée", () => {
    render(<ReviewStep {...baseProps()} />);
    expect(screen.queryByText(/Différences trouvées/)).not.toBeInTheDocument();
  });

  it("présente chaque différence trouvée, jamais comme un blocage", () => {
    render(
      <ReviewStep
        {...baseProps()}
        importDuplicates={[
          {
            kind: "same_title_other_source",
            recipeId: "r1",
            recipeTitle: "Tartelette citron",
            sourceId: "22222222-2222-2222-2222-222222222222",
          },
          {
            kind: "homonymous_preparation",
            recipeId: "r2",
            recipeTitle: "Autre recette",
            sourceId: SOURCE_ID,
            sectionName: "Pâte sucrée",
          },
        ]}
      />,
    );
    expect(screen.getByText(/Différences trouvées/)).toBeInTheDocument();
    expect(screen.getByText(/Même titre dans une autre entreprise/)).toBeInTheDocument();
    expect(screen.getByText(/Préparation du même nom déjà utilisée ailleurs/)).toBeInTheDocument();
    expect(screen.getByText(/Pâte sucrée/)).toBeInTheDocument();
  });

  it("affiche l'échec de vérification étendue sans bloquer l'écran", () => {
    render(<ReviewStep {...baseProps()} importDuplicatesError="Impossible de vérifier les différences." />);
    expect(screen.getByText("Impossible de vérifier les différences.")).toBeInTheDocument();
  });
});
