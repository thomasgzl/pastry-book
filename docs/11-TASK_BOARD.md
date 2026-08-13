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
| A2 | Inventaire des décisions techniques encore nécessaires (framework React, hébergement, fournisseur IA extraction, fournisseur IA image) | A1 | À vérifier | Liste explicite soumise à validation humaine, aucun choix imposé silencieusement | `docs/10-AGENT_ARCHITECTURE.md` |
| A3 | Vérification du mécanisme multi-agents réellement disponible | — | Terminée | `.claude/agents/*.md` créés et conformes au format attendu | `.claude/agents/*.md` |
| A4 | Création des fichiers d'organisation (`10`, `11`, `12`) | A1, A3 | Terminée | Fichiers présents et conformes aux exigences de la mission | `docs/10-AGENT_ARCHITECTURE.md`, `docs/11-TASK_BOARD.md`, `docs/12-INTEGRATION_PROTOCOL.md` |

## Lot B — Fondations techniques

Propriétaire principal : `data-security-agent` ; parallèle après validation des contrats : `frontend-design-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| B1 | Initialisation technique (framework choisi en A2, TypeScript strict, qualité de code) | A2 (validée par l'utilisateur) | À faire | L'application démarre, contrôles de qualité passent | config racine, `package.json` |
| B2 | Contrats communs (types du domaine, schémas de validation, conventions d'erreur, structure des médias) | B1 | À faire | Contrats écrits, relus par `project-orchestrator`, aucun agent métier n'a encore commencé | types partagés |
| B3 | Schéma de base de données et migrations (`docs/04-DATA_MODEL.md`) | B2 | À faire | Toutes les entités du modèle de données créées, invariants respectés | migrations |
| B4 | Authentification privée et politiques d'accès | B3 | À faire | Accès non authentifié bloqué, testé | auth, politiques d'accès |
| B5 | Jeu de données de démonstration | B3 | À faire | Données clairement marquées fictives, couvrant recette minimale et recette détaillée | seed/fixtures |
| B6 | Tokens du design system (couleurs, typographies, espacements) | B2 | À faire (parallèle à B3-B5 après B2) | Conforme à `docs/06-DESIGN_SYSTEM.md`, contrastes vérifiés | tokens/thème |
| B7 | Composants visuels de base (carte, bouton, badge « À vérifier ») | B6 | À faire | États chargement/vide/erreur prévus, clavier accessible | composants UI |

## Lot C — Navigation métier

Propriétaire : `recipe-search-agent` (composition avec composants de `frontend-design-agent`)

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| C1 | Page Entreprises générale | B4, B7 | À faire | Toutes les sources listées, aucune carte vide | page Entreprises |
| C2 | Page intérieure d'une entreprise + catégories locales (exemple Hennessy) | C1 | À faire | Hennessy accessible uniquement depuis Entreprises, catégories propres à Hennessy | page Entreprise |
| C3 | Répertoire des recettes + recherche par titre | B4, B7 | À faire | Recette retrouvable par titre et par source | page Recettes |
| C4 | Fiche recette adaptative | C3 | À faire | Recette minimale et détaillée testées, aucune section vide | fiche recette |
| C5 | Coefficient multiplicateur | C4 | À faire | Tests unitaires décimaux, `QS`/absent non calculés | logique coefficient |
| C6 | Répertoire des matières premières | B4, B7 | À faire | Alias retrouvent la matière canonique sans changer le libellé source | page Matières premières |
| C7 | Répertoire des spécificités et allergènes (séparés) | B4, B7 | À faire | Deux espaces distincts, statuts proposé/confirmé visibles | page Spécificités |
| C8 | Recherche globale groupée | C1, C3, C6 | À faire | Résultats groupés par type, source toujours indiquée | recherche globale |

## Lot D — Import

Propriétaire : `ai-import-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| D1 | Import structuré sans IA (upload, lot, saisie/correction manuelle) | B3, B4 | À faire | Lot traité sans IA ni clé payante | pipeline import manuel |
| D2 | Écran de vérification (original + proposition) | D1 | À faire | Comparaison visuelle possible, validation recette par recette | écran de vérification |
| D3 | Extraction IA (PDF/Word puis OCR image) | D1, D2 | À faire | Schéma strict, valeurs `null` si incertain, aucune invention | pipeline extraction |
| D4 | Normalisation des ingrédients + détection allergènes/spécificités | D3 | À faire | Règles déterministes d'abord, IA pour ambigus, aucune trace déduite | normalisation, allergènes |

## Lot E — Visuels IA

Propriétaire : `ai-visuals-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| E1 | Preset versionné « Botanique éditorial » | B3 (table `visual_assets`) | À faire | Prompt stocké une seule fois, versionné | preset |
| E2 | 5 exemples de référence (Citron, Pistache, une recette, une entreprise, une catégorie) | E1 | À faire | Cohérence visuelle validée manuellement avant tout lot | génération unitaire |
| E3 | Génération en lot | E2 (validée par l'utilisateur) | À faire | Ignore les objets déjà approuvés, galerie de validation groupée | génération en lot |

## Lot F — Validation

Propriétaire : `qa-integration-agent`

| ID | Tâche | Dépendances | Statut | Critères de validation | Fichiers concernés |
|---|---|---|---|---|---|
| F1 | Plan de tests dérivé de `docs/08-ACCEPTANCE_CRITERIA.md` | A4 | À faire | Chaque critère converti en test vérifiable | plan de tests |
| F2 | Validation de chaque lot avant démarrage du lot dépendant suivant | correspond au lot validé | À faire | Rapport clair, défauts assignés à l'agent propriétaire | rapports de validation |

## Trois premières tâches prêtes

1. **A2** — Inventaire des décisions techniques encore nécessaires, soumis à validation humaine avant de démarrer B1.
2. **B1** — Initialisation technique, bloquée tant que A2 n'est pas validée par l'utilisateur.
3. **B6** — Tokens du design system, peut démarrer dès que B2 (contrats communs) existe, en parallèle de B3-B5.
