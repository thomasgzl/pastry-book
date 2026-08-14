-- I4 : buckets Storage privés pour les fichiers importés et les visuels IA.
-- `supabase/config.toml` ne déclare aucun bucket local (section commentée) :
-- la définition vit ici, en migration SQL, pour être appliquée de façon
-- identique en local et en distant par `supabase db push`.
--
-- Deux buckets, tous deux `public = false` (aucun fichier de ces bibliothèques
-- n'est accessible anonymement, CLAUDE.md « aucune clé secrète ni donnée
-- privée exposée sans authentification ») :
--
-- - recipe-sources : fichiers importés tels quels (image/scan/PDF/DOCX),
--   jamais remplacés par le JSON extrait (docs/04-DATA_MODEL.md, invariant
--   « document original jamais remplacé »). Limite 8 Mo, identique à
--   MAX_FILE_SIZE_BYTES dans src/lib/ai/import/openaiProvider.ts.
--   Convention de chemin (appliquée côté application, pas par une policy) :
--   `{importBatchId}/{uuid}.{ext}` — même identifiant que import_batches.id
--   utilisé par src/lib/import/store.ts, pour retrouver tous les fichiers
--   d'un même lot sans collision entre lots.
--
-- - visual-assets : illustrations IA (brouillon ou approuvées) et visuels
--   importés manuellement pour visual_assets.image_url. PNG/WebP uniquement
--   (gpt-image-2 renvoie du PNG en base64, voir src/lib/ai/visuals/openai-provider.ts).
--   Limite 10 Mo, large marge au-dessus d'une image générée typique.
--   Convention de chemin : `{subjectType}/{subjectId}/{uuid}.{ext}` — reprend
--   les colonnes déjà indexées ensemble (visual_assets_subject_idx), pour que
--   tous les visuels d'un même sujet vivent sous le même préfixe.
--
-- `on conflict do nothing` : migration rejouable sans erreur si le bucket
-- existe déjà (ex. créé manuellement avant cette migration).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-sources',
  'recipe-sources',
  false,
  8388608, -- 8 Mo, cf. MAX_FILE_SIZE_BYTES (src/lib/ai/import/openaiProvider.ts)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visual-assets',
  'visual-assets',
  false,
  10485760, -- 10 Mo, marge au-dessus d'une image gpt-image-2 typique
  array['image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ============================================================
-- Politiques d'accès (storage.objects)
-- Même conception que 20260814090100_rls_policies.sql : lecture/écriture
-- réservées à `authenticated` (jamais `anon`, jamais public). Le
-- `service_role` (serveur uniquement) contourne RLS par défaut côté
-- Supabase et reste utilisé pour les écritures privilégiées de l'import et
-- de la génération de visuels. Filtrage par `bucket_id` uniquement — comme
-- les tables métier (`using (true) with check (true)` par ailleurs), aucune
-- restriction supplémentaire par chemin/propriétaire : application privée
-- mono-tenant, pas de notion d'utilisateur propriétaire d'un fichier.
--
-- RLS est déjà activée sur `storage.objects` par Supabase par défaut ; on ne
-- fait ici qu'ajouter les policies propres à ces deux buckets.

create policy recipe_sources_objects_select_authenticated
on storage.objects for select
to authenticated
using (bucket_id = 'recipe-sources');

create policy recipe_sources_objects_insert_authenticated
on storage.objects for insert
to authenticated
with check (bucket_id = 'recipe-sources');

create policy recipe_sources_objects_update_authenticated
on storage.objects for update
to authenticated
using (bucket_id = 'recipe-sources')
with check (bucket_id = 'recipe-sources');

create policy recipe_sources_objects_delete_authenticated
on storage.objects for delete
to authenticated
using (bucket_id = 'recipe-sources');

create policy visual_assets_objects_select_authenticated
on storage.objects for select
to authenticated
using (bucket_id = 'visual-assets');

create policy visual_assets_objects_insert_authenticated
on storage.objects for insert
to authenticated
with check (bucket_id = 'visual-assets');

create policy visual_assets_objects_update_authenticated
on storage.objects for update
to authenticated
using (bucket_id = 'visual-assets')
with check (bucket_id = 'visual-assets');

create policy visual_assets_objects_delete_authenticated
on storage.objects for delete
to authenticated
using (bucket_id = 'visual-assets');
