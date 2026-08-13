# Architecture multi-agents

## Mécanisme réel utilisé

Claude Code prend en charge les agents personnalisés via des fichiers Markdown avec en-tête YAML dans `.claude/agents/`. C'est ce mécanisme qui est utilisé ici : chaque agent est un fichier `.claude/agents/<nom>.md` déclarant `name`, `description` et `tools`, invocable depuis la session principale.

### Adaptations par rapport à l'organisation demandée

- **Pas de dépôt git initialisé** au moment de la création de cette organisation (`git status` renvoie « not a git repository »). Les worktrees/branches isolées ne sont donc pas disponibles pour le travail parallèle tant que le dépôt n'est pas initialisé. En attendant, l'isolation des fichiers repose sur un ledger de verrous manuel tenu dans `docs/11-TASK_BOARD.md` (voir `docs/12-INTEGRATION_PROTOCOL.md`). Recommandation : initialiser git dès le Lot A pour permettre commits par tâche et retour arrière propre — décision à valider par l'utilisateur, non prise unilatéralement.
- Les « sous-agents » Claude Code n'ont pas de mémoire partagée automatique entre eux : toute information qu'un agent doit transmettre à un autre passe par un fichier écrit (rapport de livraison dans `docs/11-TASK_BOARD.md` ou commentaire de tâche), jamais par supposition d'un contexte commun.
- Aucun outil natif ne verrouille un fichier au niveau du système. Le verrouillage décrit ici est une convention respectée par les agents et contrôlée par `project-orchestrator`, pas une contrainte technique.

## Rôle de chaque agent

| Agent | Rôle | Périmètre |
|---|---|---|
| `project-orchestrator` | Coordination, découpage, contrôle qualité produit | `docs/10,11,12`, `.claude/agents/*` |
| `frontend-design-agent` | Interface, design system, navigation, responsive | Composants, styles, layouts, routes de présentation |
| `data-security-agent` | Base de données, auth, sécurité | Migrations, politiques d'accès, contrats de données, `visual_assets` (structure) |
| `recipe-search-agent` | Consultation, recherche, coefficient | Pages Entreprises/Recettes/Matières premières/Spécificités, fiche adaptative, calculs |
| `ai-import-agent` | Import Quantara, extraction, classement assisté | Pipeline d'import, OCR, validation JSON, écran de vérification |
| `ai-visuals-agent` | Génération d'illustrations IA | Preset « Botanique éditorial », génération unitaire/lot, galerie de validation |
| `qa-integration-agent` | Validation indépendante et intégration | Plan de tests, rapports, régressions |

Le détail des responsabilités, fichiers possédés et règles impératives de chaque agent est dans son propre fichier `.claude/agents/<nom>.md` — cette table est un résumé, pas la source de vérité.

## Fichiers possédés (exclusifs)

- Migrations de base de données → `data-security-agent` uniquement, aucune exception.
- `docs/10-AGENT_ARCHITECTURE.md`, `docs/11-TASK_BOARD.md`, `docs/12-INTEGRATION_PROTOCOL.md`, `.claude/agents/*.md` → `project-orchestrator` uniquement.
- Preset visuel versionné et prompts → `ai-visuals-agent` uniquement.
- Pipeline d'extraction et schéma JSON d'import → `ai-import-agent` uniquement.

## Fichiers partagés (contrats communs)

Doivent être définis avant tout travail parallèle, et toute modification ultérieure doit être annoncée à `project-orchestrator` avant d'être faite :

- Types du domaine (Recette, Section, Ingrédient, Source, Catégorie, Spécificité, Allergène, VisualAsset).
- Schémas de validation (Zod ou équivalent) des entrées externes.
- Interfaces des services (accès aux données, appel IA côté serveur).
- Conventions d'erreur et d'état (`draft`, `needs_review`, `validated`, `confirmed`, `proposed`).
- Structure des médias (photo, illustration, document original).

Propriétaire de premier jet : `data-security-agent`, en concertation avec `project-orchestrator`. Toute évolution ultérieure d'un contrat commun doit être annoncée au coordinateur avant modification, quel que soit l'agent qui la propose.

## Dépendances entre agents

```text
project-orchestrator (audit, contrats)
        │
        ▼
data-security-agent (schéma, auth, contrats de données)
        │
        ├──▶ frontend-design-agent (design system, pages statiques)
        │
        ▼
recipe-search-agent (consultation, recherche, coefficient)
        │
        ▼
ai-import-agent (import structuré, puis extraction IA)
        │
        ▼
ai-visuals-agent (illustrations, après validation des données)
        │
        ▼
qa-integration-agent (validation à chaque étape, pas seulement à la fin)
```

`qa-integration-agent` intervient après chaque lot, pas uniquement en fin de projet.

## Situations imposant une validation humaine

- Fin de chaque lot (A à F) avant démarrage du lot suivant.
- Toute migration destructrice ou suppression en cascade.
- Toute décision produit absente de la documentation (`CLAUDE.md`, `docs/`).
- Changement d'architecture technique (choix du framework React, hébergement, fournisseur IA).
- Passage de l'import sans IA à l'import assisté par IA (Phase 6 → Phase 7).
- Premier lot de génération d'illustrations en masse (après les 5 exemples de référence).
- Tout écart proposé par rapport aux principes non négociables de `CLAUDE.md`.

## Règles anti-chevauchement

1. Une tâche = un agent propriétaire = un ensemble de fichiers déclaré avant le début du travail.
2. `project-orchestrator` tient le ledger de verrous dans `docs/11-TASK_BOARD.md` et refuse d'activer une tâche dont un fichier est déjà verrouillé par une tâche `En cours`.
3. Les migrations ne sont jamais touchées par un agent autre que `data-security-agent`.
4. Un agent qui découvre qu'il a besoin de modifier un fichier hors de son périmètre s'arrête et le signale au coordinateur au lieu de le modifier.
5. Dès qu'un dépôt git est initialisé, privilégier une branche par tâche pour tout travail réellement parallèle ; le ledger de verrous reste la référence pour savoir quelles branches peuvent être ouvertes en même temps.
