# Tableau des tâches

Statuts autorisés : `À faire`, `Prête`, `En cours`, `Bloquée`, `À vérifier`, `Terminée`.

Une tâche passe à `Prête` seulement quand ses dépendances sont `Terminée` et qu'aucun de ses fichiers n'apparaît dans le ledger de verrous ci-dessous.

## Ledger de verrous actifs

Mis à jour par `project-orchestrator` à chaque changement de statut. Vide tant qu'aucune tâche n'est `En cours`.

| Fichiers verrouillés | Agent | Tâche | Depuis |
|---|---|---|---|
| `src/app/(app)/importer/**`, `src/lib/import/**`, `src/lib/ai/import/**` | `ai-import-agent` | Lot D (D1→D3) | 2026-08-14 |
| `src/app/(app)/visuels/**`, `src/lib/visuals/**`, `src/lib/ai/visuals/**` | `ai-visuals-agent` | Lot E (E1→E4) | 2026-08-14 |

Réservations à la demande (non encore actives, à inscrire au démarrage de la tâche) :

- `src/components/layout/SiteHeader.tsx` → `frontend-design-agent` pour **D1b** uniquement (branchement du bouton Importer). À ne verrouiller qu'au démarrage de D1b, une fois la route `/importer` créée par D1.

**Contrats gelés, lecture seule pour D et E :** `src/lib/domain/schemas.ts`, `src/lib/supabase/types.ts`, `supabase/migrations/*`. Ils contiennent déjà `import_batches`/`import_items`/`importItemSchema`, `visual_assets`/`visualAssetSchema` (prompt, presetVersion, createdAt, statut `draft`/`approved`/`rejected`, invariant `isPrimary`), et les statuts IA `proposed`/`confirmed`/`rejected`/`needs_review`. Aucun lot ne les modifie. Si D ou E découvre une lacune, il s'arrête et la signale à `project-orchestrator` : `data-security-agent` fera une passe unique consolidée sur le contrat concerné **avant** que D et E ne reprennent, pour éviter tout conflit d'écriture croisé.

## Lot A — Audit

Propriétaire : `project-orchestrator`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| A1 | Audit du dépôt existant (structure, dépendances déjà installées, git) | — | Terminée | Constat écrit et daté, aucune supposition non vérifiée | `docs/10-AGENT_ARCHITECTURE.md` |
| A2 | Décisions techniques (framework, hébergement, fournisseurs IA) | A1 | Terminée | Décisions validées par l'utilisateur le 2026-08-14, consignées dans `CLAUDE.md` et `docs/10-AGENT_ARCHITECTURE.md`, aucune contradiction avec les principes non négociables, validé par `qa-integration-agent` (mojibake `docs/09-AI_VISUALS.md` corrigé et revérifié) | `CLAUDE.md`, `docs/10-AGENT_ARCHITECTURE.md`, `docs/11-TASK_BOARD.md`, `docs/04-DATA_MODEL.md`, `docs/05-AI_IMPORT.md`, `docs/09-AI_VISUALS.md` |
| A3 | Vérification du mécanisme multi-agents réellement disponible | — | Terminée | `.claude/agents/*.md` créés et conformes au format attendu | `.claude/agents/*.md` |
| A4 | Création des fichiers d'organisation (`10`, `11`, `12`) | A1, A3 | Terminée | Fichiers présents et conformes aux exigences de la mission | `docs/10-AGENT_ARCHITECTURE.md`, `docs/11-TASK_BOARD.md`, `docs/12-INTEGRATION_PROTOCOL.md` |

## Lot B — Fondations techniques

