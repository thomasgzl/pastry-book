# Tableau des tâches

Statuts autorisés : `À faire`, `Prête`, `En cours`, `Bloquée`, `À vérifier`, `Terminée`.

Une tâche passe à `Prête` seulement quand ses dépendances sont `Terminée` et qu'aucun de ses fichiers n'apparaît dans le ledger de verrous ci-dessous.

## Ledger de verrous actifs

Mis à jour par `project-orchestrator` à chaque changement de statut. Vide tant qu'aucune tâche n'est `En cours`.

| Fichiers verrouillés | Agent | Tâche | Depuis |
|---|---|---|---|
| — | — | — | — |

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
| CBF1 | Couche design system : palette renforcée + composants/tokens réutilisables (ornement fin, illustration temporaire, carte d'entrée, cadre visuel culinaire, titre éditorial, section préparation, ligne ingrédient, état « À vérifier ») | CBV1 | À faire | Zéro style dupliqué par page ; contrastes accessibles ; sauge/laiton jamais sur texte long | `src/app/globals.css`, `src/components/ui/*`, `src/components/cards/*` |
| CBF2 | Accueil recomposé : emblème temporaire, héro éditorial responsive, recherche plus visible, 4 cartes d'entrée à icônes fines olive, grilles responsive, suppression du 2e bouton Importer | CBF1 | À faire | Carré « L » remplacé ; 2e Importer supprimé (header conservé) ; grilles mobile 1col / tablette portrait 2×2 / paysage-desktop 4col ; 4 cartes poids visuel égal | `src/app/(app)/page.tsx` |
| CBF3 | Navigation/shell : libellés et zones cliquables desktop augmentés, onglet actif visible, menu compact mobile cible 44×44, titre non comprimé, Importer accessible ; retrait de tout badge dev (cercle « N ») / bouton flottant non documenté | CBF1 | À faire | Aucun artefact de dev visible ; onglet actif distinct ; menu mobile lisible ouvert ; Importer accessible aux deux formats | `src/components/layout/SiteHeader.tsx`, `src/app/(app)/layout.tsx` |
| CBF4 | Fiche recette éditoriale : header (titre/source/catégorie/fil d'Ariane réduit mobile), retrait de l'image de désert + visuel remplacé (ratio ~4:3 desktop/paysage, pleine largeur arrondie mobile/portrait, décor botanique léger), coefficient présentation seule, ingrédients plus lisibles | CBF1 | À faire | Image de désert retirée ; « Coefficient » libellé visible, raccourcis+perso groupés, état actif clair, texte « les quantités ne changent jamais » conservé, AUCUNE modif logique ; quantités alignées droite chiffres tabulaires, « À vérifier » et « QS » inchangés ; largeur fiche plus étroite | `src/app/(app)/recettes/[slug]/RecipeSheet.tsx`, `src/components/ui/CoefficientControl.tsx` |
| CBF5 | Largeurs et langage botanique transverses : max ~1180-1320px desktop (fiche plus étroite), tablette portrait/paysage optimisées spécifiquement, mobile 1col sans scroll horizontal, décor botanique fin masquable mobile jamais sous texte important | CBF2, CBF3, CBF4 | À faire | Aucun défilement horizontal sur les 4 profils ; décor jamais sous texte long ; largeurs respectées ; tablette non traitée comme un desktop réduit | `src/app/globals.css`, pages concernées (verrou déclaré au démarrage) |

## Lot D — Import

Propriétaire : `ai-import-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| D1 | Import structuré sans IA (upload, lot, saisie/correction manuelle) | B3, B4, B8 | À faire | Lot traité sans IA ni clé payante, import possible depuis fichiers et appareil photo téléphone/tablette, lot interrompu par coupure réseau reprend sans doublon | pipeline import manuel |
| D2 | Écran de vérification (original + proposition) | D1 | À faire | Comparaison visuelle possible, validation recette par recette, utilisable sur tablette portrait et paysage | écran de vérification |
| D3 | Extraction IA (texte local PDF/Word d'abord, IA pour structurer ; OCR/vision réservé aux scans/photos) derrière une interface indépendante du fournisseur (OpenAI en premier) | D1, D2 | À faire | Schéma strict, valeurs `null` si incertain, aucune invention, mode démonstration sans clé API | pipeline extraction |
| D4 | Normalisation des ingrédients + détection allergènes/spécificités | D3 | À faire | Règles déterministes d'abord, IA pour ambigus, aucune trace déduite | normalisation, allergènes |

## Lot E — Visuels IA

Propriétaire : `ai-visuals-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| E1 | Preset versionné « Botanique éditorial » + interface serveur indépendante du fournisseur (OpenAI Images en premier) | B3 (table `visual_assets`) | À faire | Prompt stocké une seule fois, versionné, aucune génération automatique en masse | preset |
| E2 | 5 exemples de référence (Citron, Pistache, une recette, une entreprise, une catégorie) | E1 | À faire | Cohérence visuelle validée manuellement avant tout lot | génération unitaire |
| E3 | Génération en lot | E2 (validée par l'utilisateur) | À faire | Ignore les objets déjà approuvés, galerie de validation groupée | génération en lot |

## Lot F — Validation

Propriétaire : `qa-integration-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| F1 | Plan de tests dérivé de `docs/08-ACCEPTANCE_CRITERIA.md`, incluant matrice téléphone/tablette portrait/tablette paysage/ordinateur et checklist PWA | A4 | À faire | Chaque critère converti en test vérifiable, y compris les critères « Design et responsive » et « PWA et hors connexion » | plan de tests |
| F2 | Validation de chaque lot avant démarrage du lot dépendant suivant | correspond au lot validé | À faire | Rapport clair, défauts assignés à l'agent propriétaire | rapports de validation |

## Tâches prêtes

Lot C complet (C1 à C9) terminé et validé QA le 2026-08-14 (validation par tranche C1, puis C2/C3/C4/C7/C8/C9, puis validation finale complète sur les 9 tranches — 280 tests unitaires, tests e2e sur 5 profils, checklist de 15 points, tous PASS). En attente d'une nouvelle validation avant lancement :

1. **Lot D** — Import (`ai-import-agent`), en commençant par l'import structuré sans IA (D1) avant l'extraction assistée (D3/D4).
2. **Lot E** — Visuels IA (`ai-visuals-agent`), preset commun puis 5 exemples de référence avant tout lot.

`ai-import-agent` et `ai-visuals-agent` restent non lancés — attente explicite de validation utilisateur.
