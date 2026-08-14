import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PilotExtractionPanel } from "./PilotExtractionPanel";

/**
 * Contrôles ciblés (lot G, correction body size + multi-captures) : la
 * garde 8 Mo côté client doit refuser AVANT tout appel réel — jamais testé
 * ici avec un vrai appel OpenAI, seulement la sélection de fichier (document
 * non-image, chemin inchangé par G2-bis).
 */
function makeFile(name: string, sizeBytes: number, type = "application/pdf"): File {
  const file = new File([""], name, { type });
  Object.defineProperty(file, "size", { value: sizeBytes });
  return file;
}

describe("PilotExtractionPanel — garde 8 Mo (document non-image)", () => {
  it("accepte un fichier inférieur à 1 Mo", () => {
    render(<PilotExtractionPanel extractionModel="gpt-5-mini" onExtracted={() => {}} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0]!, { target: { files: [makeFile("cap.pdf", 500 * 1024)] } });
    expect(screen.getAllByText(/Original 0\.5 Mo/)[0]).toBeInTheDocument();
    expect(screen.queryByText(/dépasse la limite de 8 Mo/)).not.toBeInTheDocument();
  });

  it("accepte un fichier entre 1 et 8 Mo", () => {
    render(<PilotExtractionPanel extractionModel="gpt-5-mini" onExtracted={() => {}} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[1]!, { target: { files: [makeFile("hennessy.pdf", 5 * 1024 * 1024)] } });
    expect(screen.getAllByText(/Original 5\.0 Mo/)[0]).toBeInTheDocument();
    expect(screen.queryByText(/dépasse la limite de 8 Mo/)).not.toBeInTheDocument();
  });

  it("refuse un fichier supérieur à 8 Mo avant tout appel", () => {
    render(<PilotExtractionPanel extractionModel="gpt-5-mini" onExtracted={() => {}} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[2]!, { target: { files: [makeFile("capture.pdf", 9 * 1024 * 1024)] } });
    expect(screen.getAllByText(/dépasse la limite de 8 Mo/)[0]).toBeInTheDocument();
  });
});

describe("PilotExtractionPanel — plusieurs captures pour une seule recette", () => {
  it("mélanger image et document est refusé, jamais silencieusement", () => {
    render(<PilotExtractionPanel extractionModel="gpt-5-mini" onExtracted={() => {}} />);
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(fileInputs[0]!, {
      target: { files: [makeFile("page1.jpg", 200 * 1024, "image/jpeg"), makeFile("dossier.pdf", 200 * 1024, "application/pdf")] },
    });
    expect(screen.getAllByText(/Un seul document PDF\/DOCX\/texte à la fois/)[0]).toBeInTheDocument();
  });
});
