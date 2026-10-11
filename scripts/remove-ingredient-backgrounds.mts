/**
 * Suppression de fond en lot (K-BG) — matières premières (`subject_type =
 * 'ingredient'`) UNIQUEMENT, jamais recette/entreprise/catégorie.
 *
 * CLI dédié (pas une route Vercel / Server Action), même raison que
 * `migrate-images-to-r2.mts` : peut tourner plusieurs minutes sur plusieurs
 * centaines d'images, aucune limite d'exécution serverless à respecter.
 * Réutilise les VRAIS modules applicatifs (`@/lib/r2`,
 * `@/lib/visuals/removeBackground`, `@/lib/supabase/admin`) via `tsx` +
 * import dynamique APRÈS chargement de `.env.local` (même contrainte que le
 * script de migration : les modules lisent `process.env` au chargement).
 *
 * Usage :
 *   npm run backgrounds:remove -- --dry-run
 *   npm run backgrounds:remove -- --limit=3
 *   npm run backgrounds:remove -- --names="Abricot,Açaï,Ail des ours"
 *   npm run backgrounds:remove            (lot complet — JAMAIS lancé seul sans confirmation explicite)
 *   npm run backgrounds:remove -- --auto-approve   (voir §auto-approve ci-dessous)
 *
 * Sécurité : ne modifie et ne supprime JAMAIS `image_url` (original). Écrit
 * uniquement `background_removed_url`, vers une clé R2 DISTINCTE
 * (suffixe `-nobg.webp`). Un échec sur une image n'interrompt jamais les
 * autres (`status: failed`, continue). Une image déjà traitée (clé encore
 * présente dans R2, vérifiée par `HEAD`, jamais en confiance aveugle sur le
 * manifest) est sautée — jamais retraitée sans raison. Seules les images
 * réellement stockées sur R2 (clé brute, ni `/visuals/...` statique, ni
 * `data:`) sont prises en charge. Jamais de credential loggé.
 *
 * --auto-approve (demandé explicitement, dérogation scope à CETTE commande
 * uniquement — le défaut du produit reste « jamais de bascule automatique
 * sans validation humaine », CLAUDE.md) : après un nettoyage réussi
 * (`status: "ok"`, jamais `needs_review`) d'un visuel dont le `status`
 * (brouillon/approuvé/rejeté) est déjà `approved`, active aussi
 * `use_background_removed` dans le MÊME update que `background_removed_url`.
 * N'approuve jamais un brouillon ni ne touche un rejeté — seul le choix
 * d'affichage d'un visuel déjà public change, jamais son statut
 * d'approbation. Réversible à tout moment depuis `/illustrations`.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = path.join(ROOT, "background-removal-manifest.json");

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
const { existsInR2, uploadToR2, getR2DownloadUrl } = await import("@/lib/r2");
const { removeIngredientBackground } = await import("@/lib/visuals/removeBackground");
const { VISUAL_ASSETS_BUCKET } = await import("@/lib/visuals/storage");
const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");

// ───────────────────────── CLI ─────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const AUTO_APPROVE = args.includes("--auto-approve");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : undefined;
const namesArg = args.find((a) => a.startsWith("--names="));
/** Filtre par nom canonique exact (test contrôlé initial, §9) — pas un remplacement de --limit, les deux peuvent se combiner. */
const NAMES = namesArg
  ? namesArg
      .slice("--names=".length)
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
  : undefined;
const CONCURRENCY = 4;

// ───────────────────────── Manifest (reprise après interruption) ─────────────────────────

type ManifestStatus = "ok" | "needs_review" | "failed" | "skipped_out_of_scope";

interface ManifestEntry {
  id: string;
  subjectId: string;
  name: string;
  backgroundRemovedUrl: string | null;
  status: ManifestStatus;
  reason: string | null;
}

