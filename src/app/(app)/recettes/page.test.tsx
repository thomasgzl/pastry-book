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

describe("RecettesBrowser — pagination (12 par page, multiple de 2/3/4 colonnes)", () => {
  // Jeu démo réel (6 recettes) trop court pour dépasser une page : liste
  // synthétique de 15 recettes, une seule source (filtre par entreprise non
  // affiché, hors sujet ici).
  const manyRecipes = Array.from({ length: 15 }, (_, index) => {
    const title = `Recette ${String(index + 1).padStart(2, "0")}`;
    return {
      id: `recipe-${index}`,
      title,
      sourceId: demoSources[0].id,
      cardData: { title, sourceName: demoSources[0].name, ingredientTags: [], href: `/recettes/recette-${index}` },
    };
  });

  function renderManyRecipes() {
    return render(<RecettesBrowser recipes={manyRecipes} sources={sourceProps} />);
  }

  it("n'affiche que 12 recettes sur la première page (ligne complète en 2/3/4 colonnes)", () => {
    renderManyRecipes();
    expect(screen.getByRole("link", { name: /Recette 01/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Recette 12/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Recette 13/ })).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 sur 2")).toBeInTheDocument();
  });

  it("« Suivant » met à jour l'URL avec ?page=2", () => {
    renderManyRecipes();
    fireEvent.click(screen.getByRole("button", { name: /Suivant/ }));
    expect(replace).toHaveBeenCalledWith("/recettes?page=2", { scroll: false });
  });

  it("affiche la dernière page, incomplète (?page=2)", () => {
    searchParams = new URLSearchParams("page=2");
    renderManyRecipes();
    expect(screen.getByRole("link", { name: /Recette 13/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Recette 15/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Recette 01/ })).not.toBeInTheDocument();
  });
});

describe("RecettesPage (Server Component, K1 — charge src/lib/data/*)", () => {
  it("assemble les props depuis Supabase/démo et les passe à RecettesBrowser", async () => {
    render(await RecettesPage());
    expect(screen.getByRole("link", { name: /Pâte sablée \(CAP\)/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Tarte au citron \(Hennessy\)/ })).toBeInTheDocument();
  });
});
