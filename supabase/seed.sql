-- ============================================================
-- JEU DE DONNÉES DE DÉMONSTRATION — « Le Grand Livre de Pâtisserie »
-- ============================================================
--
-- Tout le contenu ci-dessous est FICTIF (titres, quantités, procédés,
-- photos). Aucune recette réelle n'est incluse. But : peupler une base
-- locale/de recette pour développer et tester l'interface sans dépendre
-- d'un import réel (CLAUDE.md, « Utiliser des données de démonstration
-- clairement identifiées comme fictives »).
--
-- Convention Supabase CLI : ce fichier est chargé automatiquement après les
-- migrations par `supabase db reset` / `supabase start`. Il est volontairement
-- séparé de `supabase/migrations/` (schéma) — voir docs/04-DATA_MODEL.md et
-- supabase/migrations/20260814090000_schema.sql (source de vérité du schéma,
-- non modifié ici).
--
-- Pour vider uniquement ce jeu de démonstration (à décommenter et exécuter
-- volontairement — jamais lancé automatiquement par ce fichier) :
--
-- truncate table
--   import_items, import_batches, visual_assets,
--   recipe_allergens, recipe_specificities, recipe_ingredients,
--   recipe_sections, recipes, source_categories, sources,
--   ingredient_aliases, canonical_ingredients, allergens, specificities
-- cascade;
--
-- (Pas de `restart identity` : toutes les clés primaires sont des UUID
-- générés par `gen_random_uuid()`, pas des séquences.)

-- ============================================================
-- sources
-- Hennessy et CAP Pâtissier sont les sources réelles du produit ; Personnel
-- désigne les recettes ajoutées librement par l'utilisateur ; Boulangerie
-- Démo (démo) est une entreprise entièrement inventée pour prouver qu'une
-- quatrième source fonctionne comme les autres.
-- ============================================================

insert into sources (name, slug, description) values
  ('Hennessy', 'hennessy', null),
  ('CAP Pâtissier', 'cap-patissier', null),
  ('Personnel', 'personnel', null),
  ('Boulangerie Démo', 'boulangerie-demo', 'Entreprise fictive utilisée uniquement pour les données de démonstration.');

-- ============================================================
-- source_categories — propres à Hennessy uniquement (CLAUDE.md, principe 6).
-- Ne pas créer ces catégories pour les autres sources.
-- ============================================================

insert into source_categories (source_id, name, slug, position) values
  ((select id from sources where slug = 'hennessy'), 'Desserts à l''assiette', 'desserts-a-lassiette', 0),
  ((select id from sources where slug = 'hennessy'), 'Desserts boutique', 'desserts-boutique', 1),
  ((select id from sources where slug = 'hennessy'), 'Recettes de base', 'recettes-de-base', 2),
  ((select id from sources where slug = 'hennessy'), 'Petit-déjeuner', 'petit-dejeuner', 3);

-- ============================================================
-- canonical_ingredients
-- ============================================================

insert into canonical_ingredients (name, slug) values
  ('Citron', 'citron'),
  ('Pistache', 'pistache'),
  ('Chocolat', 'chocolat'),
  ('Vanille', 'vanille'),
  ('Noisette', 'noisette'),
  ('Poire', 'poire');

-- ============================================================
-- ingredient_aliases — tous reliés au canonique Citron. Ces libellés exacts
-- sont réutilisés plus bas comme original_name de recipe_ingredients pour
-- prouver que le texte source reste intact une fois lié au canonique.
-- ============================================================

insert into ingredient_aliases (canonical_ingredient_id, alias, normalized_alias, status) values
  ((select id from canonical_ingredients where slug = 'citron'), 'jus de citron', 'jus de citron', 'confirmed'),
  ((select id from canonical_ingredients where slug = 'citron'), 'zeste de citron', 'zeste de citron', 'confirmed'),
  ((select id from canonical_ingredients where slug = 'citron'), 'purée de citron', 'puree de citron', 'proposed');

-- ============================================================
-- allergens / specificities (référentiels)
-- ============================================================

