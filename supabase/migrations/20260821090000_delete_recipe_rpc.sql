-- Suppression définitive d'une recette (page /recettes/[slug]/modifier) :
-- fonction Postgres pour la suppression atomique de la recette et de tout ce
-- qui lui appartient, même patron transactionnel que `save_import_recipe`/
-- `update_recipe` (voir leurs en-têtes, 20260815110000/20260819100000) —
-- accès restreint à `service_role` uniquement, jamais authenticated/anon en
-- direct.
--
-- Les cascades déjà posées par 20260814090000_schema.sql et
-- 20260819110000_recipe_key_ingredients.sql couvrent déjà recipe_sections,
-- recipe_ingredients (via recipe_sections), recipe_specificities,
-- recipe_allergens, recipe_key_ingredients : la seule table métier SANS
-- contrainte de clé étrangère vers recipes est `visual_assets` (sujet
-- polymorphe subject_type/subject_id) — ses lignes pour cette recette sont
-- donc supprimées explicitement ici. `import_items.recipe_id` passe à NULL
-- (on delete set null déjà posé) : la trace d'import n'est jamais supprimée
-- par cette fonction (CLAUDE.md : ne jamais supprimer une donnée d'import
-- qui ne serait pas exclusivement rattachée à cette recette).
--
-- Les chemins Storage à nettoyer (visuels + document source) sont capturés
-- AVANT la suppression et retournés à l'appelant : le nettoyage Storage réel
-- se fait côté application (src/lib/import/store.ts), après le commit de
-- cette transaction — jamais avant, pour ne jamais supprimer un fichier tant
-- que la recette n'est pas réellement effacée en base (CLAUDE.md, ordre
-- imposé « ne pas casser une recette si la suppression échoue »).
--
-- Fichier source original jamais rendu à l'appelant si un AUTRE
-- enregistrement `recipes` pointe encore vers le même
-- `original_document_url` (fichier partagé, ne doit jamais être supprimé).

create function delete_recipe(p_recipe_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_source_id uuid;
  v_source_category_id uuid;
  v_original_document_url text;
  v_shared_document boolean;
  v_visual_urls text[];
begin
  select source_id, source_category_id, original_document_url
  into v_source_id, v_source_category_id, v_original_document_url
  from recipes
  where id = p_recipe_id;

  if not found then
    raise exception 'Recette % introuvable — aucune suppression effectuée.', p_recipe_id using errcode = 'P0002';
  end if;

  select coalesce(array_agg(image_url), '{}')
  into v_visual_urls
  from visual_assets
  where subject_type = 'recipe' and subject_id = p_recipe_id;

  delete from visual_assets
  where subject_type = 'recipe' and subject_id = p_recipe_id;

  if v_original_document_url is not null then
    select exists (
      select 1 from recipes
      where original_document_url = v_original_document_url and id <> p_recipe_id
    ) into v_shared_document;
    if v_shared_document then
      v_original_document_url := null;
    end if;
  end if;

  delete from recipes where id = p_recipe_id;

  return jsonb_build_object(
    'source_id', v_source_id,
    'source_category_id', v_source_category_id,
    'original_document_url', v_original_document_url,
    'visual_urls', to_jsonb(v_visual_urls)
  );
end;
$$;

revoke all on function delete_recipe(uuid) from public;
grant execute on function delete_recipe(uuid) to service_role;
