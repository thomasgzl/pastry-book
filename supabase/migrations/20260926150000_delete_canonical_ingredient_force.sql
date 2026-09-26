-- Ajoute un mode « forcer » a delete_canonical_ingredient (20260919140000) :
-- couvre le cas doublon (ex. "Reine des pre" / "Reine des pres") ou le seul
-- blocage vient d'un alias ou d'une sous-matiere -- jamais d'une recette.
-- p_force=true supprime les alias et detache les sous-matieres (parent_id
-- mis a null, elles deviennent independantes) avant de supprimer. Le blocage
-- par usage reel dans une recette (recipe_key_ingredients, recipe_ingredients)
-- reste strict et non forcable : jamais de perte de tag silencieuse sur une
-- recette (CLAUDE.md), la personne doit d'abord retirer la matiere de ces
-- recettes.

drop function if exists delete_canonical_ingredient(uuid);

create or replace function delete_canonical_ingredient(p_id uuid, p_force boolean default false)
returns jsonb
language plpgsql
as $$
declare
  v_name text;
  v_key_count integer;
  v_ingredient_count integer;
  v_alias_count integer;
  v_child_count integer;
  v_visual_urls text[];
begin
  select name into v_name from canonical_ingredients where id = p_id;

  if not found then
    raise exception 'Matière première % introuvable — aucune suppression effectuée.', p_id using errcode = 'P0002';
  end if;

  select count(*) into v_key_count from recipe_key_ingredients where canonical_ingredient_id = p_id;
  select count(*) into v_ingredient_count from recipe_ingredients where canonical_ingredient_id = p_id;
  select count(*) into v_alias_count from ingredient_aliases where canonical_ingredient_id = p_id;
  select count(*) into v_child_count from canonical_ingredients where parent_id = p_id;

  if v_key_count > 0 or v_ingredient_count > 0 then
    raise exception 'Matière première « % » utilisée par des recettes (matières premières principales : %, lignes d''ingrédient : %) — retirez-la de ces recettes avant de la supprimer.',
      v_name, v_key_count, v_ingredient_count;
  end if;

  if not p_force and (v_alias_count > 0 or v_child_count > 0) then
    raise exception 'Matière première « % » utilisée (alias : %, sous-matières : %) — utilisez « forcer » pour supprimer malgré tout (les alias seront supprimés, les sous-matières deviendront indépendantes), ou retirez-les manuellement.',
      v_name, v_alias_count, v_child_count;
  end if;

  if p_force then
    update canonical_ingredients set parent_id = null where parent_id = p_id;
    delete from ingredient_aliases where canonical_ingredient_id = p_id;
  end if;

  select coalesce(array_agg(image_url), '{}')
  into v_visual_urls
  from visual_assets
  where subject_type = 'ingredient' and subject_id = p_id;

  delete from visual_assets where subject_type = 'ingredient' and subject_id = p_id;
  delete from canonical_ingredients where id = p_id;

  return jsonb_build_object('name', v_name, 'visual_urls', to_jsonb(v_visual_urls));
end;
$$;

revoke all on function delete_canonical_ingredient(uuid, boolean) from public;
grant execute on function delete_canonical_ingredient(uuid, boolean) to service_role;
