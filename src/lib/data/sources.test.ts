import { describe, expect, it, vi } from "vitest";
import { getRecipeCountForSource, getSourceBySlug, getSources } from "./sources";

describe("getSources", () => {
  it("retourne les 4 sources du jeu démo", async () => {
    expect(await getSources()).toHaveLength(4);
  });
});

describe("getSourceBySlug", () => {
  it("trouve Hennessy par son slug", async () => {
    expect((await getSourceBySlug("hennessy"))?.name).toBe("Hennessy");
  });

  it("retourne undefined pour un slug inconnu", async () => {
    expect(await getSourceBySlug("inexistant")).toBeUndefined();
  });
});

describe("getRecipeCountForSource", () => {
  it("calcule dynamiquement le nombre de recettes (jamais codé en dur)", async () => {
    const hennessy = (await getSourceBySlug("hennessy"))!;
    expect(await getRecipeCountForSource(hennessy.id)).toBe(2);
  });
});

describe("K1 — aucun repli silencieux vers la démo quand Supabase est configuré et échoue", () => {
  it("propage une erreur explicite plutôt que de retomber sur les données de démo", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/env", () => ({ hasSupabaseConfig: () => true }));
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        from: () => ({
          select: async () => ({ data: null, error: { message: "réseau indisponible" } }),
        }),
      }),
    }));

    const { getSources: getSourcesWithSupabaseConfigured } = await import("./sources");
    await expect(getSourcesWithSupabaseConfigured()).rejects.toThrow(/Lecture des entreprises impossible/);

    vi.doUnmock("@/lib/supabase/env");
    vi.doUnmock("@/lib/supabase/server");
    vi.resetModules();
  });
});
