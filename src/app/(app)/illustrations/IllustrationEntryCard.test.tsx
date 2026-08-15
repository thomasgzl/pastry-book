/**
 * Tests ciblés niveau 1 (K11) — actions d'approbation/rejet/version exposées
 * par sujet dans `/illustrations`. `../visuels/actions` et `./regenerateActions`
 * sont mockés : ces tests portent sur ce qui est AFFICHÉ et sur quel
 * `assetId`/sujet chaque formulaire transporte, jamais sur l'exécution réelle
 * (déjà couverte par `storage.test.ts`, E1/K11, et `regenerateActions.test.ts`).
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IllustrationEntryCard } from "./IllustrationEntryCard";
import type { IllustrationEntry, RegenerateProviderInfo } from "./IllustrationsBrowser";

vi.mock("../visuels/actions", () => ({
  approveAsPrimaryAction: vi.fn(),
  rejectAction: vi.fn(),
  setPrimaryAction: vi.fn(),
}));

vi.mock("./regenerateActions", () => ({
  regenerateVersionAction: vi.fn(async (previous: unknown) => previous),
  INITIAL_REGENERATE_STATE: { error: null, success: false },
}));

const REGENERATE_INFO: RegenerateProviderInfo = {
  providerName: "OpenAI Images",
  providerModel: "gpt-image-2",
  quality: "draft",
  costPerImageEstimateEur: null,
  costDocUrl: "https://example.test/pricing",
  dimensionsByType: {
    ingredient: { ratio: "1:1", size: "1024x1024" },
    recipe: { ratio: "4:3", size: "1536x1024" },
    source: { ratio: "16:9", size: "1536x1024" },
    sourceCategory: { ratio: "4:3", size: "1536x1024" },
  },
};

function entry(overrides: Partial<IllustrationEntry>): IllustrationEntry {
  return {
    type: "ingredient",
    id: "00000000-0000-4000-8000-000000005001",
    slug: "sujet",
    label: "Sujet",
    status: "draft",
    thumbnailUrl: null,
    versions: [],
    ...overrides,
  };
}

describe("IllustrationEntryCard — actions par version (K11)", () => {
  it("un brouillon propose « Approuver et utiliser » et « Rejeter », chacun avec l'assetId de CETTE version", () => {
    const pistache = entry({
      label: "Pistache",
      versions: [
        { id: "asset-draft-1", status: "draft", isPrimary: false, imageUrl: "data:image/svg+xml;base64,AAAA", presetVersion: "v1", createdAt: "2026-08-15T00:00:00.000Z" },
      ],
    });
    render(<IllustrationEntryCard entry={pistache} regenerateInfo={REGENERATE_INFO} />);

    const approve = screen.getByRole("button", { name: "Approuver et utiliser" });
    const reject = screen.getByRole("button", { name: "Rejeter" });
    expect(within(approve.closest("form")!).getByDisplayValue("asset-draft-1")).toBeInTheDocument();
    expect(within(reject.closest("form")!).getByDisplayValue("asset-draft-1")).toBeInTheDocument();
    expect(screen.getByText(/reste en brouillon/)).toBeInTheDocument();
  });

  it("un visuel déjà approuvé et principal n'affiche ni Approuver ni Rejeter ni Définir comme principal", () => {
    const citron = entry({
      label: "Citron",
      status: "approved",
      versions: [
        { id: "asset-primary", status: "approved", isPrimary: true, imageUrl: "data:image/svg+xml;base64,AAAA", presetVersion: "v1", createdAt: "2026-08-15T00:00:00.000Z" },
      ],
    });
    render(<IllustrationEntryCard entry={citron} regenerateInfo={REGENERATE_INFO} />);

    expect(screen.queryByRole("button", { name: "Approuver et utiliser" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rejeter" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Définir comme principal" })).not.toBeInTheDocument();
  });

  it("un second visuel approuvé mais non principal propose « Définir comme principal »", () => {
    const citron = entry({
      label: "Citron",
      versions: [
        { id: "asset-old-primary", status: "approved", isPrimary: true, imageUrl: "data:image/svg+xml;base64,AAAA", presetVersion: "v1", createdAt: "2026-08-15T00:00:00.000Z" },
        { id: "asset-second", status: "approved", isPrimary: false, imageUrl: "data:image/svg+xml;base64,BBBB", presetVersion: "v1", createdAt: "2026-08-15T01:00:00.000Z" },
      ],
    });
    render(<IllustrationEntryCard entry={citron} regenerateInfo={REGENERATE_INFO} />);

    const setPrimary = screen.getByRole("button", { name: "Définir comme principal" });
    expect(within(setPrimary.closest("form")!).getByDisplayValue("asset-second")).toBeInTheDocument();
  });

  it("« Générer une nouvelle version » est un contrôle unique au niveau du sujet, jamais répété par version", () => {
    const pistache = entry({
      label: "Pistache",
      versions: [
        { id: "asset-1", status: "rejected", isPrimary: false, imageUrl: "data:image/svg+xml;base64,AAAA", presetVersion: "v1", createdAt: "2026-08-15T00:00:00.000Z" },
        { id: "asset-2", status: "draft", isPrimary: false, imageUrl: "data:image/svg+xml;base64,BBBB", presetVersion: "v1", createdAt: "2026-08-15T01:00:00.000Z" },
      ],
    });
    render(<IllustrationEntryCard entry={pistache} regenerateInfo={REGENERATE_INFO} />);

    expect(screen.getAllByText("Générer une nouvelle version…")).toHaveLength(1);
  });

  it("un sujet sans aucune version n'affiche aucune action (géré par la file des manquants, K8)", () => {
    const tarte = entry({ type: "recipe", label: "Tarte au citron", status: "missing", versions: [] });
    render(<IllustrationEntryCard entry={tarte} regenerateInfo={REGENERATE_INFO} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Générer une nouvelle version…")).not.toBeInTheDocument();
  });
});
