import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IllustrationsBrowser, type IllustrationEntry } from "./IllustrationsBrowser";
import IllustrationsPage from "./page";

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/illustrations",
  useSearchParams: () => searchParams,
}));

function entry(overrides: Partial<IllustrationEntry>): IllustrationEntry {
  return {
    type: "ingredient",
    id: crypto.randomUUID(),
    slug: "sujet",
    label: "Sujet",
    status: "missing",
    thumbnailUrl: null,
    versions: [],
    ...overrides,
  };
}

const citron = entry({
  type: "ingredient",
  label: "Citron",
  status: "approved",
  thumbnailUrl: "data:image/svg+xml;base64,AAAA",
  versions: [
    {
      id: "v1",
      status: "approved",
      isPrimary: true,
      imageUrl: "data:image/svg+xml;base64,AAAA",
      presetVersion: "v1",
      createdAt: "2026-08-14T09:00:00.000Z",
    },
  ],
});

const pistache = entry({
  type: "ingredient",
  label: "Pistache",
  status: "draft",
  versions: [
    {
      id: "v2",
      status: "rejected",
      isPrimary: false,
      imageUrl: "data:image/svg+xml;base64,BBBB",
      presetVersion: "v1",
      createdAt: "2026-08-14T09:05:00.000Z",
    },
    {
      id: "v3",
      status: "draft",
      isPrimary: false,
      imageUrl: "data:image/svg+xml;base64,CCCC",
      presetVersion: "v1",
      createdAt: "2026-08-14T09:10:00.000Z",
    },
  ],
});

const tarteAuCitron = entry({
  type: "recipe",
  label: "Tarte au citron",
  status: "missing",
});

function renderBrowser(entries: IllustrationEntry[]) {
  return render(<IllustrationsBrowser entries={entries} />);
}

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams();
});

describe("IllustrationsBrowser", () => {
  it("affiche tous les sujets sans filtre", () => {
    renderBrowser([citron, pistache, tarteAuCitron]);
    expect(screen.getByText("Citron")).toBeInTheDocument();
    expect(screen.getByText("Pistache")).toBeInTheDocument();
    expect(screen.getByText("Tarte au citron")).toBeInTheDocument();
  });

  it("affiche le statut représentatif d'un sujet (brouillon malgré un historique varié)", () => {
    renderBrowser([pistache]);
    // Pistache : un rejet puis un brouillon -> statut affiché "Brouillon" dans l'en-tête (résumé replié).
    const summary = document.querySelector("summary");
    expect(within(summary as HTMLElement).getByText("Brouillon")).toBeInTheDocument();
  });

  it("un sujet sans version n'affiche aucun bouton dépliable (pas de <details> vide)", () => {
    renderBrowser([tarteAuCitron]);
    expect(screen.queryByRole("group", { name: /Tarte au citron/ })).not.toBeInTheDocument();
    expect(document.querySelector("details")).not.toBeInTheDocument();
  });

  it("un sujet avec des versions déplie son historique complet", () => {
    renderBrowser([pistache]);
    const details = document.querySelector("details");
    expect(details).toBeInTheDocument();
    // Les deux versions (rejetée puis brouillon) sont présentes dans le DOM,
    // même repliées (natif <details>).
    const rows = within(details!.parentElement as HTMLElement).getAllByRole("status");
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("filtre par type de sujet déjà présent dans l'URL (?type=recipe)", () => {
    searchParams = new URLSearchParams("type=recipe");
    renderBrowser([citron, tarteAuCitron]);
    expect(screen.getByText("Tarte au citron")).toBeInTheDocument();
    expect(screen.queryByText("Citron")).not.toBeInTheDocument();
  });

  it("filtre par statut déjà présent dans l'URL (?statut=missing)", () => {
    searchParams = new URLSearchParams("statut=missing");
    renderBrowser([citron, tarteAuCitron]);
    expect(screen.getByText("Tarte au citron")).toBeInTheDocument();
    expect(screen.queryByText("Citron")).not.toBeInTheDocument();
  });

  it("filtre par nom déjà présent dans l'URL (?q=)", () => {
    searchParams = new URLSearchParams("q=pist");
    renderBrowser([citron, pistache]);
    expect(screen.getByText("Pistache")).toBeInTheDocument();
    expect(screen.queryByText("Citron")).not.toBeInTheDocument();
  });

  it("met à jour l'URL (jamais un état local perdu) quand on tape dans la recherche", () => {
    renderBrowser([citron]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher un sujet illustré par nom" }), {
      target: { value: "citron" },
    });
    expect(replace).toHaveBeenCalledWith("/illustrations?q=citron", { scroll: false });
  });

  it("affiche un renvoi vers la génération des visuels manquants quand des sujets manquent", () => {
    renderBrowser([tarteAuCitron]);
    expect(screen.getByRole("link", { name: /visuels manquants/i })).toHaveAttribute(
      "href",
      "/visuels?manquants=1",
    );
  });

  it("n'affiche aucun renvoi manquants quand tous les sujets sont illustrés", () => {
    renderBrowser([citron]);
    expect(screen.queryByRole("link", { name: /visuels manquants/i })).not.toBeInTheDocument();
  });

  it("affiche un état vide quand aucun sujet ne correspond aux filtres", () => {
    searchParams = new URLSearchParams("q=xyzabc-inexistant");
    renderBrowser([citron]);
    expect(screen.getByText("Aucun sujet ne correspond à ces filtres.")).toBeInTheDocument();
  });
});

describe("IllustrationsPage (Server Component, K5 — charge src/lib/visuals/*)", () => {
  it("assemble les sujets démo et les passe à IllustrationsBrowser", async () => {
    render(await IllustrationsPage());
    // Sujets démo (E4/DEMO_VISUAL_ASSETS) : au moins Citron et Pistache présents.
    expect(screen.getAllByText("Citron").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pistache").length).toBeGreaterThan(0);
  });
});
