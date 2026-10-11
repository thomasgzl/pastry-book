-- Nettoyage automatique de fond des illustrations matieres premieres (K-BG).
-- Additif uniquement : la colonne image_url (original) n'est jamais modifiee
-- ni remplacee. background_removed_url pointe vers une cle R2 DISTINCTE
-- (suffixe -nobg.webp), ecrite par le script de lot ou par l'import
-- automatique (storeBytesAndCreateDraft, subject_type = 'ingredient'
-- uniquement). use_background_removed est un choix humain explicite fait
-- depuis /illustrations -- jamais vrai par defaut, jamais bascule en masse.

alter table visual_assets
  add column background_removed_url text null,
  add column use_background_removed boolean not null default false;
