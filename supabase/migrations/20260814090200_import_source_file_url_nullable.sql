-- I1 (correctif) : import_items.source_file_url doit accepter NULL.
-- Contrat gelé (src/lib/domain/schemas.ts, ~ligne 173) : `sourceFileUrl:
-- z.url().nullable().optional()`. La saisie manuelle sans fichier joint
-- (voir src/lib/import/store.ts, `saveImportRecipe`) enregistre `null` pour
-- ce champ — la contrainte NOT NULL héritée de 20260814090000_schema.sql
-- violerait ce cas au premier insert réel. Correctif additif uniquement :
-- aucune perte de donnée, aucune table recréée.

alter table import_items
  alter column source_file_url drop not null;