Propriétaire principal : `data-security-agent` ; parallèle après validation des contrats : `frontend-design-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| B1 | Init Next.js App Router + TypeScript strict + Tailwind + Vitest + Playwright + Zod + client Supabase (déps) | A2 (validée par l'utilisateur) | Terminée | L'application démarre, contrôles de qualité passent, rendu de base testé téléphone/tablette/ordinateur | config racine, `package.json` |
| B2 | Contrats communs (types du domaine, schémas de validation, conventions d'erreur, structure des médias) | B1 | Terminée | Contrats écrits (`src/lib/domain/`), relus et validés par `project-orchestrator`, aucun agent métier n'avait encore commencé | `src/lib/domain/` |
| B3 | Schéma de base de données et migrations (`docs/04-DATA_MODEL.md`) | B2 | Terminée | Toutes les entités du modèle de données créées, invariants respectés (relu manuellement par `project-orchestrator` — validation SQL live impossible, Docker indisponible dans cet environnement) | `supabase/migrations/` |
| B4 | Authentification privée et politiques d'accès | B3 | Terminée | Accès non authentifié bloqué (proxy + RLS + GRANTs explicites), testé unitairement (`route-access.test.ts`) et par requête HTTP réelle (lot C : `middleware.ts` renommé `src/proxy.ts`, seul nom reconnu par Next.js 16, faille corrigée) ; test live contre un vrai projet Supabase à refaire dès qu'un environnement Docker fonctionnel est disponible | `supabase/`, `src/lib/supabase/`, `src/proxy.ts` |
| B5 | Jeu de données de démonstration | B3 | Terminée | Données clairement marquées fictives, couvrant recette minimale et recette détaillée, alias citron, préparations homonymes de sources différentes — validé par `qa-integration-agent` (incohérence mineure de texte corrigée) ; contenu jamais exécuté contre un vrai PostgreSQL (Docker indisponible, même limite que B3/B4) | `supabase/seed.sql` |
| B6 | Tokens du design system mobile-first (couleurs, typographies, espacements, points de rupture à partir du contenu) | B2 | Terminée | Conforme à `docs/06-DESIGN_SYSTEM.md`, contrastes vérifiés (sauge et laiton ancien légèrement assombris pour atteindre 3:1 UI, réservés aux accents/bordures jamais au texte de corps) | `src/app/globals.css` |
| B7 | Composants visuels de base tactiles (carte, bouton, badge « À vérifier ») | B6 | Terminée | États couverts, cibles ≥ 44 × 44 px, clavier accessible, zéro dépendance au survol souris | `src/components/` |
| B8 | Manifeste PWA + service worker + page de repli hors connexion | B7 | Terminée | Installable iOS/iPadOS/Android/ordinateur, mode `standalone`, page déjà chargée consultable hors connexion, mise à jour de version sans double cache indéfini, aucun secret/réponse d'auth mis en cache — validé par `qa-integration-agent` (SW relu ligne à ligne) | `src/app/manifest.ts`, `public/`, service worker, `src/app/offline/` |
| B9 | Harnais de test responsive (téléphone étroit, iPhone récent, tablette portrait, tablette paysage, ordinateur) | B7 | Terminée | Les 5 profils vérifiables à chaque livraison (22 tests passés, 8 skips documentés), zones sûres iOS/iPadOS prises en compte, tests manifeste/SW/hors connexion | `playwright.config.ts`, `tests/e2e/` |
| B10 | Page `/connexion` minimale (nécessaire au middleware B4) | B4, B7 | Terminée | Formulaire accessible, clavier virtuel, états chargement/erreur/succès, aucun secret client, pas d'inscription publique, redirection interne sûre — validé par `qa-integration-agent` | `src/app/connexion/` |

## Lot C — Navigation métier

Propriétaire : `recipe-search-agent` (composition avec composants de `frontend-design-agent`)

Renumérotation 2026-08-14 pour correspondre exactement à la spécification détaillée validée (shell d'abord, coefficient séparé de la fiche recette, recherche globale en dernier).

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| C1 | Structure commune : shell authentifié, en-tête, nav principale/mobile, bouton Importer non fonctionnel, fil d'Ariane, états chargement/erreur/hors connexion/aucun résultat | B4, B7, B8 | Terminée | Hennessy jamais en nav principale, nav tactile mobile cohérente PWA — validé QA (82 tests) | `src/components/`, shell applicatif |
| C2 | Page d'accueil (titre, sous-titre, recherche globale, 4 cartes égales, illustration démo, Importer secondaire) | C1 | Terminée | Aucun widget hors périmètre, 4 cartes poids visuel identique | page d'accueil |
| C3 | Entreprises : `/entreprises`, `/entreprises/:entreprise`, `/entreprises/:entreprise/:categorie` | C1 | Terminée | Hennessy accessible uniquement depuis Entreprises, catégories propres à Hennessy absentes ailleurs, catégorie vide jamais affichée | pages Entreprises |
| C4 | Répertoire des recettes `/recettes` (recherche titre, filtres, état sans résultat, conservation filtres au retour) | C1 | Terminée | Deux recettes homonymes distinguables par source, aucun champ hors périmètre (durée/difficulté/etc.) | page Recettes |
| C5 | Fiche recette adaptative `/recettes/:id` | C3, C4 | Terminée | CAP minimale sans bloc vide, Hennessy détaillée avec informations complémentaires, préparation jamais globalisée — validé QA finale (checklist 15 points) | fiche recette |
| C6 | Coefficient multiplicateur (`× 0,5/1/1,5/2` + personnalisé) | C5 | Terminée | `QS`/absent/`needs_review` jamais inventés, × 1 restitue l'original, calcul pur testé unitairement (17 cas) — validé QA finale | logique + UI coefficient |
| C7 | Matières premières `/matieres-premieres` + fiche matière | C1 | Terminée | Alias citron (jus/zeste/purée) retrouvent Citron sans modifier les libellés source — validé QA | pages Matières premières |
| C8 | Spécificités et allergènes `/specificites`, séparés | C1 | Terminée | `confirmed`/`proposed` visuellement distincts, aucune confirmation par absence d'ingrédient — validé QA | page Spécificités |
| C9 | Recherche globale groupée (Entreprises/Recettes/Matières premières/Catégories) | C3, C4, C7 | Terminée | État vide/erreur, clavier, aucun appel IA, catégorie indique son entreprise parente — validé QA | recherche globale |

## Lot C-bis — Correction visuelle (skin éditorial, aucun changement de comportement)

Ajouté 2026-08-14. Phase intermédiaire demandée par l'utilisateur avant D/E : rendre l'interface fidèle au mood board « Botanique éditorial ». **Périmètre strictement visuel.** Interdiction absolue de toucher : routes, hiérarchie Entreprises→Hennessy→Catégorie→Recette, recherche, filtres, alias ingrédients, données démo, logique coefficient, règles QS/quantité absente/needs_review, sections conditionnelles, statuts confirmed/proposed, PWA, auth. Aucun test métier existant ne doit changer de comportement ; tout test qui casse pour cause de refonte visuelle est corrigé au niveau du sélecteur, jamais de la logique. Aucune génération IA payante.

Propriétaires : `frontend-design-agent` (implémentation), `ai-visuals-agent` (contrat de placeholders uniquement). Validation finale unique : `qa-integration-agent`.

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| CBV1 | Contrat des placeholders visuels + assets SVG temporaires (emblème monogramme, branches botaniques trait olive, cadre culinaire) — AUCUNE génération payante | C5 | Terminée | Contrat écrit (dimensions, ratios, nommage, emplacements où les visuels IA viendront) ; assets clairement marqués « temporaire / remplaçable » ; aucun appel IA — 10 SVG créés (`emblem`, `placeholder-hero`, `placeholder-recipe-4x3`, 6× `botanical-*`, `ornament-branch`), tableau des emplacements dans `docs/09-AI_VISUALS.md` § Contrat des placeholders | `public/visuals/placeholders/`, `docs/09-AI_VISUALS.md` |
| CBF1 | Couche design system : palette renforcée + composants/tokens réutilisables (ornement fin, illustration temporaire, carte d'entrée, cadre visuel culinaire, titre éditorial, section préparation, ligne ingrédient, état « À vérifier ») | CBV1 | Terminée | Zéro style dupliqué par page ; contrastes accessibles ; sauge/laiton jamais sur texte long — validé QA finale | `src/app/globals.css`, `src/components/ui/*`, `src/components/cards/*` |
| CBF2 | Accueil recomposé : emblème temporaire, héro éditorial responsive, recherche plus visible, 4 cartes d'entrée à icônes fines olive, grilles responsive, suppression du 2e bouton Importer | CBF1 | Terminée | Carré « L » remplacé ; 2e Importer supprimé (header conservé) ; grilles mobile 1col / tablette portrait 2×2 / paysage-desktop 4col ; 4 cartes poids visuel égal — validé QA finale | `src/app/(app)/page.tsx` |
| CBF3 | Navigation/shell : libellés et zones cliquables desktop augmentés, onglet actif visible, menu compact mobile cible 44×44, titre non comprimé, Importer accessible ; retrait de tout badge dev (cercle « N ») / bouton flottant non documenté | CBF1 | Terminée | Aucun artefact de dev visible ; onglet actif distinct ; menu mobile lisible ouvert ; Importer accessible aux deux formats — débordement horizontal tablette portrait trouvé en QA puis corrigé (`SiteHeader.tsx`), revérifié | `src/components/layout/SiteHeader.tsx`, `src/app/(app)/layout.tsx` |
| CBF4 | Fiche recette éditoriale : header (titre/source/catégorie/fil d'Ariane réduit mobile), retrait de l'image de désert + visuel remplacé (ratio ~4:3 desktop/paysage, pleine largeur arrondie mobile/portrait, décor botanique léger), coefficient présentation seule, ingrédients plus lisibles | CBF1 | Terminée | Image de désert retirée (`RecipeSheet.tsx` et `RecipeCard.tsx`) ; « Coefficient » libellé visible, raccourcis+perso groupés, état actif clair, texte « les quantités ne changent jamais » conservé, AUCUNE modif logique ; quantités alignées droite chiffres tabulaires, « À vérifier » et « QS » inchangés ; largeur fiche plus étroite — validé QA finale | `src/app/(app)/recettes/[slug]/RecipeSheet.tsx`, `src/components/cards/RecipeCard.tsx` |
| CBF5 | Largeurs et langage botanique transverses : max ~1180-1320px desktop (fiche plus étroite), tablette portrait/paysage optimisées spécifiquement, mobile 1col sans scroll horizontal, décor botanique fin masquable mobile jamais sous texte important | CBF2, CBF3, CBF4 | Terminée | Aucun défilement horizontal sur les 4 profils ; décor jamais sous texte long ; largeurs respectées ; tablette non traitée comme un desktop réduit — validé QA finale | `src/app/globals.css`, pages concernées |

## Lot D — Import assisté

Propriétaire : `ai-import-agent`. UI sur demande explicite : `frontend-design-agent`. Contrats/validation/stockage seulement : `data-security-agent`. Un seul checkpoint QA (niveau 2) en fin de lot.

Refonte 2026-08-14 : remplace l'ancien découpage D1–D4 par le périmètre validé (import manuel fonctionnel d'abord, abstraction IA en mode démonstration ensuite, aucun appel payant). L'ancien D4 (normalisation/allergènes/spécificités) est fusionné dans D3, qui l'inclut explicitement.

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| D1 | Parcours d'import manuel fonctionnel (assistant). Bouton Importer → choisir entreprise/source → choisir ou créer une catégorie locale à cette entreprise → ajouter un ou plusieurs fichiers (image, capture, PDF, DOCX, texte collé) → afficher les informations reconnues → correction manuelle → écran de vérification (original + proposition, champs incertains mis en évidence) → **enregistrement uniquement après confirmation humaine**. | B3, B4, B8 | Prête | Aucune sauvegarde auto avant validation ; formulaire pleinement utilisable **sans fournisseur IA** (aucune dépendance dure à une clé API) ; catégorie propre à l'entreprise choisie, jamais globalisée ; création contrôlée d'une nouvelle catégorie locale ; import possible depuis fichiers et appareil photo tablette/téléphone ; validation recette par recette ; utilisable clavier virtuel ouvert, tablette portrait et paysage, sans défilement horizontal ; états chargement/erreur/aucun résultat présents | `src/app/(app)/importer/**`, `src/lib/import/**` (hors `schema.ts` géré en D2) |
| D1b | Branchement du bouton « Importer » du shell vers la route `/importer` (retrait de l'état désactivé). **Micro-tâche `frontend-design-agent`**, sur demande explicite de `ai-import-agent`, une fois `/importer` créée. | D1 | Bloquée | Bouton actif aux deux formats (mobile/desktop), cible ≥ 44×44 px, aucune régression du header, aucune modification de logique métier | `src/components/layout/SiteHeader.tsx` |
| D2 | Modèle d'import + validation stricte (Zod, spécifique à l'import, concrétise `proposedRecipe` laissé `unknown` dans le contrat gelé — **ne modifie pas `src/lib/domain/schemas.ts`**). Champs conditionnels : titre, source/entreprise, catégorie locale facultative, préparations, ingrédients, quantité originale, unité originale, procédé/température/informations complémentaires/spécificités/allergènes facultatifs, image d'origine. | D1 | Prête | Aucune information inventée ; quantité illisible → `null` + `À vérifier` ; `QS` conservé tel quel ; libellé original de l'ingrédient conservé ; ingrédient canonique **proposé séparément**, jamais fusionné dans la donnée source ; préparation attachée à sa recette, jamais globalisée (principe 7) ; aucune section vide affichée ; import idempotent ou détection claire de doublon | `src/lib/import/schema.ts`, `src/lib/import/model.ts`, tests colocalisés |
| D3 | Abstraction serveur IA d'import **indépendante du fournisseur** (port + adaptateur), couvrant OCR, extraction structurée, normalisation des ingrédients, proposition d'allergènes, proposition de spécificités (OpenAI = premier fournisseur cible). **Aucun appel payant : mode démonstration déterministe uniquement.** Ne pas traiter les 600 recettes : créer **3 exemples démo contrôlés** — (a) recette CAP ingrédients seuls, (b) recette Hennessy détaillée, (c) capture avec quantité illisible. | D1, D2 | À faire | Chaque résultat IA porte un état `proposed`/`confirmed`/`rejected`/`needs_review` — jamais certain automatiquement ; texte local PDF/DOCX d'abord, OCR/vision réservé scans/photos/captures ; l'exemple (c) produit `null` + `À vérifier`, **jamais une valeur inventée** ; règles déterministes d'abord pour allergènes/spécificités, IA pour les ambigus, aucune trace ni contamination déduite ; aucun secret côté client ; le code métier n'appelle jamais le SDK du fournisseur directement | `src/lib/ai/import/**` (port, adaptateur démo, fixtures des 3 exemples) |

## Lot E — Illustrations IA

Propriétaire : `ai-visuals-agent`. UI sur demande explicite : `frontend-design-agent`. Contrats/stockage seulement : `data-security-agent`. Un seul checkpoint QA (niveau 2) en fin de lot.

Refonte 2026-08-14 : remplace l'ancien découpage E1–E3 par le périmètre validé (preset versionné, infrastructure interchangeable, quatre usages + galerie de validation, 5 exemples en mode démonstration, aucune génération en masse ni appel payant sans autorisation explicite).

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| E2 | Preset visuel unique « Botanique éditorial — v1 », **versionné** (constante de données). Direction : illustration culinaire fine, encre olive, aquarelle très légère, fond ivoire/transparent, composition aérée, cohérent Bodoni Moda/Karla/cacao/olive/sauge. Exclusions : aucun texte intégré, aucun logo inventé, aucune personne, pas de photoréalisme, pas de rose/terracotta, pas de végétation excessive. | B6 (design system) | Terminée | Preset stocké une seule fois, identifié par version (`v1`) ; exclusions explicites présentes ; aucune génération, aucun appel IA — 10 tests unitaires | `src/lib/visuals/preset.ts` |
| E1 | Infrastructure : fournisseur d'images **interchangeable** (port + adaptateur), mode démonstration **sans clé**, appel serveur uniquement, **aucun secret côté client**. Stockage via le contrat gelé `visual_assets` : image + prompt + version du preset + date de génération + statut `draft`/`approved`/`rejected`. | E2, B3 (table `visual_assets`) | Prête | **Ne remplace jamais automatiquement un visuel déjà `approved`** ; consomme le preset E2 ; le code métier n'appelle jamais le SDK du fournisseur directement ; aucune clé consommée en mode démo ; date de génération et prompt persistés | `src/lib/ai/visuals/**`, `src/lib/visuals/provider.ts`, `src/lib/visuals/storage.ts`, tests colocalisés |
| E3 | Quatre types d'illustrations (matière première, recette, entreprise, catégorie d'entreprise) + **galerie de validation**. Fonctions : génération individuelle, régénération d'un brouillon, validation ou rejet, génération **uniquement pour les visuels manquants**, prévention des générations accidentelles en masse (confirmation explicite requise avant tout lot). | E1 | À faire | Cycle `draft`/`approved`/`rejected` complet et visible ; un visuel `approved` jamais écrasé par régénération ; aucun lot déclenché sans confirmation explicite ; galerie utilisable tablette portrait/paysage sans scroll horizontal ; UI via `frontend-design-agent` sur demande explicite | `src/app/(app)/visuels/**`, logique dans `src/lib/visuals/**` |
| E4 | **5 exemples maximum, mode démonstration UNIQUEMENT** : Citron, Pistache, Tarte au citron, ambiance Hennessy (sans logo reproduit), catégorie « Recettes de base ». Passerelle coût : avant tout appel payant réel, afficher fournisseur, modèle, nombre exact d'images, estimation de coût si disponible, et **attendre l'autorisation explicite de l'utilisateur**. | E2, E3 | À faire | Sans autorisation utilisateur : aucun appel réel, aucune clé consommée ; les 5 exemples cohérents avec le preset v1 ; ambiance Hennessy sans logo reproduit ; validation manuelle avant toute publication | `src/lib/visuals/fixtures/**` (5 exemples démo) |

## Lot F — Validation

Propriétaire : `qa-integration-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| F1 | Plan de tests dérivé de `docs/08-ACCEPTANCE_CRITERIA.md`, incluant matrice téléphone/tablette portrait/tablette paysage/ordinateur et checklist PWA | A4 | À faire | Chaque critère converti en test vérifiable, y compris les critères « Design et responsive » et « PWA et hors connexion » | plan de tests |
| F2 | Validation de chaque lot avant démarrage du lot dépendant suivant | correspond au lot validé | À faire | Rapport clair, défauts assignés à l'agent propriétaire | rapports de validation |

## Tâches prêtes

Lot C / C-bis terminés et validés (C-bis validé définitivement par l'utilisateur le 2026-08-14). **Lots D et E lancés en parallèle** (territoires de fichiers disjoints, verrous inscrits au ledger). Mode économie de tokens permanent (niveaux 1/2, §9 du protocole).

Tâches immédiatement `Prête` :

1. **D1** — Parcours d'import manuel fonctionnel (`ai-import-agent`). Puis **D2** (modèle + validation stricte, `Prête` en parallèle car fichiers disjoints de D1) ; **D3** débloquée après D1+D2 ; **D1b** (frontend) débloquée après création de `/importer`.
2. **E2** — Preset « Botanique éditorial — v1 » (`ai-visuals-agent`). Puis **E1** (infra fournisseur) après E2 ; **E3** après E1 ; **E4** après E2+E3.

Garde-fous de cette phase :

- Aucune modification des fonctionnalités validées du lot C (recherche, coefficient, fiche recette, données démo, contrats).
- Aucun appel IA payant (D et E) sans autorisation explicite de l'utilisateur ; passerelle coût obligatoire avant tout appel réel (E4), et avant le passage import manuel → import assisté (protocole §8).
- Contrats `src/lib/domain/schemas.ts` / `src/lib/supabase/types.ts` gelés : toute lacune passe par `data-security-agent` en passe unique avant reprise.
- Un seul checkpoint QA niveau 2 par lot (D et E), périmètre annoncé à l'avance.
- Hygiène serveur : un seul `next dev` actif avant toute capture, captures nommées lot + date, aucune galerie réutilisée d'une session précédente.
