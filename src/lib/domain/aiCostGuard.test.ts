import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginAiRequest,
  completeAiRequest,
  getAiCallCount,
  resetAiCostGuardForTests,
} from "./aiCostGuard";

afterEach(() => {
  resetAiCostGuardForTests();
  vi.useRealTimers();
});

describe("beginAiRequest", () => {
  it("refuse une deuxième exécution avec le même id tant que la première n'est pas terminée", () => {
    const first = beginAiRequest("req-1", "extraction", { minDelayMs: 0 });
    expect(first.ok).toBe(true);

    const second = beginAiRequest("req-1", "extraction", { minDelayMs: 0 });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("conflict");
  });

  it("autorise à nouveau le même id une fois complété", () => {
    beginAiRequest("req-2", "extraction", { minDelayMs: 0 });
    completeAiRequest("req-2");

    const retry = beginAiRequest("req-2", "extraction", { minDelayMs: 0 });
    expect(retry.ok).toBe(true);
  });

  it("refuse un appel trop rapproché du même type d'opération", () => {
    beginAiRequest("req-3", "illustration-brouillon", { minDelayMs: 10_000 });

    const tooSoon = beginAiRequest("req-4", "illustration-brouillon", {
      minDelayMs: 10_000,
    });
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok) expect(tooSoon.error.code).toBe("conflict");
  });

  it("autorise un appel une fois le délai minimal écoulé", () => {
    vi.useFakeTimers();
    beginAiRequest("req-5", "illustration-finale", { minDelayMs: 5_000 });

    vi.advanceTimersByTime(5_001);

    const later = beginAiRequest("req-6", "illustration-finale", {
      minDelayMs: 5_000,
    });
    expect(later.ok).toBe(true);
  });

  it("expire le verrou d'idempotence après le TTL", () => {
    vi.useFakeTimers();
    beginAiRequest("req-7", "extraction", {
      minDelayMs: 0,
      idempotencyTtlMs: 1_000,
    });

    vi.advanceTimersByTime(1_001);

    const afterExpiry = beginAiRequest("req-7", "extraction", {
      minDelayMs: 0,
      idempotencyTtlMs: 1_000,
    });
    expect(afterExpiry.ok).toBe(true);
  });

  it("compte les appels par type sans stocker de contenu", () => {
    beginAiRequest("req-8", "extraction", { minDelayMs: 0 });
    beginAiRequest("req-9", "extraction", { minDelayMs: 0 });

    expect(getAiCallCount("extraction")).toBe(2);
    expect(getAiCallCount("illustration-finale")).toBe(0);
  });
});
