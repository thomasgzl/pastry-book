-- Matières premières principales (tags de recherche gustatifs) d'une
-- recette : fruits, agrumes, chocolats, pralinés, cafés, vanilles, épices,
-- alcools, caramels, thés, herbes aromatiques... 3 à 6 par recette.
--
-- Distinct de `recipe_ingredients.canonical_ingredient_id`, qui référence
-- CHAQUE ligne d'ingrédient d'une préparation (farine, beurre, œufs compris)
-- et n'est donc pas exploitable comme tag de recherche gustatif. Cette table
-- est une sélection éditoriale/IA d'un sous-ensemble d'ingrédients canoniques
-- jugés caractéristiques de la recette, pas une déduction automatique depuis
-- `recipe_ingredients` (le nombre de tags par recette — 3 à 6 — est une
-- règle de contenu appliquée côté application/IA au moment de la
-- proposition, pas une contrainte SQL : une contrainte de comptage sur une
-- table de jonction se heurterait à des insertions faites une ligne à la
-- fois pendant l'import, hors du périmètre de cette migration).

create table recipe_key_ingredients (
  recipe_id uuid not null references recipes(id) on delete cascade,
  canonical_ingredient_id uuid not null references canonical_ingredients(id) on delete cascade,
  position integer not null default 0,
  primary key (recipe_id, canonical_ingredient_id)
);

-- Comptage de recettes par matière première / recherche par matière
-- première (répertoire des matières premières, filtre par tag).
create index recipe_key_ingredients_canonical_ingredient_id_idx
  on recipe_key_ingredients(canonical_ingredient_id);

-- ============================================================
-- Dédoublonnage sous concurrence des matières premières canoniques
--
-- La normalisation du texte (minuscule, sans accent, singulier/pluriel
-- simple) est déjà faite côté application, PAS ici : voir
-- `normalizeText` dans `src/lib/recipes/search.ts`, déjà réutilisée par
-- `src/lib/import/model.ts` (`slugify`) pour produire un slug stable à
-- partir d'un nom. Cette migration n'a donc besoin que de la garantie
-- d'unicité déjà posée sur `canonical_ingredients.slug` (contrainte
-- `unique` existante, `20260814090000_schema.sql`) — pas d'une nouvelle
-- fonction de normalisation SQL en double.
--
-- Le risque réel est la concurrence : deux imports simultanés proposant la
-- même nouvelle matière première (même slug dérivé) ne doivent jamais créer
-- deux lignes `canonical_ingredients` distinctes pour le même concept. Un
-- aller-retour applicatif « SELECT si existe sinon INSERT » laisse une
-- fenêtre de compétition entre les deux requêtes. On ferme cette fenêtre
-- avec `insert ... on conflict (slug) do update ... returning id` : la
-- contrainte unique sur `slug` fait que Postgres sérialise les deux
-- insertions concurrentes au niveau de l'index — la seconde attend puis
-- prend la branche `do update`, les deux appels retournent le même id.
-- `do update` (plutôt que `do nothing`) est nécessaire pour que `returning`
-- fonctionne dans les deux cas (branche insert ET branche conflit).
create function find_or_create_canonical_ingredient(p_name text, p_slug text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'name manquant pour find_or_create_canonical_ingredient' using errcode = '22023';
  end if;
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'slug manquant pour find_or_create_canonical_ingredient' using errcode = '22023';
  end if;

  insert into canonical_ingredients (name, slug)
  values (btrim(p_name), btrim(p_slug))
  on conflict (slug) do update set name = canonical_ingredients.name
  returning id into v_id;

  return v_id;
end;
$$;

-- Pas de restriction service_role ici (contrairement à `save_import_recipe`) :
-- cette fonction ne fait qu'envelopper atomiquement une écriture que
-- `authenticated` peut déjà faire directement sur `canonical_ingredients`
-- (RLS `using (true) with check (true)`, `20260814090100_rls_policies.sql`).
-- Elle ne contourne aucune politique d'accès, elle ferme seulement une
-- fenêtre de concurrence applicative.
revoke all on function find_or_create_canonical_ingredient(text, text) from public;
grant execute on function find_or_create_canonical_ingredient(text, text) to authenticated;

-- RLS : même politique que les autres tables de jonction recette
-- (`recipe_ingredients`, `recipe_specificities`, `recipe_allergens`...),
-- cf. `20260814090100_rls_policies.sql` — accès complet pour `authenticated`
-- uniquement, jamais `anon`. `auto_expose_new_tables` étant désactivé, le
-- GRANT explicite est requis en plus de la policy.
alter table recipe_key_ingredients enable row level security;

create policy recipe_key_ingredients_authenticated_full_access
  on recipe_key_ingredients
  for all
  to authenticated
  using (true)
  with check (true);

grant select, insert, update, delete on recipe_key_ingredients to authenticated;
