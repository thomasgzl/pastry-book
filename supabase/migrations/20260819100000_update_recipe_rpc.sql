-- Modification manuelle d'une recette déjà enregistrée : fonction Postgres
-- pour la mise à jour atomique (recette + préparations + ingrédients +
-- spécificités), même patron transactionnel que `save_import_recipe`
-- (20260815110000_save_import_recipe_rpc.sql) — voir son en-tête pour le
-- raisonnement complet (une fonction PL/pgSQL s'exécute dans une seule
-- transaction implicite, contrairement à plusieurs appels REST successifs).
--
-- Champs volontairement JAMAIS touchés par cette fonction (préservés tels
-- quels) : slug (des liens/favoris existants pointent vers l'URL actuelle,
-- une modification de titre ne doit pas la casser), photo_url,
-- illustration_url, original_document_url (l'illustration/le document
-- source ne sont jamais régénérés ni remplacés par une modification
-- manuelle), import_status, created_at, recipe_allergens (allergènes hors
-- périmètre de cette modification, voir src/lib/recipes/editDraft.ts).
--
-- Préparations/ingrédients/spécificités : remplacés entièrement
-- (delete + insert dans la même transaction) plutôt qu'un diff champ à
-- champ par identifiant — aucune autre table du schéma ne référence
-- recipe_sections.id ni recipe_ingredients.id (vérifié dans
-- 20260814090000_schema.sql), un remplacement complet reste donc sûr et
-- bien plus simple.
-- ponytail: pas de diff par identifiant conservé ; à durcir si une future
-- table venait référencer ces identifiants directement.
--
-- Accès restreint à `service_role` uniquement, même convention que
-- `save_import_recipe` (jamais `authenticated` ni `anon` directement).

create function update_recipe(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_recipe_id uuid := (payload->>'recipeId')::uuid;
  v_recipe recipes%rowtype;
  v_section jsonb;
  v_ingredient jsonb;
  v_specificity jsonb;
  v_section_id uuid;
  v_section_index int := 0;
begin
  if v_recipe_id is null then
    raise exception 'recipeId manquant dans le payload de mise à jour de recette' using errcode = '22023';
  end if;

  update recipes set
    source_id = (payload->>'sourceId')::uuid,
    source_category_id = nullif(payload->>'sourceCategoryId', '')::uuid,
    title = payload->>'title',
    additional_information = payload->>'additionalInformation'
  where id = v_recipe_id
  returning * into v_recipe;

  if not found then
    raise exception 'Recette % introuvable — aucune mise à jour effectuée.', v_recipe_id using errcode = 'P0002';
  end if;

  delete from recipe_sections where recipe_id = v_recipe_id;

  for v_section in select * from jsonb_array_elements(payload->'sections')
  loop
    insert into recipe_sections (recipe_id, name, position, original_text)
    values (v_recipe_id, v_section->>'name', v_section_index, v_section->>'originalText')
    returning id into v_section_id;

    for v_ingredient in select * from jsonb_array_elements(v_section->'ingredients')
    loop
      insert into recipe_ingredients (
        recipe_section_id, original_name, canonical_ingredient_id,
        original_quantity_text, quantity_decimal, unit, position, verification_status
      ) values (
        v_section_id,
        v_ingredient->>'originalName',
        nullif(v_ingredient->>'canonicalIngredientId', '')::uuid,
        v_ingredient->>'originalQuantityText',
        nullif(v_ingredient->>'quantityDecimal', '')::numeric,
        v_ingredient->>'unit',
        coalesce((v_ingredient->>'position')::int, 0),
        (v_ingredient->>'verificationStatus')::verification_status
      );
    end loop;

    v_section_index := v_section_index + 1;
  end loop;

  delete from recipe_specificities where recipe_id = v_recipe_id;

  for v_specificity in select * from jsonb_array_elements(coalesce(payload->'specificities', '[]'::jsonb))
  loop
    insert into recipe_specificities (recipe_id, specificity_id, status, reason, source)
    values (
      v_recipe_id,
      (v_specificity->>'specificityId')::uuid,
      (v_specificity->>'status')::specificity_status,
      v_specificity->>'reason',
      (v_specificity->>'source')::specificity_source
    );
  end loop;

  return to_jsonb(v_recipe);
end;
$$;

revoke all on function update_recipe(jsonb) from public;
grant execute on function update_recipe(jsonb) to service_role;