insert into allergens (name, slug) values
  ('Gluten', 'gluten'),
  ('Œufs', 'oeufs'),
  ('Lait', 'lait'),
  ('Fruits à coque', 'fruits-a-coque');

insert into specificities (name, slug) values
  ('Vegan', 'vegan'),
  ('Sans gluten', 'sans-gluten'),
  ('Sans lactose', 'sans-lactose');

-- ============================================================
-- recipes
-- photo_url : URLs `https://picsum.photos/...` clairement démo (le contrat
-- Zod recipeSchema.photoUrl exige une URL absolue — pas de chemin relatif
-- `/demo/...`, écarté pour rester valide au regard de src/lib/domain/schemas.ts).
-- ============================================================

insert into recipes (source_id, source_category_id, title, slug, additional_information, photo_url, import_status) values
  -- CAP Pâtissier : uniquement des ingrédients, aucune information complémentaire,
  -- aucune photo (CLAUDE.md, principe 2 : « aucune section vide »).
  (
    (select id from sources where slug = 'cap-patissier'), null,
    'Pâte sablée (CAP)', 'pate-sablee-cap',
    null, null, 'validated'
  ),
  -- Membre du couple « même nom, sources différentes » (préparations non globalisées).
  (
    (select id from sources where slug = 'cap-patissier'), null,
    'Crème pâtissière (CAP)', 'creme-patissiere-cap',
    null, null, 'validated'
  ),
  -- Hennessy détaillée : additional_information renseigné + photo démo.
  (
    (select id from sources where slug = 'hennessy'),
    (select id from source_categories where slug = 'desserts-boutique' and source_id = (select id from sources where slug = 'hennessy')),
    'Tarte au citron (Hennessy)', 'tarte-au-citron-hennessy',
    'Cuisson à blanc 15 min à 170°C avant garnissage. Dresser les zestes juste avant le service (démo).',
    'https://picsum.photos/seed/tarte-citron-demo/800/600', 'validated'
  ),
  -- Autre membre du couple « même nom, sources différentes ».
  (
    (select id from sources where slug = 'hennessy'),
    (select id from source_categories where slug = 'recettes-de-base' and source_id = (select id from sources where slug = 'hennessy')),
    'Crème pâtissière (Hennessy)', 'creme-patissiere-hennessy',
    null, null, 'validated'
  ),
  (
    (select id from sources where slug = 'personnel'), null,
    'Financiers noisette (démo perso)', 'financiers-noisette-demo',
    null, null, 'draft'
  ),
  (
    (select id from sources where slug = 'boulangerie-demo'), null,
    'Pain aux noisettes (démo, Boulangerie Démo)', 'pain-aux-noisettes-demo',
    null, 'https://picsum.photos/seed/pain-noisettes-demo/800/600', 'needs_review'
  );

-- ============================================================
-- recipe_sections
-- Sections identifiées par UUID fixe (pas de clé naturelle unique sur cette
-- table) pour pouvoir y rattacher recipe_ingredients ci-dessous.
-- ============================================================

