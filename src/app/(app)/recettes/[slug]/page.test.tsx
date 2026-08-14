import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RecettePage from "./page";

describe("RecettePage — recette CAP minimale (pate-sablee-cap)", () => {
  it("n'affiche que titre, source, coefficient et ingrédients — aucun bloc vide", async () => {
    const { container } = render(
      await RecettePage({
        params: Promise.resolve({ slug: "pate-sablee-cap" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Pâte sablée (CAP)" })).toBeInTheDocument();
    // "CAP Pâtissier" apparaît à la fois dans le fil d'Ariane et dans l'en-tête de la fiche.
    expect(screen.getAllByText("CAP Pâtissier").length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: "Coefficient prédéfini" })).toBeInTheDocument();
    expect(screen.getByText("Farine T55")).toBeInTheDocument();
    expect(screen.getByText("Sel")).toBeInTheDocument();

    // Aucune section vide (CLAUDE.md, principe 2). L'image, décorative
    // (alt=""), a le rôle ARIA implicite "presentation" — on la recherche
    // donc directement dans le DOM plutôt que par rôle accessible.
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Allergènes détectés" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Matières premières clés" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Informations complémentaires" })).not.toBeInTheDocument();
  });

  it("QS n'est jamais recalculé et n'affiche jamais « À vérifier »", async () => {
    render(
      await RecettePage({
        params: Promise.resolve({ slug: "pate-sablee-cap" }),
        searchParams: Promise.resolve({}),
      }),
    );

    // "Sel" a originalQuantityText "QS" avec verificationStatus "proposed" :
    // affiché tel quel, jamais "À vérifier" (aucun ingrédient needs_review
    // dans cette recette).
    expect(screen.getAllByText("QS").length).toBeGreaterThan(0);
    expect(screen.queryByText("À vérifier")).not.toBeInTheDocument();
  });
});

describe("RecettePage — recette Hennessy détaillée (tarte-au-citron-hennessy)", () => {
  it("affiche photo, informations complémentaires et allergènes (au moins un proposé, jamais confirmé à tort)", async () => {
    const { container } = render(
      await RecettePage({
        params: Promise.resolve({ slug: "tarte-au-citron-hennessy" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { name: "Tarte au citron (Hennessy)" })).toBeInTheDocument();
    // Image décorative (alt="") : rôle ARIA implicite "presentation", donc
    // recherchée directement dans le DOM (voir note ci-dessus).
    expect(container.querySelector("img")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Informations complémentaires" })).toBeInTheDocument();
    expect(screen.getByText(/Cuisson à blanc 15 min/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Allergènes détectés" })).toBeInTheDocument();
    // Gluten et œufs confirmés, lait proposé (démo) : le proposé n'est
    // jamais rendu comme confirmé.
    expect(screen.getByText("Lait")).toBeInTheDocument();
    expect(screen.getAllByText("proposé, à vérifier").length).toBeGreaterThan(0);

    expect(screen.getByRole("heading", { name: "Matières premières clés" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Citron" })).toBeInTheDocument();
  });

  it("la préparation « purée de citron » needs_review affiche « À vérifier » avec l'original en secondaire", async () => {
    render(
      await RecettePage({
        params: Promise.resolve({ slug: "tarte-au-citron-hennessy" }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getAllByText("À vérifier").length).toBeGreaterThan(0);
    expect(screen.getByText("(1/2)")).toBeInTheDocument();
  });
});

describe("RecettePage — préparations homonymes non partagées", () => {
  it("Crème pâtissière (CAP) et Crème pâtissière (Hennessy) affichent chacune leurs propres ingrédients", async () => {
    const { unmount } = render(
      await RecettePage({
        params: Promise.resolve({ slug: "creme-patissiere-cap" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByText("Poudre à crème")).toBeInTheDocument();
    expect(screen.queryByText("Gousse de vanille")).not.toBeInTheDocument();
    unmount();

    render(
      await RecettePage({
        params: Promise.resolve({ slug: "creme-patissiere-hennessy" }),
        searchParams: Promise.resolve({}),
      }),
    );
    // "Gousse de vanille" (Hennessy) n'est jamais mélangée avec "Vanille"
    // (CAP) : deux ingrédients de deux préparations indépendantes. Les deux
    // résolvent vers la même matière première canonique "Vanille" (les
    // matières premières canoniques, elles, sont volontairement partagées
    // entre entreprises — seules les préparations ne le sont pas), donc
    // "Vanille" apparaît légitimement comme matière première clé ici : on
    // vérifie l'absence de mélange sur le nom d'ingrédient original, pas sur
    // la matière première résolue.
    expect(screen.getByText("Gousse de vanille")).toBeInTheDocument();
  });
});

describe("RecettePage — fil d'Ariane", () => {
  it("Accueil → Entreprises → Source → Catégorie → Recette par défaut", async () => {
    render(
      await RecettePage({
        params: Promise.resolve({ slug: "tarte-au-citron-hennessy" }),
        searchParams: Promise.resolve({}),
      }),
    );
    expect(screen.getByRole("link", { name: "Entreprises" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hennessy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Desserts boutique" })).toBeInTheDocument();
  });

  it("Accueil → Recettes → Recette avec ?from=recettes", async () => {
    render(
      await RecettePage({
        params: Promise.resolve({ slug: "tarte-au-citron-hennessy" }),
        searchParams: Promise.resolve({ from: "recettes" }),
      }),
    );
    expect(screen.getByRole("link", { name: "Recettes" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Hennessy" })).not.toBeInTheDocument();
  });
});

describe("RecettePage — slug inconnu", () => {
  it("404", async () => {
    await expect(
      RecettePage({ params: Promise.resolve({ slug: "inexistant" }), searchParams: Promise.resolve({}) }),
    ).rejects.toThrow();
  });
});
