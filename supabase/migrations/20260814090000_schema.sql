-- B3 : schéma initial « Le Grand Livre de Pâtisserie ».
-- Source de vérité : docs/04-DATA_MODEL.md et src/lib/domain/schemas.ts (tâche B2, ne pas contredire).
-- Convention : tables et colonnes en snake_case ; le mapping vers les contrats
-- camelCase de src/lib/domain/schemas.ts est à la charge de la couche d'accès
-- métier (hors périmètre de cette migration).
--
-- gen_random_uuid() est native depuis PostgreSQL 13 : aucune extension requise.

-- ============================================================
-- Types énumérés (miroir exact des enums Zod de schemas.ts)
-- ============================================================

create type verification_status as enum ('confirmed', 'proposed', 'needs_review');
create type import_status as enum ('draft', 'needs_review', 'validated');
create type specificity_status as enum ('confirmed', 'proposed', 'rejected');
create type specificity_source as enum ('manual', 'rule', 'ai');
create type visual_asset_status as enum ('draft', 'approved', 'rejected');
create type alias_status as enum ('confirmed', 'proposed');
create type job_status as enum ('pending', 'processing', 'needs_review', 'done', 'error');
create type visual_subject_type as enum ('ingredient', 'recipe', 'source', 'source_category');

-- ============================================================
-- Fonctions utilitaires
-- ============================================================

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- sources
-- Une formation (ex. CAP Pâtissier) est une source comme une entreprise.
-- ============================================================

create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique,
  description text,
  illustration_url text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- source_categories
-- Catégories locales à une source (invariant : jamais partagées entre sources).
-- ============================================================

create table source_categories (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete restrict,
  name text not null check (btrim(name) <> ''),
  slug text not null,
  position integer not null default 0,
  unique (source_id, slug)
);

create index source_categories_source_id_idx on source_categories(source_id);

-- ============================================================
-- canonical_ingredients / ingredient_aliases
-- L'ingrédient canonique sert la recherche sans jamais remplacer le texte
-- d'origine stocké sur recipe_ingredients.original_name.
-- ============================================================

create table canonical_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique,
  parent_id uuid references canonical_ingredients(id) on delete set null,
  check (parent_id is null or parent_id <> id)
);

create table ingredient_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_ingredient_id uuid not null references canonical_ingredients(id) on delete cascade,
  alias text not null check (btrim(alias) <> ''),
  normalized_alias text not null check (btrim(normalized_alias) <> ''),
  status alias_status not null default 'proposed',
  unique (canonical_ingredient_id, normalized_alias)
);

create index ingredient_aliases_canonical_ingredient_id_idx on ingredient_aliases(canonical_ingredient_id);
create index ingredient_aliases_normalized_alias_idx on ingredient_aliases(normalized_alias);

-- ============================================================
-- allergens / specificities (référentiels)
-- ============================================================

create table allergens (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique
);

create table specificities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique
);

create table ingredient_allergens (
  canonical_ingredient_id uuid not null references canonical_ingredients(id) on delete cascade,
  allergen_id uuid not null references allergens(id) on delete cascade,
  status verification_status not null default 'needs_review',
  primary key (canonical_ingredient_id, allergen_id)
);

create index ingredient_allergens_allergen_id_idx on ingredient_allergens(allergen_id);

-- ============================================================
-- recipes
-- Invariant : une source_category_id référencée doit appartenir à la même
-- source_id que la recette (contrôlé par trigger, un CHECK ne peut pas
-- référencer une autre table en PostgreSQL).
-- ============================================================

create table recipes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references sources(id) on delete restrict,
  source_category_id uuid references source_categories(id) on delete set null,
  title text not null check (btrim(title) <> ''),
  slug text not null,
  additional_information text,
  original_document_url text,
  photo_url text,
  illustration_url text,
  import_status import_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, slug)
);

create index recipes_source_id_idx on recipes(source_id);
create index recipes_source_category_id_idx on recipes(source_category_id);

create trigger recipes_set_updated_at
before update on recipes
for each row
execute function set_updated_at();

