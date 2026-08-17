#!/usr/bin/env node
/**
 * Lie les illustrations locales (`public/visuals/*.svg`) aux matières
 * premières canoniques : associe l'image à l'ingrédient existant s'il y a
 * une correspondance exacte de nom, crée l'ingrédient à partir du nom de
 * fichier sinon. Idempotent — relancer ne crée jamais de doublon (vérifie
 * l'existant avant chaque écriture) et n'appelle jamais l'API OpenAI (aucun
 * import du fournisseur d'images dans ce fichier).
 *
 * Usage : node scripts/link-local-ingredient-images.mjs
 * Lit .env.local pour les identifiants Supabase (clé de service, contourne
 * RLS — script d'administration, jamais exécuté côté navigateur).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VISUALS_DIR = path.join(ROOT, "public", "visuals");

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

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d+[-_]?/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromFilename(filename) {
  return filename
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d+[-_]?/, "")
    .toLowerCase()
    .trim();
}

function labelFromFilename(filename) {
  const base = normalize(filename);
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const PROMPT_LOCAL = "Illustration fournie manuellement (fichier local public/visuals, aucune génération IA).";
const PRESET_VERSION_LOCAL = "local-manual-v1";

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.log("Aucun Supabase réel configuré (.env.local incomplet) — rien à lier, script réservé à un environnement avec Supabase réel.");
    return;
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const files = readdirSync(VISUALS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".svg"))
    .map((entry) => entry.name)
    .sort();

  const [{ data: ingredients, error: ingredientsError }, { data: aliases, error: aliasesError }] = await Promise.all([
    supabase.from("canonical_ingredients").select("id, name, slug"),
    supabase.from("ingredient_aliases").select("canonical_ingredient_id, normalized_alias"),
  ]);
  if (ingredientsError) throw new Error(`Lecture canonical_ingredients impossible : ${ingredientsError.message}`);
  if (aliasesError) throw new Error(`Lecture ingredient_aliases impossible : ${aliasesError.message}`);

  console.log(`Inventaire : ${ingredients.length} matière(s) première(s) canonique(s) en base, ${files.length} image(s) locale(s) trouvée(s).`);

  const byNormalizedName = new Map(ingredients.map((i) => [normalize(i.name), i]));
  const byNormalizedSlug = new Map(ingredients.map((i) => [normalize(i.slug), i]));
  const byNormalizedAlias = new Map(aliases.map((a) => [normalize(a.normalized_alias), a.canonical_ingredient_id]));
  const idToIngredient = new Map(ingredients.map((i) => [i.id, i]));

  const linked = [];
  const created = [];
  const skippedAlreadyIllustrated = [];
  const ambiguous = [];

  for (const filename of files) {
    const norm = normalize(filename);
    const localPath = `/visuals/${filename}`;

    let ingredient = byNormalizedName.get(norm) ?? byNormalizedSlug.get(norm);
    if (!ingredient && byNormalizedAlias.has(norm)) {
      ingredient = idToIngredient.get(byNormalizedAlias.get(norm));
    }

    if (!ingredient) {
      // Correspondance approximative (pluriel évident) : jamais liée automatiquement, seulement signalée.
      const stripped = norm.endsWith("s") ? norm.slice(0, -1) : norm;
      const near = [...byNormalizedName.entries()].find(
        ([key]) => key !== norm && (key === stripped || key.endsWith("s") && key.slice(0, -1) === norm),
      );
      if (near) {
        ambiguous.push({ filename, candidate: near[1].name });
        continue;
      }
    }

    if (!ingredient) {
      const name = labelFromFilename(filename);
      const slug = slugFromFilename(filename);
      const { data: createdRow, error: createError } = await supabase
        .from("canonical_ingredients")
        .insert({ name, slug })
        .select("id, name, slug")
        .single();
      if (createError) throw new Error(`Création de « ${name} » impossible : ${createError.message}`);
      ingredient = createdRow;
      byNormalizedName.set(normalize(ingredient.name), ingredient);
      byNormalizedSlug.set(normalize(ingredient.slug), ingredient);
      idToIngredient.set(ingredient.id, ingredient);
      created.push(ingredient.name);
    }

    const { data: primary, error: primaryError } = await supabase
      .from("visual_assets")
      .select("id, image_url")
      .eq("subject_type", "ingredient")
      .eq("subject_id", ingredient.id)
      .eq("is_primary", true)
      .maybeSingle();
    if (primaryError) throw new Error(`Lecture des visuels de « ${ingredient.name} » impossible : ${primaryError.message}`);

    if (primary) {
      skippedAlreadyIllustrated.push({ name: ingredient.name, existing: primary.image_url });
      continue;
    }

    const { error: insertError } = await supabase.from("visual_assets").insert({
      subject_type: "ingredient",
      subject_id: ingredient.id,
      status: "approved",
      is_primary: true,
      image_url: localPath,
      source_photo_url: null,
      prompt: PROMPT_LOCAL,
      preset_version: PRESET_VERSION_LOCAL,
    });
    if (insertError) throw new Error(`Association de l'image à « ${ingredient.name} » impossible : ${insertError.message}`);
    linked.push({ name: ingredient.name, image: localPath });
  }

  console.log("\n--- Ingrédients associés à une image (déjà existants) ---");
  for (const item of linked.filter((l) => !created.includes(l.name))) console.log(`- ${item.name} -> ${item.image}`);
  if (!linked.some((l) => !created.includes(l.name))) console.log("(aucun)");

  console.log("\n--- Ingrédients créés ---");
  created.forEach((name) => console.log(`- ${name}`));
  if (created.length === 0) console.log("(aucun)");

  console.log("\n--- Déjà illustrés, non modifiés (priorité à l'image déjà associée) ---");
  skippedAlreadyIllustrated.forEach((s) => console.log(`- ${s.name} (${s.existing})`));
  if (skippedAlreadyIllustrated.length === 0) console.log("(aucun)");

  console.log("\n--- Fichiers ambigus, à vérifier manuellement ---");
  ambiguous.forEach((a) => console.log(`- ${a.filename} (proche de « ${a.candidate} », pas de correspondance exacte)`));
  if (ambiguous.length === 0) console.log("(aucun)");

  console.log("\nAucun appel OpenAI effectué (script sans dépendance au fournisseur d'images).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
