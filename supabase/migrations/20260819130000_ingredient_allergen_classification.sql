-- Classification allergène tri-état des matières premières canoniques.
-- Prépare la validation déterministe (sans appel IA) de cohérence entre
-- les spécificités d'une recette (Gluten free, Sans lactose, Sans fruits à
-- coque) et ses ingrédients — logique de matching à implémenter par
-- ai-import-agent, hors périmètre de cette migration.
--
-- IMPORTANT : ces 3 colonnes sont LA source de vérité par matière première
-- canonique. Le futur code applicatif ne doit pas disperser des recherches
-- par mots-clés (ex. `name.includes('lait')`) dans plusieurs composants —
-- toute logique de détection allergène doit lire ces colonnes.
--
-- Héritage par les alias : ingredient_aliases n'a pas de colonnes de
-- classification propres. Un alias hérite toujours de la classification de
-- son canonical_ingredient_id via la relation existante
-- (ingredient_aliases.canonical_ingredient_id -> canonical_ingredients.id) :
-- aucune duplication de colonnes n'est nécessaire, un simple jointure suffit
-- (ex. `select ci.contains_gluten from ingredient_aliases ia
--        join canonical_ingredients ci on ci.id = ia.canonical_ingredient_id`).

create type tristate as enum ('true', 'false', 'unknown');

alter table canonical_ingredients
  add column contains_gluten tristate not null default 'unknown',
  add column contains_lactose tristate not null default 'unknown',
  add column contains_tree_nuts tristate not null default 'unknown';
