import { describe, expect, it } from "vitest";
import {
  MAX_SOURCE_FILE_SIZE_BYTES,
  sniffMimeType,
  sourceFileExtension,
  sourceFilePath,
  validateSourceFile,
} from "./sourceUpload";

const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d];
const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];
const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const DOCX_HEADER = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00];

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

describe("sniffMimeType (K3-DATA, validation MIME réelle)", () => {
  it.each([
    ["image/jpeg", JPEG_HEADER],
    ["image/png", PNG_HEADER],
    ["application/pdf", PDF_HEADER],
    ["image/webp", WEBP_HEADER],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", DOCX_HEADER],
  ] as const)("reconnaît %s à partir de sa signature binaire", (mime, header) => {
    expect(sniffMimeType(new Uint8Array(header))).toBe(mime);
  });

  it("retourne null pour un contenu non reconnu (jamais un type inventé)", () => {
    expect(sniffMimeType(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it("ignore l'extension déclarée : seul le contenu réel compte", () => {
    // Octets JPEG réels malgré un nom se terminant en « .pdf » côté appelant —
    // sniffMimeType ne regarde jamais le nom de fichier.
    expect(sniffMimeType(new Uint8Array(JPEG_HEADER))).toBe("image/jpeg");
  });
});

describe("validateSourceFile (K3-DATA)", () => {
  function fileWithBytes(bytes: number[], name = "fichier"): File {
    return new File([new Uint8Array(bytes)], name);
  }

  it("accepte un fichier PNG valide et retourne son type MIME réel", async () => {
    const file = fileWithBytes(PNG_HEADER, "photo.png");
    await expect(validateSourceFile(file)).resolves.toBe("image/png");
  });

  it("rejette un fichier vide", async () => {
    const file = fileWithBytes([], "vide.png");
    await expect(validateSourceFile(file)).rejects.toThrow(/vide/i);
  });

  it("rejette un fichier au-delà de la limite de 8 Mo", async () => {
    const oversized = new File([new Uint8Array(MAX_SOURCE_FILE_SIZE_BYTES + 1)], "gros.pdf");
    await expect(validateSourceFile(oversized)).rejects.toThrow(/volumineux/i);
  });

  it("rejette un contenu dont la signature binaire ne correspond à aucun type accepté, même avec une extension trompeuse", async () => {
    const file = fileWithBytes([0x00, 0x01, 0x02, 0x03], "recette.pdf");
    await expect(validateSourceFile(file)).rejects.toThrow(/non reconnu/i);
  });
});
