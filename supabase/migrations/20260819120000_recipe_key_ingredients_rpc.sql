-- Étend `save_import_recipe` et `update_recipe` pour écrire
-- `recipe_key_ingredients` (matières premières principales / tags gustatifs,
-- 20260819110000_recipe_key_ingredients.sql) dans la MÊME transaction que
-- l'enregistrement/la modification de recette — sinon risque de mise à jour
-- partielle (CLAUDE.md, source intacte / pas de demi-recette). Migration
-- additive : `create or replace function` sur les deux fonctions existantes,
-- fichiers d'origine non modifiés.
--
-- Le payload `keyIngredients` ne contient que des `canonicalIngredientId`
-- déjà résolus : les tags "nouveaux" sont créés en amont, côté app, via
-- `find_or_create_canonical_ingredient` (20260819110000) AVANT l'appel à
-- ces RPC — aucune création de matière première ici, juste la liaison.
--
-- Signature attendue de chaque élément du tableau jsonb `keyIngredients` :
--   { "canonicalIngredientId": "<uuid>", "position": <int, optionnel, défaut 0> }
-- Absent ou tableau vide -> aucune ligne insérée, aucune erreur.

create or replace function save_import_recipe(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_draft_id text := payload->>'draftId';
  v_existing_item import_items%rowtype;
  v_existing_recipe recipes%rowtype;
  v_recipe recipes%rowtype;
  v_item import_items%rowtype;
  v_base_slug text := payload->>'slugBase';
  v_slug text := payload->>'slugBase';
  v_suffix int := 1;
  v_section jsonb;
  v_ingredient jsonb;
  v_allergen jsonb;
  v_specificity jsonb;
  v_key_ingredient jsonb;
  v_section_id uuid;
  v_section_index int := 0;
begin
  if v_draft_id is null or btrim(v_draft_id) = '' then
    raise exception 'draftId manquant dans le payload de sauvegarde import' using errcode = '22023';
  end if;
  if v_base_slug is null or btrim(v_base_slug) = '' then
    raise exception 'slugBase manquant dans le payload de sauvegarde import' using errcode = '22023';
  end if;

  -- Idempotence : ré-invoquer avec le même brouillon (double clic, nouvelle
  -- tentative après coupure réseau) ne crée jamais une seconde recette.
  select * into v_existing_item
  from import_items
  where proposed_recipe ->> 'id' = v_draft_id
    and status = 'done'
    and recipe_id is not null
  limit 1;

  if found then
    select * into v_existing_recipe from recipes where id = v_existing_item.recipe_id;
    if not found then
      raise exception 'Recette déjà enregistrée introuvable en base (incohérence de données) — jamais recréée automatiquement.';
    end if;
    return jsonb_build_object(
      'outcome', 'already_saved',
      'recipe', to_jsonb(v_existing_recipe),
      'item', to_jsonb(v_existing_item)
    );
  end if;

  -- Slug unique au sein de la source : retry sur collision plutôt qu'une
  -- vérification préalable séparée (fermerait, elle aussi, une fenêtre de
  -- compétition entre deux imports concurrents du même titre).
  loop
    begin
      insert into recipes (
        source_id, source_category_id, title, slug,
        additional_information, original_document_url, import_status
      ) values (
        (payload->>'sourceId')::uuid,
        nullif(payload->>'sourceCategoryId', '')::uuid,
        payload->>'title',
        v_slug,
        payload->>'additionalInformation',
        payload->>'sourceFileUrl',
        'validated'
      )
      returning * into v_recipe;
      exit;
    exception when unique_violation then
      v_suffix := v_suffix + 1;
      v_slug := v_base_slug || '-' || v_suffix;
    end;
  end loop;

  for v_section in select * from jsonb_array_elements(payload->'sections')
  loop
    insert into recipe_sections (recipe_id, name, position, original_text)
    values (v_recipe.id, v_section->>'name', v_section_index, v_section->>'originalText')
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

  for v_allergen in select * from jsonb_array_elements(coalesce(payload->'allergens', '[]'::jsonb))
  loop
    insert into recipe_allergens (recipe_id, allergen_id, status)
    values (
      v_recipe.id,
      (v_allergen->>'allergenId')::uuid,
      (v_allergen->>'status')::verification_status
    );
  end loop;

  for v_specificity in select * from jsonb_array_elements(coalesce(payload->'specificities', '[]'::jsonb))
  loop
    insert into recipe_specificities (recipe_id, specificity_id, status, reason, source)
    values (
      v_recipe.id,
      (v_specificity->>'specificityId')::uuid,
      (v_specificity->>'status')::specificity_status,
      v_specificity->>'reason',
      (v_specificity->>'source')::specificity_source
    );
  end loop;

  for v_key_ingredient in select * from jsonb_array_elements(coalesce(payload->'keyIngredients', '[]'::jsonb))
  loop
    insert into recipe_key_ingredients (recipe_id, canonical_ingredient_id, position)
    values (
      v_recipe.id,
      (v_key_ingredient->>'canonicalIngredientId')::uuid,
      coalesce((v_key_ingredient->>'position')::int, 0)
    );
  end loop;

  insert into import_items (
    import_batch_id, source_file_url, source_file_hash, status,
    raw_extraction, proposed_recipe, recipe_id
  ) values (
    (payload->>'batchId')::uuid,
    payload->>'sourceFileUrl',
    payload->>'sourceFileHash',
    'done',
    payload->'rawExtraction',
    payload->'proposedRecipe',
    v_recipe.id
  )
  returning * into v_item;

  update import_batches set status = 'done' where id = (payload->>'batchId')::uuid;

  return jsonb_build_object(
    'outcome', 'saved',
    'recipe', to_jsonb(v_recipe),
    'item', to_jsonb(v_item)
  );
end;
$$;

revoke all on function save_import_recipe(jsonb) from public;
grant execute on function save_import_recipe(jsonb) to service_role;

create or replace function update_recipe(payload jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_recipe_id uuid := (payload->>'recipeId')::uuid;
  v_recipe recipes%rowtype;
  v_section jsonb;
  v_ingredient jsonb;
  v_specificity jsonb;
  v_key_ingredient jsonb;
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

  delete from recipe_key_ingredients where recipe_id = v_recipe_id;

  for v_key_ingredient in select * from jsonb_array_elements(coalesce(payload->'keyIngredients', '[]'::jsonb))
  loop
    insert into recipe_key_ingredients (recipe_id, canonical_ingredient_id, position)
    values (
      v_recipe_id,
      (v_key_ingredient->>'canonicalIngredientId')::uuid,
      coalesce((v_key_ingredient->>'position')::int, 0)
    );
  end loop;

  return to_jsonb(v_recipe);
end;
$$;

revoke all on function update_recipe(jsonb) from public;
grant execute on function update_recipe(jsonb) to service_role;
