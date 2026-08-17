import { describe, expect, it } from "vitest";
import { getVisualsProvider } from "./registry";
import { demoImageProvider } from "./demo-provider";

describe("getVisualsProvider (E1)", () => {
  it("retourne le fournisseur de démonstration — aucun adaptateur réel branché dans ce lot", () => {
    expect(getVisualsProvider()).toBe(demoImageProvider);
  });
});
