-- B4 : politiques d'accès privé.
-- Application privée mono-tenant (pas de propriété par ligne/utilisateur dans
-- docs/04-DATA_MODEL.md) : toute table métier est lisible/écrivable
-- uniquement par un utilisateur authentifié Supabase (rôle `authenticated`),
-- jamais par le rôle anonyme. Le rôle `service_role` (serveur uniquement,
-- clé jamais exposée au navigateur) ignore RLS par défaut côté Supabase et
-- reste utilisé pour les écritures privilégiées de l'import.
--
-- Depuis la config Supabase actuelle (`auto_expose_new_tables` absent =
-- désactivé), une table nouvellement créée n'est accessible par aucun rôle
-- Data API tant qu'un GRANT explicite n'est pas posé : RLS seule ne suffit
-- pas. On accorde donc explicitement à `authenticated` (jamais à `anon`).

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'sources',
    'source_categories',
    'canonical_ingredients',
    'ingredient_aliases',
    'allergens',
    'specificities',
    'ingredient_allergens',
    'recipes',
    'recipe_sections',
    'recipe_ingredients',
    'recipe_specificities',
    'recipe_allergens',
    'import_batches',
    'import_items',
    'visual_assets'
  ]
  loop
    execute format('alter table %I enable row level security', table_name);
    execute format(
      'create policy %I on %I for all to authenticated using (true) with check (true)',
      table_name || '_authenticated_full_access',
      table_name
    );
    execute format(
      'grant select, insert, update, delete on %I to authenticated',
      table_name
    );
  end loop;
end;
$$;
