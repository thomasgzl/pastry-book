-- Garantit l'existence de la source « Personnel » (slug `personnel`) en
-- production, au même niveau que les autres entreprises/sources — jamais un
-- doublon si elle a déjà été créée (seed.sql, import manuel antérieur…) :
-- `on conflict (slug)` s'appuie sur la contrainte `sources.slug` unique
-- (voir 20260814090000_schema.sql).

insert into sources (name, slug, description)
values ('Personnel', 'personnel', null)
on conflict (slug) do nothing;
