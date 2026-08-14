import { describe, expect, it } from "vitest";
import { sourceFileExtension, sourceFilePath } from "./sourceUpload";

describe("sourceFileExtension", () => {
  it("déduit l'extension du nom de fichier en priorité", () => {
    expect(sourceFileExtension("recette.PDF", "application/pdf")).toBe("pdf");
  });

  it("retombe sur le type MIME si le nom n'a pas d'extension", () => {
    expect(sourceFileExtension("recette", "image/webp")).toBe("webp");
  });

  it("retombe sur « bin » si ni le nom ni le type MIME ne donnent d'indice fiable", () => {
    expect(sourceFileExtension("recette", "application/octet-stream")).toBe("bin");
  });
});

describe("sourceFilePath", () => {
  it("préfixe le chemin par l'identifiant du lot, jamais un autre lot", () => {
    const path = sourceFilePath("batch-1", "capture.jpg", "image/jpeg");
    expect(path.startsWith("batch-1/")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
  });

  it("génère un chemin distinct à chaque appel (aucune collision silencieuse entre fichiers)", () => {
    const first = sourceFilePath("batch-1", "capture.jpg", "image/jpeg");
    const second = sourceFilePath("batch-1", "capture.jpg", "image/jpeg");
    expect(first).not.toBe(second);
  });
});
