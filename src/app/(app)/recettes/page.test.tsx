import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecipes, toRecipeCardData } from "@/lib/data/recipes";
import { getRecipeCountForSource, getSources } from "@/lib/data/sources";
import { RecettesBrowser } from "./RecettesBrowser";
import RecettesPage from "./page";

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/recettes",
  useSearchParams: () => searchParams,
}));

// Données déjà résolues côté « serveur » (K1 : `page.tsx` est un Server
// Component async qui appelle `src/lib/data/*` ; `RecettesBrowser` — testé
// ici — ne fait que filtrer/afficher des props déjà résolues, jamais un
// appel réseau). Résolu une seule fois, en tête de fichier (mode démo :
// aucune variable Supabase dans l'environnement de test, voir
// `vitest.config.ts`).
const demoRecipes = await getRecipes();
const demoSources = await getSources();
const cardDataList = await Promise.all(demoRecipes.map((recipe) => toRecipeCardData(recipe)));
const recipeCounts = await Promise.all(demoSources.map((source) => getRecipeCountForSource(source.id)));

const recipeProps = demoRecipes.map((recipe, index) => ({
  id: recipe.id,
  title: recipe.title,
  sourceId: recipe.sourceId,
  cardData: cardDataList[index],
}));
const sourceProps = demoSources.map((source, index) => ({
  id: source.id,
  slug: source.slug,
  name: source.name,
  recipeCount: recipeCounts[index],
}));

function renderBrowser() {
  return render(<RecettesBrowser recipes={recipeProps} sources={sourceProps} />);
}

beforeEach(() => {
  replace.mockReset();
  searchParams = new URLSearchParams();
});

describe("RecettesBrowser", () => {
  it("affiche toutes les recettes sans filtre", () => {
    renderBrowser();
    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeInTheDocument();
  });

  it("distingue les deux « Crème pâtissière » homonymes par leur source affichée", () => {
    renderBrowser();
    const links = screen.getAllByRole("link", { name: /Crème pâtissière/ });
    expect(links).toHaveLength(2);
    const sourceLines = links.map((link) => link.textContent ?? "");
    expect(sourceLines.some((text) => text.includes("CAP Pâtissier"))).toBe(true);
    expect(sourceLines.some((text) => text.includes("Hennessy"))).toBe(true);
  });

  it("filtre par titre déjà présent dans l'URL (?q=)", () => {
    searchParams = new URLSearchParams("q=citron");
    renderBrowser();
    expect(screen.getByRole("link", { name: /Tarte au citron/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Pâte sablée/ })).not.toBeInTheDocument();
  });

  it("filtre par source déjà présente dans l'URL (?source=)", () => {
    searchParams = new URLSearchParams("source=cap-patissier");
    renderBrowser();
    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Tarte au citron/ })).not.toBeInTheDocument();
  });

  it("met à jour l'URL (jamais un simple état local perdu) quand on tape dans la recherche", () => {
    renderBrowser();
    fireEvent.change(screen.getByRole("searchbox", { name: "Rechercher une recette par titre" }), {
      target: { value: "citron" },
    });
    expect(replace).toHaveBeenCalledWith("/recettes?q=citron", { scroll: false });
  });

  it("affiche le filtre par entreprise puisque plusieurs sources ont des recettes", () => {
    renderBrowser();
    expect(screen.getByRole("group", { name: "Filtrer par entreprise" })).toBeInTheDocument();
  });

  it("affiche un état vide quand aucune recette ne correspond", () => {
    searchParams = new URLSearchParams("q=xyzabc-inexistant");
    renderBrowser();
    expect(screen.getByText("Aucune recette ne correspond à cette recherche.")).toBeInTheDocument();
  });
});

describe("RecettesPage (Server Component, K1 — charge src/lib/data/*)", () => {
  it("assemble les props depuis Supabase/démo et les passe à RecettesBrowser", async () => {
    render(await RecettesPage());
    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeInTheDocument();
  });
});
