/**
 * Migration des anciennes images Supabase Storage (bucket `visual-assets`)
 * vers Cloudflare R2, avec optimisation Sharp au passage (K-R2-migration).
 *
 * CLI dédié (pas une route Vercel / Server Action) : peut tourner plusieurs
 * minutes sur plusieurs centaines d'images, aucune limite d'exécution
 * serverless à respecter. Réutilise les VRAIS modules applicatifs
 * (`@/lib/r2`, `@/lib/visuals/optimizeImage`, `@/lib/visuals/storage`,
 * `@/lib/supabase/admin`) via `tsx` + import dynamique APRÈS chargement de
 * `.env.local` — un script Node ne charge pas `.env.local` automatiquement
 * comme le fait Next.js, et les modules `@/lib/r2` lisent `process.env` au
 * chargement du module (pas dans une fonction), donc les imports doivent
 * être dynamiques et arriver après le chargement de l'environnement.
 *
 * Usage :
 *   npm run migrate:images -- --dry-run
 *   npm run migrate:images -- --limit=3
 *   npm run migrate:images            (run complet — JAMAIS lancé seul sans confirmation explicite)
 *   npm run migrate:images -- --rollback   (prépare la restauration DB depuis le manifest, voir §12)
 *
 * Sécurité : ne supprime JAMAIS un objet Supabase Storage. Ne modifie une
 * référence DB qu'APRÈS confirmation réelle (HEAD) que l'objet existe dans
 * R2. Un échec sur une image n'interrompt jamais les autres (`status: failed`,
 * continue). Jamais de credential loggé (R2_SECRET_ACCESS_KEY, clés Supabase).
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = path.join(ROOT, "migration-images-manifest.json");

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!existsSync(envPath)) throw new Error(".env.local introuvable — requis pour les credentials Supabase/R2.");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in process.env)) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}
loadEnvLocal();

// Imports dynamiques — APRÈS chargement de l'environnement (voir en-tête).
const { existsInR2, uploadToR2 } = await import("@/lib/r2");
const { optimizeImageForStorage } = await import("@/lib/visuals/optimizeImage");
const { VISUAL_ASSETS_BUCKET } = await import("@/lib/visuals/storage");
const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");

// ───────────────────────── CLI ─────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ROLLBACK = args.includes("--rollback");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : undefined;
const CONCURRENCY = 4;

// ───────────────────────── Manifest ─────────────────────────

type ManifestStatus = "pending" | "migrated" | "skipped" | "failed" | "rolled_back";

interface ManifestEntry {
  id: string;
  subjectType: string;
  subjectId: string;
  /** Valeur brute originale de `image_url` — pour une data URI, c'est la data URI COMPLÈTE (seul moyen de rollback, voir §12). Jamais un secret, juste potentiellement volumineux : fichier local, gitignored. */
  oldReference: string;
  /** Chemin Supabase Storage réel, ou `null` si l'original était une data URI (aucun fichier Storage à l'origine). */
  oldStoragePath: string | null;
  newR2Path: string;
  status: ManifestStatus;
  originalBytes: number;
  optimizedBytes: number;
  error: string | null;
}

