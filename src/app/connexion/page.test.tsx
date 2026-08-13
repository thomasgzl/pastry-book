import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConnexionPage, { isSafeInternalRedirect } from "./page";

// Aucun backend Supabase réel dans ces tests (pas de projet de test dédié) :
// `createSupabaseBrowserClient` est mocké. Un test Playwright de bout en
// bout (vraie connexion) n'est donc pas possible ici ; à ajouter une fois
// qu'un projet Supabase de test est disponible pour la CI (limite documentée
// dans le rapport de livraison B10).
const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword },
  }),
}));

const replace = vi.fn();
let searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

describe("isSafeInternalRedirect", () => {
  it("accepte un chemin interne", () => {
    expect(isSafeInternalRedirect("/recettes")).toBe(true);
  });

  it("rejette une URL protocole-relative externe", () => {
    expect(isSafeInternalRedirect("//exemple-externe.com")).toBe(false);
  });

  it("rejette une URL absolue externe", () => {
    expect(isSafeInternalRedirect("https://exemple-externe.com")).toBe(false);
  });

  it("rejette une valeur absente", () => {
    expect(isSafeInternalRedirect(null)).toBe(false);
  });
});

describe("ConnexionPage", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    replace.mockReset();
    searchParams = new URLSearchParams();
  });

  it("affiche un formulaire email/mot de passe accessible, sans inscription", () => {
    render(<ConnexionPage />);

    expect(screen.getByLabelText("Adresse e-mail")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Mot de passe")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.queryByText(/créer un compte/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/inscription/i)).not.toBeInTheDocument();
  });

  it("affiche un état de chargement puis redirige vers / par défaut en cas de succès", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    render(<ConnexionPage />);

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "motdepasse" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(screen.getByRole("button", { name: "Connexion en cours…" })).toBeDisabled();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "demo@example.com",
      password: "motdepasse",
    });
  });

  it("affiche un message d'erreur clair en cas d'échec, sans rediriger", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<ConnexionPage />);

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "mauvais" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Adresse e-mail ou mot de passe incorrect.",
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirige vers la page d'origine demandée si elle est interne", async () => {
    searchParams = new URLSearchParams("redirect=/recettes");
    signInWithPassword.mockResolvedValue({ error: null });
    render(<ConnexionPage />);

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "motdepasse" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/recettes"));
  });

  it("ignore une redirection externe demandée et retombe sur /", async () => {
    searchParams = new URLSearchParams("redirect=https://exemple-externe.com");
    signInWithPassword.mockResolvedValue({ error: null });
    render(<ConnexionPage />);

    fireEvent.change(screen.getByLabelText("Adresse e-mail"), {
      target: { value: "demo@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "motdepasse" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
  });
});
