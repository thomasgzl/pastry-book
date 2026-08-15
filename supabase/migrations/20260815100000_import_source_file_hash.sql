-- K-S1 : colonne de hash du fichier source, nécessaire à la détection de
-- doublons par fichier identique (K3-DATA/K4 : « même titre+entreprise, même
-- titre autre entreprise, hash fichier identique, préparation homonyme »).
-- Additive uniquement : nouvelle colonne nullable, aucune donnée existante
-- modifiée ni perdue.
--
-- Convention attendue côté application (K3-DATA) : SHA-256 hex minuscule
-- (`crypto.createHash('sha256').update(buffer).digest('hex')`), calculé sur
-- les octets du fichier tel qu'uploadé dans le bucket `recipe-sources`,
-- jamais sur le texte extrait. Nullable tant qu'aucun fichier réel n'est
-- encore associé à la ligne (saisie manuelle sans fichier, ou item pas
-- encore traité) — même logique que `source_file_url` (migration
-- 20260814090200).

alter table import_items
  add column source_file_hash text;

alter table import_items
  add constraint import_items_source_file_hash_format
  check (source_file_hash is null or source_file_hash ~ '^[0-9a-f]{64}$');

-- Index partiel (ignore les null) : permet une recherche rapide de doublon
-- par hash avant tout nouvel import, sans pénaliser les lignes sans fichier.
create index import_items_source_file_hash_idx
  on import_items(source_file_hash)
  where source_file_hash is not null;
