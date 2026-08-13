import { describe, expect, it } from "vitest";
import { isPublicPath } from "./route-access";

describe("isPublicPath", () => {
  it("laisse passer la page de connexion", () => {
    expect(isPublicPath("/connexion")).toBe(true);
  });

  it("laisse passer une sous-route de connexion (ex. callback)", () => {
    expect(isPublicPath("/connexion/callback")).toBe(true);
  });

  it("bloque l'accueil, page métier privée", () => {
    expect(isPublicPath("/")).toBe(false);
  });

  it("bloque une page métier (recettes)", () => {
    expect(isPublicPath("/recettes")).toBe(false);
  });

  it("ne confond pas un préfixe partiel avec la route publique", () => {
    expect(isPublicPath("/connexion-autre-chose")).toBe(false);
  });
});
