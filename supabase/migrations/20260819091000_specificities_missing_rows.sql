-- Correctif : `seed.sql` (Vegan, Sans gluten, Sans lactose) n'a jamais été
-- appliqué en production — seules les migrations le sont (`db push`), pas le
-- seed (chargé uniquement par `supabase db reset`/`db start` en local). La
-- migration précédente (20260819090000) ne faisait donc qu'un UPDATE sans
-- effet sur une ligne `sans-gluten` inexistante. Complète les trois lignes
-- manquantes, sans rien supprimer ni dupliquer.

insert into specificities (name, slug) values
  ('Gluten free', 'sans-gluten'),
  ('Vegan', 'vegan'),
  ('Sans lactose', 'sans-lactose')
on conflict (slug) do update set name = excluded.name;
