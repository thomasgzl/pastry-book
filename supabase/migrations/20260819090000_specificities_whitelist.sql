-- Simplification de l'interface « Spécificités » : seules quatre
-- spécificités restent affichées (Gluten free, Vegan, Sans lactose, Sans
-- fruits à coque) — filtrage côté application (`src/lib/data/specificities.ts`),
-- cette migration ne fait qu'aligner les données existantes, sans rien
-- supprimer : aucune table, colonne ni ligne allergène n'est touchée.
--
-- Renommage léger : le libellé affiché de la spécificité `sans-gluten`
-- devient « Gluten free » — le slug est conservé tel quel (référencé par
-- `src/lib/ai/import/rules.ts`), donc aucune recette déjà liée à cette
-- spécificité (`recipe_specificities.specificity_id`) n'est affectée.
update specificities set name = 'Gluten free' where slug = 'sans-gluten' and name <> 'Gluten free';

-- Ajout, seulement si absente : `on conflict (slug)` s'appuie sur la
-- contrainte unique existante (voir 20260814090000_schema.sql).
insert into specificities (name, slug)
values ('Sans fruits à coque', 'sans-fruits-a-coque')
on conflict (slug) do nothing;