function loadManifest(): Record<string, ManifestEntry> {
  if (!existsSync(MANIFEST_PATH)) return {};
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(manifest: Record<string, ManifestEntry>): void {
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

// ───────────────────────── Concurrence bornée ─────────────────────────
// Chaque ligne de la file est tirée par UN SEUL worker (`items[next++]` est la seule
// écriture de `next`, jamais concurrente) : deux workers ne traitent jamais la même image.

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

// ───────────────────────── Programme principal ─────────────────────────

interface VisualAssetRow {
  id: string;
  subject_id: string;
  image_url: string;
  background_removed_url: string | null;
  status: "draft" | "approved" | "rejected";
}

interface IngredientRow {
  id: string;
  name: string;
}

function isOutOfScope(url: string): boolean {
  // Asset public statique (`/visuals/...`) ou data URI : jamais réellement stocké sur R2,
  // hors périmètre de ce traitement (§8 — seules les images réellement sur R2 sont prises en charge).
  return url.startsWith("/") || url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://");
}

function cleanedKeyFor(originalKey: string): string {
  return originalKey.replace(/\.[a-zA-Z0-9]+$/, "-nobg.webp");
}

async function main(): Promise<void> {
  const supabase = createSupabaseAdminClient();

  console.log(
    `Mode : ${DRY_RUN ? "DRY-RUN (aucune écriture)" : "RÉEL"}` +
      `${LIMIT ? `, limite=${LIMIT}` : ""}${NAMES ? `, noms=[${NAMES.join(", ")}]` : ""}` +
      `${AUTO_APPROVE ? ", auto-approve=ON (visuels déjà approuvés uniquement)" : ""}`,
  );

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("canonical_ingredients")
    .select("id, name");
  if (ingredientsError) throw new Error(`Lecture canonical_ingredients impossible : ${ingredientsError.message}`);
  const nameById = new Map((ingredients as IngredientRow[]).map((row) => [row.id, row.name]));

  let query = supabase
    .from("visual_assets")
    .select("id, subject_id, image_url, background_removed_url, status")
    .eq("subject_type", "ingredient");
  if (NAMES) {
    const ids = (ingredients as IngredientRow[]).filter((row) => NAMES.includes(row.name)).map((row) => row.id);
    if (ids.length === 0) {
      console.log(`Aucun ingrédient canonique ne correspond à --names="${NAMES.join(",")}" — rien à faire.`);
      return;
    }
    query = query.in("subject_id", ids);
  }
  const { data: rows, error: rowsError } = await query;
  if (rowsError) throw new Error(`Lecture visual_assets impossible : ${rowsError.message}`);

  const manifest = loadManifest();

  let outOfScope = 0;
  let alreadyProcessed = 0;
  const candidates: VisualAssetRow[] = [];

  for (const row of rows as VisualAssetRow[]) {
    if (isOutOfScope(row.image_url)) {
      outOfScope++;
      continue;
    }
    if (row.background_removed_url) {
      const stillThere = await existsInR2(row.background_removed_url);
      if (stillThere) {
        alreadyProcessed++;
        continue;
      }
      console.warn(`[warn] ${row.id} a une background_removed_url mais absente de R2 — re-traité.`);
    }
    candidates.push(row);
  }

  console.log(`\nVisuels "ingredient" trouvés : ${(rows as VisualAssetRow[]).length}`);
  console.log(`Hors périmètre (asset public statique / data URI, jamais réellement sur R2) : ${outOfScope}`);
  console.log(`Déjà traités (background_removed_url vérifiée présente dans R2) : ${alreadyProcessed}`);
  console.log(`Candidats à traiter : ${candidates.length}`);

  const selected = LIMIT !== undefined ? candidates.slice(0, LIMIT) : candidates;

  if (DRY_RUN) {
    console.log(`\nDry-run : ${selected.length} image(s) seraient traitées cette fois. Aucune écriture.`);
    for (const row of selected) {
      console.log(`  - ${nameById.get(row.subject_id) ?? row.subject_id} (${row.image_url})`);
    }
    return;
  }

  console.log(`\n${selected.length} image(s) à traiter cette fois (concurrence=${CONCURRENCY}).\n`);

  let okCount = 0;
  let needsReviewCount = 0;
  let failedCount = 0;
  let activatedCount = 0;
  const needsReviewNames: string[] = [];

  await runWithConcurrency(selected, CONCURRENCY, async (row) => {
    const name = nameById.get(row.subject_id) ?? row.subject_id;
    const entry: ManifestEntry = { id: row.id, subjectId: row.subject_id, name, backgroundRemovedUrl: null, status: "failed", reason: null };

    try {
      // Même ambiguïté qu'`approvedVisual.ts`/`migrate-images-to-r2.mts` : un chemin brut peut
      // désigner un objet R2 (natif depuis la bascule K-R2) ou un reliquat Supabase Storage —
      // `existsInR2` tranche réellement (HEAD), jamais une confiance aveugle sur la forme du chemin.
      let bytes: Buffer;
      if (await existsInR2(row.image_url)) {
        const signedUrl = await getR2DownloadUrl(row.image_url);
        const response = await fetch(signedUrl);
        if (!response.ok) throw new Error(`téléchargement R2 impossible (HTTP ${response.status}).`);
        bytes = Buffer.from(await response.arrayBuffer());
      } else {
        const { data: imageData, error: downloadError } = await supabase.storage
          .from(VISUAL_ASSETS_BUCKET)
          .download(row.image_url);
        if (downloadError || !imageData) throw new Error(`téléchargement Supabase impossible : ${downloadError?.message ?? "réponse vide"}`);
        bytes = Buffer.from(await imageData.arrayBuffer());
      }

      const result = await removeIngredientBackground(bytes);
      if (result.status === "needs_review") {
        entry.status = "needs_review";
        entry.reason = result.reason;
        needsReviewCount++;
        needsReviewNames.push(`${name} (${row.id}) : ${result.reason}`);
        console.warn(`[needs_review] ${name} (${row.id}) : ${result.reason}`);
        return;
      }

      const cleanedKey = cleanedKeyFor(row.image_url);
      await uploadToR2(cleanedKey, result.buffer, "image/webp");

      const verified = await existsInR2(cleanedKey);
      if (!verified) throw new Error("vérification post-upload échouée : objet absent de R2 après l'écriture.");

      // --auto-approve : jamais sur un brouillon/rejeté (n'approuve rien, ne change aucun
      // statut) — seulement le choix d'affichage d'un visuel déjà approuvé.
      const shouldActivate = AUTO_APPROVE && row.status === "approved";
      const { error: updateError } = await supabase
        .from("visual_assets")
        .update({
          background_removed_url: cleanedKey,
          ...(shouldActivate ? { use_background_removed: true } : {}),
        })
        .eq("id", row.id);
      if (updateError) throw new Error(`mise à jour DB impossible après upload R2 réussi (objet R2 conservé, relançable) : ${updateError.message}`);

      entry.status = "ok";
      entry.backgroundRemovedUrl = cleanedKey;
      okCount++;
      if (shouldActivate) activatedCount++;
      console.log(`[ok] ${name} (${row.id}) → ${cleanedKey}${shouldActivate ? " (activée)" : ""}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      entry.status = "failed";
      entry.reason = message;
      failedCount++;
      console.error(`[fail] ${name} (${row.id}) : ${message}`);
    }

    manifest[row.id] = entry;
    saveManifest(manifest); // écrit après CHAQUE image — reprise possible si le run est interrompu
  });

  console.log(`\n── Résumé ──`);
  console.log(`Visuels "ingredient" trouvés : ${(rows as VisualAssetRow[]).length}`);
  console.log(`Déjà traités avant ce run (sautés) : ${alreadyProcessed}`);
  console.log(`Nouvellement nettoyés avec succès : ${okCount}`);
  console.log(`  dont versions activées (--auto-approve) : ${activatedCount}`);
  console.log(`Fond trop complexe, vérification manuelle requise (needs_review) : ${needsReviewCount}`);
  console.log(`Échecs : ${failedCount}`);
  console.log(`Hors périmètre (jamais sur R2) : ${outOfScope}`);
  if (needsReviewNames.length > 0) {
    console.log(`\nÀ vérifier manuellement (needs_review, jamais traité automatiquement) :`);
    for (const line of needsReviewNames) console.log(`  - ${line}`);
  }
  console.log(
    `\nAucun original modifié ni supprimé. Versions nettoyées écrites dans "background_removed_url" uniquement` +
      (AUTO_APPROVE
        ? " — activées (use_background_removed) seulement pour les visuels déjà approuvés, jamais pour needs_review/brouillon/rejeté."
        : " — jamais affichées publiquement sans validation humaine depuis /illustrations."),
  );
}

main().catch((cause) => {
  console.error("Échec du script de suppression de fond :", cause instanceof Error ? cause.message : cause);
  process.exitCode = 1;
});