insert into recipe_sections (id, recipe_id, name, position, original_text) values
  ('a0000000-0000-4000-8000-000000000001', (select id from recipes where slug = 'pate-sablee-cap'), null, 0,
    'Farine T55 200 g, Beurre 100 g, Sucre glace 62,5 g, Œuf 1, Sel QS'),
  ('a0000000-0000-4000-8000-000000000002', (select id from recipes where slug = 'creme-patissiere-cap'), null, 0,
    'Lait 500 g, Jaunes d''œufs 4, Sucre 100 g, Poudre à crème 50 g, Vanille QS'),
  ('a0000000-0000-4000-8000-000000000003', (select id from recipes where slug = 'tarte-au-citron-hennessy'), 'Pâte sablée', 0,
    'Farine T55 250 g, Beurre (quantité illisible sur le document scanné), Zeste de citron QS'),
  ('a0000000-0000-4000-8000-000000000004', (select id from recipes where slug = 'tarte-au-citron-hennessy'), 'Crème citron', 1,
    'Jus de citron 125 ml, Purée de citron 1/2, Sucre 90 g, Œufs 3'),
  ('a0000000-0000-4000-8000-000000000005', (select id from recipes where slug = 'creme-patissiere-hennessy'), 'Crème pâtissière', 0,
    'Lait entier 500 ml, Jaunes d''œufs 6, Sucre semoule 110 g, Poudre à crème 45 g, Gousse de vanille 1'),
  ('a0000000-0000-4000-8000-000000000006', (select id from recipes where slug = 'financiers-noisette-demo'), null, 0,
    'Poudre de noisette 100 g, Sucre glace 150 g, Farine T55 40 g, Blancs d''œufs 120 g, Beurre noisette 110 g'),
  ('a0000000-0000-4000-8000-000000000007', (select id from recipes where slug = 'pain-aux-noisettes-demo'), null, 0,
    'Farine de blé T65 500 g, Eau 320 g, Levure fraîche 10 g, Sel 10 g, Noisettes concassées 80 g');

-- ============================================================
-- recipe_ingredients
-- Couvre les 4 cas de quantité exigés : entière (200), décimale (62,5),
-- QS (original_quantity_text = 'QS', quantity_decimal null) et absente/à
-- vérifier (original_quantity_text null, verification_status needs_review).
-- ============================================================

