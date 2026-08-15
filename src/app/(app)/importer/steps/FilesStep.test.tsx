/**
 * Tests ciblés niveau 1 (K3-IMPORT) — mode démonstration sans Supabase
 * configuré (`hasSupabaseConfig()` faux dans `vitest.config.ts`, comme pour
 * le reste de la suite), donc branche mémoire de `handleFileInput` exercée
 * ici. Couvre : limite de taille alignée sur `MAX_SOURCE_FILE_SIZE_BYTES`
 * (8 Mo, correction signalée par K3-DATA — plus jamais 20 Mo), retrait, et
 * réorganisation monter/descendre.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilesStep } from "./FilesStep";
import { MAX_SOURCE_FILE_SIZE_BYTES } from "@/lib/import/sourceUpload";
import type { ImportFileRef } from "@/lib/import/schema";

function file(name: string, sizeBytes: number, type = "image/jpeg"): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: sizeBytes });
  return f;
}

describe("FilesStep", () => {
  it("rejette un fichier au-delà de la vraie limite (8 Mo), jamais 20 Mo", async () => {
    const onFilesChange = vi.fn();
    render(
      <FilesStep
        files={[]}
        pastedText={null}
        onFilesChange={onFilesChange}
        onPastedTextChange={vi.fn()}
        onDemoExampleLoaded={vi.fn()}
        importBatchId="batch-1"
      />,
    );
    const input = screen.getByLabelText("Ajouter un ou plusieurs fichiers") as HTMLInputElement;
    const oversized = file("photo.jpg", MAX_SOURCE_FILE_SIZE_BYTES + 1);
    fireEvent.change(input, { target: { files: [oversized] } });

    expect(await screen.findByText(/limite 8 Mo/)).toBeInTheDocument();
    expect(onFilesChange).not.toHaveBeenCalled();
  });

  it("accepte un fichier sous la limite de 8 Mo (mode démo, sans Supabase configuré)", async () => {
    const onFilesChange = vi.fn();
    render(
      <FilesStep
        files={[]}
        pastedText={null}
        onFilesChange={onFilesChange}
        onPastedTextChange={vi.fn()}
        onDemoExampleLoaded={vi.fn()}
        importBatchId="batch-1"
      />,
    );
    const input = screen.getByLabelText("Ajouter un ou plusieurs fichiers") as HTMLInputElement;
    const ok = file("photo.jpg", MAX_SOURCE_FILE_SIZE_BYTES - 1);
    fireEvent.change(input, { target: { files: [ok] } });

    expect(onFilesChange).toHaveBeenCalledWith([
      { name: "photo.jpg", type: "image/jpeg", sizeBytes: MAX_SOURCE_FILE_SIZE_BYTES - 1, sourceFileUrl: null },
    ]);
  });

  it("réorganise deux fichiers (monter/descendre) sans en perdre", () => {
    const files: ImportFileRef[] = [
      { name: "page1.jpg", type: "image/jpeg", sizeBytes: 10, sourceFileUrl: null },
      { name: "page2.jpg", type: "image/jpeg", sizeBytes: 10, sourceFileUrl: null },
    ];
    const onFilesChange = vi.fn();
    render(
      <FilesStep
        files={files}
        pastedText={null}
        onFilesChange={onFilesChange}
        onPastedTextChange={vi.fn()}
        onDemoExampleLoaded={vi.fn()}
        importBatchId="batch-1"
      />,
    );

    fireEvent.click(screen.getByLabelText("Descendre page1.jpg"));
    expect(onFilesChange).toHaveBeenCalledWith([files[1], files[0]]);
  });

  it("retire un fichier de la liste", () => {
    const files: ImportFileRef[] = [
      { name: "page1.jpg", type: "image/jpeg", sizeBytes: 10, sourceFileUrl: null },
    ];
    const onFilesChange = vi.fn();
    render(
      <FilesStep
        files={files}
        pastedText={null}
        onFilesChange={onFilesChange}
        onPastedTextChange={vi.fn()}
        onDemoExampleLoaded={vi.fn()}
        importBatchId="batch-1"
      />,
    );

    fireEvent.click(screen.getByText("Retirer"));
    expect(onFilesChange).toHaveBeenCalledWith([]);
  });
});
