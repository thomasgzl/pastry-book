-- Suppression definitive d'une matiere premiere canonique (page
-- /matieres-premieres/[matiere]) -- typiquement un doublon accidentel cree
-- separement d'une matiere deja existante (ex. "Coco" cree alors que
-- "Noix de coco" existait deja). Refuse tant que la matiere est utilisee
-- quelque part (recipe_key_ingredients, recipe_ingredients, ingredient_aliases,
-- ou comme parent d'une autre matiere canonique) -- jamais de perte de tag
-- silencieuse sur une recette. Acces restreint a service_role, meme patron
-- transactionnel que delete_recipe (20260821090000).

create function delete_canonical_ingredient(p_id uuid)
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

  if v_key_count > 0 or v_ingredient_count > 0 or v_alias_count > 0 or v_child_count > 0 then
    raise exception 'Matière première « % » utilisée (matières premières principales : %, lignes d''ingrédient : %, alias : %, sous-matières : %) — retirez-la de ces éléments avant de la supprimer.',
      v_name, v_key_count, v_ingredient_count, v_alias_count, v_child_count;
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

revoke all on function delete_canonical_ingredient(uuid) from public;
grant execute on function delete_canonical_ingredient(uuid) to service_role;
