# Tableau des tâches

Statuts autorisés : `À faire`, `Prête`, `En cours`, `Bloquée`, `À vérifier`, `Terminée`.

Une tâche passe à `Prête` seulement quand ses dépendances sont `Terminée` et qu'aucun de ses fichiers n'apparaît dans le ledger de verrous ci-dessous.

## Ledger de verrous actifs

Mis à jour par `project-orchestrator` à chaque changement de statut. Vide tant qu'aucune tâche n'est `En cours`.

| Fichiers verrouillés | Agent | Tâche | Depuis |
|---|---|---|---|
| `supabase/seed.sql` | `data-security-agent` | B5 | 2026-08-14 |
| `src/app/connexion/`, `src/app/manifest.ts`, `public/`, `src/app/offline/`, service worker, `playwright.config.ts` | `frontend-design-agent` | B8, B9, connexion | 2026-08-14 |

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
| B4 | Authentification privée et politiques d'accès | B3 | Terminée | Accès non authentifié bloqué (middleware + RLS + GRANTs explicites), testé unitairement (`route-access.test.ts`) ; test live contre un vrai projet Supabase à refaire dès qu'un environnement Docker fonctionnel est disponible | `supabase/`, `src/lib/supabase/`, `middleware.ts` |
| B5 | Jeu de données de démonstration | B3 | En cours | Données clairement marquées fictives, couvrant recette minimale et recette détaillée, alias citron, préparations homonymes de sources différentes | `supabase/seed.sql` |
| B6 | Tokens du design system mobile-first (couleurs, typographies, espacements, points de rupture à partir du contenu) | B2 | Terminée | Conforme à `docs/06-DESIGN_SYSTEM.md`, contrastes vérifiés (sauge et laiton ancien légèrement assombris pour atteindre 3:1 UI, réservés aux accents/bordures jamais au texte de corps) | `src/app/globals.css` |
| B7 | Composants visuels de base tactiles (carte, bouton, badge « À vérifier ») | B6 | Terminée | États couverts, cibles ≥ 44 × 44 px, clavier accessible, zéro dépendance au survol souris | `src/components/` |
| B8 | Manifeste PWA + service worker + page de repli hors connexion | B7 | En cours | Installable iOS/iPadOS/Android/ordinateur, mode `standalone`, page déjà chargée consultable hors connexion, mise à jour de version sans double cache indéfini, aucun secret/réponse d'auth mis en cache | `src/app/manifest.ts`, `public/`, service worker, `src/app/offline/` |
| B9 | Harnais de test responsive (téléphone étroit, iPhone récent, tablette portrait, tablette paysage, ordinateur) | B7 | En cours | Les 5 profils vérifiables à chaque livraison, zones sûres iOS/iPadOS prises en compte, tests manifeste/SW/hors connexion | `playwright.config.ts`, `tests/e2e/` |
| B10 | Page `/connexion` minimale (nécessaire au middleware B4) | B4, B7 | En cours | Formulaire accessible, clavier virtuel, états chargement/erreur/succès, aucun secret client, pas d'inscription publique | `src/app/connexion/` |

## Lot C — Navigation métier

Propriétaire : `recipe-search-agent` (composition avec composants de `frontend-design-agent`)

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| C1 | Page Entreprises générale | B4, B7 | À faire | Toutes les sources listées, aucune carte vide | page Entreprises |
| C2 | Page intérieure d'une entreprise + catégories locales (exemple Hennessy) | C1 | À faire | Hennessy accessible uniquement depuis Entreprises, catégories propres à Hennessy | page Entreprise |
| C3 | Répertoire des recettes + recherche par titre | B4, B7 | À faire | Recette retrouvable par titre et par source | page Recettes |
| C4 | Fiche recette adaptative | C3 | À faire | Recette minimale et détaillée testées, aucune section vide, aucun défilement horizontal, une colonne sur téléphone | fiche recette |
| C5 | Coefficient multiplicateur | C4 | À faire | Tests unitaires décimaux, `QS`/absent non calculés, boutons utilisables au doigt, visibles avant la liste d'ingrédients sur téléphone | logique coefficient |
| C6 | Répertoire des matières premières | B4, B7 | À faire | Alias retrouvent la matière canonique sans changer le libellé source | page Matières premières |
| C7 | Répertoire des spécificités et allergènes (séparés) | B4, B7 | À faire | Deux espaces distincts, statuts proposé/confirmé visibles | page Spécificités |
| C8 | Recherche globale groupée | C1, C3, C6 | À faire | Résultats groupés par type, source toujours indiquée, filtres utilisables au toucher, état de navigation préservé au retour depuis une recette | recherche globale |

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

Fondations techniques (B1, B2, B3, B4, B6, B7) terminées et validées le 2026-08-14. Prêtes ensuite, en attente d'une nouvelle validation avant lancement :

1. **B5** — Jeu de données de démonstration (`data-security-agent`), prête (dépend de B3, Terminée).
2. **B8/B9** — Manifeste PWA/service worker et harnais de test responsive (`frontend-design-agent`), prêtes (dépendent de B7, Terminée).
3. **Lot C** — Navigation métier (`recipe-search-agent`), y compris la page `/connexion` requise pour que le flux d'authentification du middleware fonctionne de bout en bout — signalé par `data-security-agent`.

`ai-import-agent` et `ai-visuals-agent` restent non lancés (lot D/E, hors périmètre tant que le lot C n'est pas validé).
