import { describe, expect, it } from "vitest";
import { bestVisualStatus } from "./status";

describe("bestVisualStatus", () => {
  it("renvoie 'missing' quand aucune variante n'existe", () => {
    expect(bestVisualStatus([])).toBe("missing");
  });

  it("privilégie 'approved' même en présence de brouillons/rejets", () => {
    expect(
      bestVisualStatus([{ status: "rejected" }, { status: "draft" }, { status: "approved" }]),
    ).toBe("approved");
  });

  it("renvoie 'draft' si aucune variante approuvée mais un brouillon existe", () => {
    expect(bestVisualStatus([{ status: "rejected" }, { status: "draft" }])).toBe("draft");
  });

  it("renvoie 'rejected' si toutes les variantes sont rejetées", () => {
    expect(bestVisualStatus([{ status: "rejected" }, { status: "rejected" }])).toBe("rejected");
  });
});
