import { beforeEach, describe, expect, it } from "vitest";
import { ok, err } from "@/lib/domain/errors";
import { approveVisualAsset, createDraftVisualAsset, seedVisualAssetsStore } from "./storage";
import { getAllVisualSubjects } from "./subjects";
import {
  MAX_QUEUE_BATCH_SIZE,
  QueueBatchSizeError,
  getMissingVisualSubjects,
  runVisualGenerationQueue,
  type QueueTarget,
} from "./queue";

beforeEach(() => {
  seedVisualAssetsStore([]);
});

describe("getMissingVisualSubjects (K8) — croise getAllVisualSubjects et le visuel principal approuvé", () => {
  it("liste tous les sujets quand aucun visuel n'existe", async () => {
    const all = await getAllVisualSubjects();
    const missing = await getMissingVisualSubjects();
    expect(missing).toHaveLength(all.length);
  });

  it("exclut un sujet dès qu'il a un visuel principal approuvé", async () => {
    const [subject] = await getAllVisualSubjects();
    const draft = await createDraftVisualAsset({
      subjectType: subject.type,
      subjectId: subject.id,
      imageUrl: "data:image/svg+xml;base64,AAAA",
      sourcePhotoUrl: null,
      prompt: "prompt de test",
      presetVersion: "v1",
    });
    await approveVisualAsset(draft.id); // premier approuvé du sujet -> devient principal automatiquement

    const missing = await getMissingVisualSubjects();
    expect(missing.find((entry) => entry.type === subject.type && entry.id === subject.id)).toBeUndefined();
  });

  it("un brouillon seul (aucun approuvé) ne retire jamais le sujet de la file", async () => {
    const [subject] = await getAllVisualSubjects();
    await createDraftVisualAsset({
      subjectType: subject.type,
      subjectId: subject.id,
      imageUrl: "data:image/svg+xml;base64,AAAA",
      sourcePhotoUrl: null,
      prompt: "prompt de test",
      presetVersion: "v1",
    });

    const missing = await getMissingVisualSubjects();
    expect(missing.find((entry) => entry.type === subject.type && entry.id === subject.id)).toBeDefined();
  });

  it("un deuxième visuel approuvé (non principal, un principal existe déjà) laisse le sujet hors de la file", async () => {
    const [subject] = await getAllVisualSubjects();
    const first = await createDraftVisualAsset({
      subjectType: subject.type,
      subjectId: subject.id,
      imageUrl: "data:image/svg+xml;base64,AAAA",
      sourcePhotoUrl: null,
      prompt: "prompt 1",
      presetVersion: "v1",
    });
    await approveVisualAsset(first.id); // premier approuvé -> devient principal automatiquement

    const second = await createDraftVisualAsset({
      subjectType: subject.type,
      subjectId: subject.id,
      imageUrl: "data:image/svg+xml;base64,BBBB",
      sourcePhotoUrl: null,
      prompt: "prompt 2",
      presetVersion: "v1",
    });
    const approvedSecond = await approveVisualAsset(second.id); // approuvé mais reste non principal
    expect(approvedSecond.isPrimary).toBe(false);

    const missing = await getMissingVisualSubjects();
    expect(missing.find((entry) => entry.type === subject.type && entry.id === subject.id)).toBeUndefined();
  });
});

describe("runVisualGenerationQueue (K8) — moteur séquentiel générique", () => {
  function target(id: string): QueueTarget {
    return { type: "ingredient", id, label: `Sujet ${id}` };
  }

  it("appelle generate() dans l'ordre, un sujet à la fois", async () => {
    const calls: string[] = [];
    const outcomes = await runVisualGenerationQueue([target("a"), target("b"), target("c")], {
      isAlreadyDone: async () => false,
      generate: async (t) => {
        calls.push(t.id);
        return ok(undefined);
      },
    });
    expect(calls).toEqual(["a", "b", "c"]);
    expect(outcomes.map((o) => o.status)).toEqual(["ok", "ok", "ok"]);
  });

  it("arrête au premier échec : les sujets suivants ne sont jamais tentés, aucun retry", async () => {
    const calls: string[] = [];
    const outcomes = await runVisualGenerationQueue([target("a"), target("b"), target("c")], {
      isAlreadyDone: async () => false,
      generate: async (t) => {
        calls.push(t.id);
        if (t.id === "b") return err("unknown", "échec simulé");
        return ok(undefined);
      },
    });
    expect(calls).toEqual(["a", "b"]); // "c" jamais appelé
    expect(outcomes.map((o) => o.status)).toEqual(["ok", "error", "not_attempted"]);
    expect(calls.filter((id) => id === "b")).toHaveLength(1); // aucune relance automatique
  });

  it("un sujet déjà pourvu est ignoré (idempotence) sans appeler generate()", async () => {
    const calls: string[] = [];
    const outcomes = await runVisualGenerationQueue([target("a"), target("b")], {
      isAlreadyDone: async (t) => t.id === "a",
      generate: async (t) => {
        calls.push(t.id);
        return ok(undefined);
      },
    });
    expect(calls).toEqual(["b"]);
    expect(outcomes).toEqual([
      { type: "ingredient", id: "a", status: "skipped", message: expect.any(String) },
      { type: "ingredient", id: "b", status: "ok" },
    ]);
  });

  it("refuse un lot supérieur à la taille maximale autorisée", async () => {
    const targets = Array.from({ length: MAX_QUEUE_BATCH_SIZE + 1 }, (_, i) => target(String(i)));
    await expect(
      runVisualGenerationQueue(targets, { isAlreadyDone: async () => false, generate: async () => ok(undefined) }),
    ).rejects.toThrow(QueueBatchSizeError);
  });

  it("journalise chaque entrée sans contenu sensible (type + id + statut uniquement)", async () => {
    const entries: unknown[] = [];
    await runVisualGenerationQueue([target("a")], {
      isAlreadyDone: async () => false,
      generate: async () => ok(undefined),
      onEntry: (entry) => entries.push(entry),
    });
    expect(entries).toEqual([{ type: "ingredient", id: "a", status: "ok", at: expect.any(String) }]);
  });
});
