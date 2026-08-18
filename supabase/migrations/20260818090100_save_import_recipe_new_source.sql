-- Étend `save_import_recipe` (voir 20260815110000_save_import_recipe_rpc.sql)
-- pour permettre la création d'une nouvelle entreprise/source DANS LA MÊME
-- transaction que la recette importée : `payload.newSourceName` remplace
-- alors `payload.sourceId`. Si la transaction échoue pour n'importe quelle
-- raison (recette invalide, section/ingrédient incohérent…), la source
-- nouvellement insérée est annulée avec le reste — jamais d'entreprise vide
-- laissée en base après une annulation ou un échec (CLAUDE.md).
--
-- Réutilisation sans doublon : comparaison insensible à la casse sur `name`
-- avant toute insertion, même logique que `createLocalCategorySupabase`
-- (`src/lib/import/store.ts`). Le slug de base est calculé côté JS
-- (`slugify`, même fonction que pour les recettes/catégories) et transmis via
-- `payload.newSourceSlugBase` ; la collision de slug est résolue ici par
-- retry avec suffixe numérique, comme pour le slug de recette ci-dessous.

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
  v_section_id uuid;
  v_section_index int := 0;
  v_source_id uuid;
  v_new_source_name text := nullif(btrim(payload->>'newSourceName'), '');
  v_new_source_slug_base text := payload->>'newSourceSlugBase';
  v_new_source_slug text;
  v_source_suffix int := 1;
begin
  if v_draft_id is null or btrim(v_draft_id) = '' then
    raise exception 'draftId manquant dans le payload de sauvegarde import' using errcode = '22023';
  end if;
  if v_base_slug is null or btrim(v_base_slug) = '' then
    raise exception 'slugBase manquant dans le payload de sauvegarde import' using errcode = '22023';
  end if;

  -- Idempotence : ré-invoquer avec le même brouillon (double clic, nouvelle
  -- tentative après coupure réseau) ne crée jamais une seconde recette NI une
  -- seconde entreprise.
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

  -- Résolution de la source : entreprise existante (sourceId) OU nouvelle
  -- entreprise à créer maintenant (newSourceName), jamais les deux.
  if v_new_source_name is not null then
    select id into v_source_id from sources where lower(btrim(name)) = lower(v_new_source_name) limit 1;
    if not found then
      if v_new_source_slug_base is null or btrim(v_new_source_slug_base) = '' then
        raise exception 'newSourceSlugBase manquant pour la création d''une nouvelle entreprise' using errcode = '22023';
      end if;
      v_new_source_slug := v_new_source_slug_base;
      loop
        begin
          insert into sources (name, slug) values (v_new_source_name, v_new_source_slug)
          returning id into v_source_id;
          exit;
        exception when unique_violation then
          v_source_suffix := v_source_suffix + 1;
          v_new_source_slug := v_new_source_slug_base || '-' || v_source_suffix;
        end;
      end loop;
    end if;
  else
    v_source_id := (payload->>'sourceId')::uuid;
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
        v_source_id,
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