create function check_recipe_category_belongs_to_source()
returns trigger
language plpgsql
as $$
begin
  if new.source_category_id is not null and not exists (
    select 1 from source_categories sc
    where sc.id = new.source_category_id and sc.source_id = new.source_id
  ) then
    raise exception 'source_category_id % n''appartient pas à source_id %',
      new.source_category_id, new.source_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recipes_category_source_consistency
before insert or update of source_id, source_category_id on recipes
for each row
execute function check_recipe_category_belongs_to_source();

-- ============================================================
-- recipe_sections
-- Une préparation appartient à une seule recette (invariant : pas de table
-- de préparations globales dans le MVP).
-- ============================================================

create table recipe_sections (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name text,
  position integer not null default 0,
  original_text text
);

create index recipe_sections_recipe_id_idx on recipe_sections(recipe_id);

-- ============================================================
-- recipe_ingredients
-- Invariant : quantité négative interdite. Le coefficient (affichage
-- uniquement) n'est jamais stocké ici ni ailleurs sur la recette source.
-- ============================================================

create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_section_id uuid not null references recipe_sections(id) on delete cascade,
  original_name text not null check (btrim(original_name) <> ''),
  canonical_ingredient_id uuid references canonical_ingredients(id) on delete set null,
  original_quantity_text text,
  quantity_decimal numeric check (quantity_decimal is null or quantity_decimal >= 0),
  unit text,
  position integer not null default 0,
  verification_status verification_status not null default 'needs_review',
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index recipe_ingredients_recipe_section_id_idx on recipe_ingredients(recipe_section_id);
create index recipe_ingredients_canonical_ingredient_id_idx on recipe_ingredients(canonical_ingredient_id);

-- ============================================================
-- recipe_specificities / recipe_allergens
-- Jonctions recette <-> référentiel, avec état de vérification.
-- Aucune trace ni contamination croisée n'est déduite automatiquement ici :
-- la seule contrainte de structure porte sur les statuts autorisés.
-- ============================================================

create table recipe_specificities (
  recipe_id uuid not null references recipes(id) on delete cascade,
  specificity_id uuid not null references specificities(id) on delete cascade,
  status specificity_status not null default 'proposed',
  reason text,
  source specificity_source not null default 'rule',
  primary key (recipe_id, specificity_id)
);

create index recipe_specificities_specificity_id_idx on recipe_specificities(specificity_id);

create table recipe_allergens (
  recipe_id uuid not null references recipes(id) on delete cascade,
  allergen_id uuid not null references allergens(id) on delete cascade,
  status verification_status not null default 'needs_review',
  primary key (recipe_id, allergen_id)
);

create index recipe_allergens_allergen_id_idx on recipe_allergens(allergen_id);

-- ============================================================
-- import_batches / import_items
-- Le document original (source_file_url) n'est jamais remplacé par le JSON
-- extrait : raw_extraction et proposed_recipe sont des colonnes dérivées
-- distinctes, purement additives.
-- ============================================================

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  status job_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table import_items (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references import_batches(id) on delete cascade,
  source_file_url text not null,
  status job_status not null default 'pending',
  raw_extraction jsonb,
  proposed_recipe jsonb,
  errors text[] not null default '{}',
  recipe_id uuid references recipes(id) on delete set null
);

create index import_items_import_batch_id_idx on import_items(import_batch_id);
create index import_items_recipe_id_idx on import_items(recipe_id);

-- ============================================================
-- visual_assets
-- Bibliothèque unifiée des visuels IA (matière première, recette, source,
-- catégorie). Invariant : un seul visuel approuvé peut être isPrimary par
-- objet (subject_type, subject_id).
-- ============================================================

create table visual_assets (
  id uuid primary key default gen_random_uuid(),
  subject_type visual_subject_type not null,
  subject_id uuid not null,
  status visual_asset_status not null default 'draft',
  is_primary boolean not null default false,
  image_url text not null,
  source_photo_url text,
  prompt text not null check (btrim(prompt) <> ''),
  preset_version text not null check (btrim(preset_version) <> ''),
  created_at timestamptz not null default now(),
  check (not is_primary or status = 'approved')
);

create index visual_assets_subject_idx on visual_assets(subject_type, subject_id);

create unique index visual_assets_one_primary_per_subject
  on visual_assets(subject_type, subject_id)
  where is_primary;
