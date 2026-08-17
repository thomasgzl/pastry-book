#!/usr/bin/env node
/**
 * Lie les illustrations locales (`public/visuals/company/*.png`) aux
 * entreprises/sources existantes par correspondance de slug — même
 * mécanisme que `link-local-ingredient-images.mjs`. Idempotent (vérifie le
 * visuel principal existant avant d'écrire) et n'appelle jamais l'API
 * OpenAI. Contrairement au script ingrédients, ne crée jamais de source :
 * une entreprise sans correspondance en base est seulement signalée
 * (l'entreprise est un objet métier réel, pas déductible d'un nom de
 * fichier).
 *
 * Usage : node scripts/link-local-company-images.mjs
 * Lit .env.local pour les identifiants Supabase (clé de service).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Doit rester identique à `src/lib/visuals/companyIllustrations.ts` (script
// Node ne peut pas importer ce module TypeScript directement).
const COMPANY_ILLUSTRATION_BY_SLUG = {
  "institut-culinaire-de-france": "/visuals/company/01-institut-culinaire-de-france.png",
  "peter-coffee-shop": "/visuals/company/02-peter-coffee-shop.png",
  "le-7-cite-du-vin": "/visuals/company/03-le-7-cite-du-vin.png",
  hennessy: "/visuals/company/04-chateau-de-bagnolet-hennessy.png",
  "eden-rock": "/visuals/company/05-eden-rock.png",
  "auberge-du-pere-bise": "/visuals/company/06-auberge-du-pere-bise.png",
};

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const PROMPT_LOCAL = "Illustration fournie manuellement (fichier local public/visuals/company, aucune génération IA).";
const PRESET_VERSION_LOCAL = "local-manual-v1";

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.log("Aucun Supabase réel configuré (.env.local incomplet) — rien à lier.");
    return;
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: sources, error: sourcesError } = await supabase.from("sources").select("id, name, slug");
  if (sourcesError) throw new Error(`Lecture sources impossible : ${sourcesError.message}`);

  const bySlug = new Map(sources.map((s) => [s.slug, s]));
  const linked = [];
  const skippedAlreadyIllustrated = [];
  const noMatch = [];

  for (const [slug, imagePath] of Object.entries(COMPANY_ILLUSTRATION_BY_SLUG)) {
    const source = bySlug.get(slug);
    if (!source) {
      noMatch.push(slug);
      continue;
    }

    const { data: primary, error: primaryError } = await supabase
      .from("visual_assets")
      .select("id, image_url")
      .eq("subject_type", "source")
      .eq("subject_id", source.id)
      .eq("is_primary", true)
      .maybeSingle();
    if (primaryError) throw new Error(`Lecture des visuels de « ${source.name} » impossible : ${primaryError.message}`);

    if (primary) {
      skippedAlreadyIllustrated.push({ name: source.name, existing: primary.image_url });
      continue;
    }

    const { error: insertError } = await supabase.from("visual_assets").insert({
      subject_type: "source",
      subject_id: source.id,
      status: "approved",
      is_primary: true,
      image_url: imagePath,
      source_photo_url: null,
      prompt: PROMPT_LOCAL,
      preset_version: PRESET_VERSION_LOCAL,
    });
    if (insertError) throw new Error(`Association de l'image à « ${source.name} » impossible : ${insertError.message}`);
    linked.push({ name: source.name, image: imagePath });
  }

  console.log("--- Entreprises associées à une image ---");
  linked.forEach((l) => console.log(`- ${l.name} -> ${l.image}`));
  if (linked.length === 0) console.log("(aucune)");

  console.log("\n--- Déjà illustrées, non modifiées (priorité à l'image déjà associée) ---");
  skippedAlreadyIllustrated.forEach((s) => console.log(`- ${s.name} (${s.existing})`));
  if (skippedAlreadyIllustrated.length === 0) console.log("(aucune)");

  console.log("\n--- Slugs du catalogue sans entreprise correspondante en base ---");
  noMatch.forEach((slug) => console.log(`- ${slug}`));
  if (noMatch.length === 0) console.log("(aucun)");

  console.log("\nAucun appel OpenAI effectué.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
