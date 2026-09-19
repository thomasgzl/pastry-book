-- Réparation de dérive : 20260819130000_ingredient_allergen_classification.sql
-- est enregistrée comme appliquée dans l'historique des migrations distant
-- (`supabase migration list`), mais `canonical_ingredients` ne possède
-- réellement ni `contains_gluten`, ni `contains_lactose`, ni
-- `contains_tree_nuts` en base réelle (constaté par audit direct, 2026-09-19).
-- Origine exacte non déterminée (échec partiel silencieux ou historique
-- corrigé manuellement sans réexécution) — cette migration réapplique le
-- contenu de façon idempotente (`if not exists`) plutôt que de retoucher
-- l'historique, pour ne jamais dépendre d'une hypothèse non vérifiable sur
-- l'incident d'origine.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tristate') then
    create type tristate as enum ('true', 'false', 'unknown');
  end if;
end $$;

alter table canonical_ingredients
  add column if not exists contains_gluten tristate not null default 'unknown',
  add column if not exists contains_lactose tristate not null default 'unknown',
  add column if not exists contains_tree_nuts tristate not null default 'unknown';