insert into recipe_ingredients (recipe_section_id, original_name, canonical_ingredient_id, original_quantity_text, quantity_decimal, unit, position, verification_status) values
  -- Pâte sablée (CAP)
  ('a0000000-0000-4000-8000-000000000001', 'Farine T55', null, '200', 200, 'g', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000001', 'Beurre', null, '100', 100, 'g', 1, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000001', 'Sucre glace', null, '62,5', 62.5, 'g', 2, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000001', 'Œuf', null, '1', 1, 'pièce', 3, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000001', 'Sel', null, 'QS', null, null, 4, 'proposed'),

  -- Crème pâtissière (CAP)
  ('a0000000-0000-4000-8000-000000000002', 'Lait', null, '500', 500, 'g', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000002', 'Jaunes d''œufs', null, '4', 4, 'pièce', 1, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000002', 'Sucre', null, '100', 100, 'g', 2, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000002', 'Poudre à crème', null, '50', 50, 'g', 3, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000002', 'Vanille', (select id from canonical_ingredients where slug = 'vanille'), 'QS', null, null, 4, 'proposed'),

  -- Tarte au citron (Hennessy) — Pâte sablée
  ('a0000000-0000-4000-8000-000000000003', 'Farine T55', null, '250', 250, 'g', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000003', 'Beurre', null, null, null, null, 1, 'needs_review'),
  ('a0000000-0000-4000-8000-000000000003', 'zeste de citron', (select id from canonical_ingredients where slug = 'citron'), 'QS', null, null, 2, 'proposed'),

  -- Tarte au citron (Hennessy) — Crème citron
  ('a0000000-0000-4000-8000-000000000004', 'jus de citron', (select id from canonical_ingredients where slug = 'citron'), '125', 125, 'ml', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000004', 'purée de citron', (select id from canonical_ingredients where slug = 'citron'), '1/2', null, null, 1, 'needs_review'),
  ('a0000000-0000-4000-8000-000000000004', 'Sucre', null, '90', 90, 'g', 2, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000004', 'Œufs', null, '3', 3, 'pièce', 3, 'confirmed'),

  -- Crème pâtissière (Hennessy)
  ('a0000000-0000-4000-8000-000000000005', 'Lait entier', null, '500', 500, 'ml', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'Jaunes d''œufs', null, '6', 6, 'pièce', 1, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'Sucre semoule', null, '110', 110, 'g', 2, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'Poudre à crème', null, '45', 45, 'g', 3, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000005', 'Gousse de vanille', (select id from canonical_ingredients where slug = 'vanille'), '1', 1, 'pièce', 4, 'confirmed'),

  -- Financiers noisette (démo perso)
  ('a0000000-0000-4000-8000-000000000006', 'Poudre de noisette', (select id from canonical_ingredients where slug = 'noisette'), '100', 100, 'g', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000006', 'Sucre glace', null, '150', 150, 'g', 1, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000006', 'Farine T55', null, '40', 40, 'g', 2, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000006', 'Blancs d''œufs', null, '120', 120, 'g', 3, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000006', 'Beurre noisette', null, '110', 110, 'g', 4, 'confirmed'),

  -- Pain aux noisettes (démo, Boulangerie Démo)
  ('a0000000-0000-4000-8000-000000000007', 'Farine de blé T65', null, '500', 500, 'g', 0, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000007', 'Eau', null, '320', 320, 'g', 1, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000007', 'Levure fraîche', null, '10', 10, 'g', 2, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000007', 'Sel', null, '10', 10, 'g', 3, 'confirmed'),
  ('a0000000-0000-4000-8000-000000000007', 'Noisettes concassées', (select id from canonical_ingredients where slug = 'noisette'), '80', 80, 'g', 4, 'confirmed');

-- ============================================================
-- recipe_allergens — statuts distincts 'confirmed' / 'proposed' / 'needs_review'
-- (CLAUDE.md, principe 9 : jamais de trace ou contamination croisée déduite ;
-- on affiche ici seulement ce qui est explicitement confirmé ou proposé).
-- ============================================================

insert into recipe_allergens (recipe_id, allergen_id, status) values
  ((select id from recipes where slug = 'tarte-au-citron-hennessy'), (select id from allergens where slug = 'gluten'), 'confirmed'),
  ((select id from recipes where slug = 'tarte-au-citron-hennessy'), (select id from allergens where slug = 'oeufs'), 'confirmed'),
  ((select id from recipes where slug = 'tarte-au-citron-hennessy'), (select id from allergens where slug = 'lait'), 'proposed'),
  ((select id from recipes where slug = 'creme-patissiere-hennessy'), (select id from allergens where slug = 'lait'), 'confirmed'),
  ((select id from recipes where slug = 'creme-patissiere-hennessy'), (select id from allergens where slug = 'oeufs'), 'confirmed'),
  ((select id from recipes where slug = 'creme-patissiere-hennessy'), (select id from allergens where slug = 'gluten'), 'needs_review'),
  ((select id from recipes where slug = 'financiers-noisette-demo'), (select id from allergens where slug = 'fruits-a-coque'), 'confirmed'),
  ((select id from recipes where slug = 'financiers-noisette-demo'), (select id from allergens where slug = 'oeufs'), 'confirmed'),
  ((select id from recipes where slug = 'financiers-noisette-demo'), (select id from allergens where slug = 'lait'), 'confirmed'),
  ((select id from recipes where slug = 'financiers-noisette-demo'), (select id from allergens where slug = 'gluten'), 'confirmed'),
  ((select id from recipes where slug = 'pain-aux-noisettes-demo'), (select id from allergens where slug = 'gluten'), 'confirmed'),
  ((select id from recipes where slug = 'pain-aux-noisettes-demo'), (select id from allergens where slug = 'fruits-a-coque'), 'confirmed');

-- ============================================================
-- recipe_specificities — un exemple 'confirmed' et un exemple 'proposed'
-- pour prouver que les deux états restent visuellement/structurellement
-- distincts.
-- ============================================================

insert into recipe_specificities (recipe_id, specificity_id, status, reason, source) values
  (
    (select id from recipes where slug = 'tarte-au-citron-hennessy'),
    (select id from specificities where slug = 'sans-lactose'),
    'proposed', 'Beurre présent mais quantité illisible dans la source : statut non confirmable automatiquement (démo, à vérifier).', 'ai'
  ),
  (
    (select id from recipes where slug = 'pain-aux-noisettes-demo'),
    (select id from specificities where slug = 'vegan'),
    'confirmed', 'Aucun ingrédient d''origine animale dans la liste (démo).', 'manual'
  );