function loadManifest(): Record<string, ManifestEntry> {
  if (!existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(manifest: Record<string, ManifestEntry>): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

// ───────────────────────── Concurrence bornée ─────────────────────────

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  async function runner(): Promise<void> {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}

// ───────────────────────── Classification ─────────────────────────

interface VisualAssetRow {
  id: string;
  subject_type: string;
  subject_id: string;
  image_url: string;
}

function isDataUri(url: string): boolean {
  return url.startsWith("data:") && !url.startsWith("data:image/svg");
}
function isOutOfScope(url: string): boolean {
  // Asset public statique (`/visuals/...`, servi par Next) ou URL externe complète — jamais du Storage, hors périmètre migration.
  // SVG démo (`data:image/svg+xml`) exclu aussi : jamais accepté par le bucket avant la bascule R2 (storage.ts,
  // BUCKET_EXTENSION_BY_MIME), contenu gratuit/déterministe jamais destiné à un stockage réel — le rasteriser en
  // WebP via Sharp serait une dégradation sémantique, pas une optimisation (découvert pendant le test de 3 images).
  return url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image/svg");
}

/** Extension finale toujours `.webp` — conserve dossier/sujet/identifiant du chemin d'origine, voir §5. */
function newKeyForBarePath(oldPath: string): string {
  return oldPath.replace(/\.[a-zA-Z0-9]+$/, ".webp");
}

// ───────────────────────── Rollback (préparé, §12 — PAS exécuté automatiquement) ─────────────────────────

async function runRollback(supabase: ReturnType<typeof createSupabaseAdminClient>): Promise<void> {
  const manifest = loadManifest();
  const toRevert = Object.values(manifest).filter((e) => e.status === "migrated");
  console.log(`[rollback] ${toRevert.length} référence(s) migrée(s) à restaurer (R2 n'est jamais supprimé, seule la référence DB est remise à l'ancienne valeur).`);

  for (const entry of toRevert) {
    const { error } = await supabase.from("visual_assets").update({ image_url: entry.oldReference }).eq("id", entry.id);
    if (error) {
      console.error(`[rollback] échec restauration DB pour ${entry.id}: ${error.message}`);
      continue;
    }
    entry.status = "rolled_back";
    console.log(`[rollback] ${entry.id} restauré → ${entry.oldStoragePath ?? "(data URI restaurée)"}`);
  }
  saveManifest(manifest);
  console.log("[rollback] terminé. Les objets R2 déjà copiés n'ont pas été supprimés (relançable).");
}

// ───────────────────────── Programme principal ─────────────────────────

async function main(): Promise<void> {
  const supabase = createSupabaseAdminClient();

  if (ROLLBACK) {
    await runRollback(supabase);
    return;
  }

  console.log(`Mode : ${DRY_RUN ? "DRY-RUN (aucune écriture)" : "RÉEL"}${LIMIT ? `, limite=${LIMIT}` : ""}`);

  const { data: rows, error } = await supabase
    .from("visual_assets")
    .select("id, subject_type, subject_id, image_url");
  if (error) throw new Error(`Lecture visual_assets impossible : ${error.message}`);

  const manifest = loadManifest();

  let outOfScope = 0;
  let alreadyR2Native = 0;
  const candidates: { row: VisualAssetRow; kind: "barePath" | "dataUri" }[] = [];

  for (const row of rows as VisualAssetRow[]) {
    const url = row.image_url;
    if (isOutOfScope(url)) {
      outOfScope++;
      continue;
    }
    if (isDataUri(url)) {
      candidates.push({ row, kind: "dataUri" });
      continue;
    }
    // Chemin brut : legacy Supabase SEULEMENT si l'objet n'existe PAS déjà sous ce nom dans R2
    // (même règle que le resolver prod `existsInR2`, jamais de double-sens de vérité).
    const nativeInR2 = await existsInR2(url);
    if (nativeInR2) {
      alreadyR2Native++;
      continue;
    }
    candidates.push({ row, kind: "barePath" });
  }

  console.log(`\nRéférences totales : ${rows.length}`);
  console.log(`Hors périmètre (asset public statique / URL externe) : ${outOfScope}`);
  console.log(`Déjà natives R2 (image_url résout déjà dans R2) : ${alreadyR2Native}`);
  console.log(`Candidates à migrer (Supabase Storage + data URI) : ${candidates.length}`);
  console.log(`  dont data URI : ${candidates.filter((c) => c.kind === "dataUri").length}`);
  console.log(`  dont chemins Supabase Storage : ${candidates.filter((c) => c.kind === "barePath").length}`);

  // Fusion avec le manifest existant — une entrée déjà "migrated" est re-vérifiée (existsInR2), jamais reprocessée en confiance aveugle.
  let brokenCount = 0;
  let resumedSkipCount = 0;
  const toProcess: { row: VisualAssetRow; kind: "barePath" | "dataUri"; newKey: string }[] = [];

  for (const { row, kind } of candidates) {
    const existing = manifest[row.id];
    const newKey = kind === "barePath" ? newKeyForBarePath(row.image_url) : existing?.newR2Path;

    if (existing?.status === "migrated" && existing.newR2Path) {
      const stillThere = await existsInR2(existing.newR2Path);
      if (stillThere) {
        resumedSkipCount++;
        continue; // déjà fait, vérifié, rien à refaire
      }
      console.warn(`[warn] ${row.id} marqué migrated mais absent de R2 (${existing.newR2Path}) — re-traité.`);
    }

    toProcess.push({ row, kind, newKey: newKey ?? `${row.subject_type}/${row.subject_id}/pending.webp` });
  }

  if (DRY_RUN) {
    // Vérifie l'existence réelle côté Supabase (sans télécharger les octets) pour signaler les références cassées.
    for (const { row, kind } of toProcess) {
      if (kind === "dataUri") continue;
      const { error: signErr } = await supabase.storage.from(VISUAL_ASSETS_BUCKET).createSignedUrl(row.image_url, 10);
      if (signErr) brokenCount++;
    }
    console.log(`Références cassées (ni R2, ni Supabase Storage trouvé) : ${brokenCount}`);
    console.log(`Déjà migrées et vérifiées (manifest + R2) : ${resumedSkipCount}`);
    console.log(`\nDry-run terminé — aucun upload, aucune écriture DB, aucune suppression.`);

    // Le manifest est écrit en dry-run (statut "pending") : §4 s'appuie sur cette analyse, jamais une passe séparée qui la dupliquerait.
    for (const { row, kind, newKey } of toProcess) {
      if (!manifest[row.id] || manifest[row.id].status !== "migrated") {
        manifest[row.id] = {
          id: row.id,
          subjectType: row.subject_type,
          subjectId: row.subject_id,
          oldReference: row.image_url,
          oldStoragePath: kind === "barePath" ? row.image_url : null,
          newR2Path: newKey,
          status: "pending",
          originalBytes: 0,
          optimizedBytes: 0,
          error: null,
        };
      }
    }
    saveManifest(manifest);
    return;
  }

  // ───────── Migration réelle ─────────

  let selected = toProcess;
  if (LIMIT !== undefined) {
    // Répartition équilibrée par subjectType plutôt que les N premiers bruts — représentatif, voir §10.
    const bySubjectType = new Map<string, typeof toProcess>();
    for (const item of toProcess) {
      const list = bySubjectType.get(item.row.subject_type) ?? [];
      list.push(item);
      bySubjectType.set(item.row.subject_type, list);
    }
    const picked: typeof toProcess = [];
    const buckets = [...bySubjectType.values()];
    let i = 0;
    while (picked.length < LIMIT && buckets.some((b) => b.length > 0)) {
      const bucket = buckets[i % buckets.length];
      if (bucket.length > 0) picked.push(bucket.shift()!);
      i++;
    }
    selected = picked;
  }

  console.log(`\n${selected.length} image(s) à traiter cette fois (concurrence=${CONCURRENCY}).\n`);

  let migratedCount = 0;
  let failedCount = 0;
  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;

  await runWithConcurrency(selected, CONCURRENCY, async ({ row, kind, newKey }) => {
    const entry: ManifestEntry = manifest[row.id] ?? {
      id: row.id,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      oldReference: row.image_url,
      oldStoragePath: kind === "barePath" ? row.image_url : null,
      newR2Path: newKey,
      status: "pending",
      originalBytes: 0,
      optimizedBytes: 0,
      error: null,
    };

    try {
      // 1) DOWNLOAD / DECODE
      let bytes: Buffer;
      if (kind === "dataUri") {
        const match = /^data:[^;]+;base64,(.+)$/.exec(row.image_url);
        if (!match) throw new Error("data URI mal formée.");
        bytes = Buffer.from(match[1], "base64");
      } else {
        const { data, error: dlError } = await supabase.storage.from(VISUAL_ASSETS_BUCKET).download(row.image_url);
        if (dlError || !data) throw new Error(`téléchargement Supabase impossible : ${dlError?.message ?? "réponse vide"}`);
        bytes = Buffer.from(await data.arrayBuffer());
      }

      // 2) OPTIMIZE
      const optimized = await optimizeImageForStorage(bytes);
      const finalKey = kind === "barePath" ? newKeyForBarePath(row.image_url) : `${row.subject_type}/${row.subject_id}/${crypto.randomUUID()}.webp`;

      // 3) UPLOAD R2
      await uploadToR2(finalKey, optimized.buffer, optimized.contentType);

      // 4) VERIFY R2
      const verified = await existsInR2(finalKey);
      if (!verified) throw new Error("vérification post-upload échouée : objet absent de R2 après l'écriture.");

      // 5) UPDATE DB — seulement maintenant, jamais avant
      const { error: updateError } = await supabase.from("visual_assets").update({ image_url: finalKey }).eq("id", row.id);
      if (updateError) throw new Error(`mise à jour DB impossible après upload R2 réussi (objet R2 conservé, relançable) : ${updateError.message}`);

      // 6) MARK MANIFEST migrated
      entry.newR2Path = finalKey;
      entry.status = "migrated";
      entry.originalBytes = optimized.originalSize;
      entry.optimizedBytes = optimized.optimizedSize;
      entry.error = null;
      migratedCount++;
      totalOriginalBytes += optimized.originalSize;
      totalOptimizedBytes += optimized.optimizedSize;
      console.log(`[ok] ${row.subject_type}/${row.id} → ${finalKey} (${optimized.originalSize}o → ${optimized.optimizedSize}o)`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      entry.status = "failed";
      entry.error = message;
      failedCount++;
      console.error(`[fail] ${row.subject_type}/${row.id}: ${message}`);
    }

    manifest[row.id] = entry;
    saveManifest(manifest); // écrit après CHAQUE image — reprise possible si le run est interrompu
  });

  const pct = totalOriginalBytes > 0 ? (100 * (1 - totalOptimizedBytes / totalOriginalBytes)).toFixed(1) : "0.0";
  console.log(`\n── Statistiques ──`);
  console.log(`Images analysées : ${rows.length}`);
  console.log(`Déjà migrées (reprise) : ${resumedSkipCount}`);
  console.log(`Migrées (ce run) : ${migratedCount}`);
  console.log(`Échecs : ${failedCount}`);
  console.log(`Références cassées : ${brokenCount}`);
  console.log(`Stockage avant optimisation (ce run) : ${(totalOriginalBytes / 1024 / 1024).toFixed(2)} Mo`);
  console.log(`Stockage R2 après optimisation (ce run) : ${(totalOptimizedBytes / 1024 / 1024).toFixed(2)} Mo`);
  console.log(`Économie (ce run) : ${pct} %`);
}

main().catch((cause) => {
  console.error("Échec du script de migration :", cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
