# Architecture multi-agents

## Mécanisme réel utilisé

Claude Code prend en charge les agents personnalisés via des fichiers Markdown avec en-tête YAML dans `.claude/agents/`. C'est ce mécanisme qui est utilisé ici : chaque agent est un fichier `.claude/agents/<nom>.md` déclarant `name`, `description` et `tools`, invocable depuis la session principale.

### Adaptations par rapport à l'organisation demandée

- **Dépôt git initialisé** (voir `docs/12-INTEGRATION_PROTOCOL.md` §0, git flow sur `https://github.com/thomasgzl/pastry-book.git`). Une branche `feature/*` par tâche reste néanmoins doublée du ledger de verrous ci-dessous, qui reste la référence pour savoir quelles branches peuvent être ouvertes en même temps.
- Les « sous-agents » Claude Code n'ont pas de mémoire partagée automatique entre eux : toute information qu'un agent doit transmettre à un autre passe par un fichier écrit (rapport de livraison dans `docs/11-TASK_BOARD.md` ou commentaire de tâche), jamais par supposition d'un contexte commun.
- Aucun outil natif ne verrouille un fichier au niveau du système. Le verrouillage décrit ici est une convention respectée par les agents et contrôlée par `project-orchestrator`, pas une contrainte technique.

## Décisions techniques (tâche A2, validées par l'utilisateur le 2026-08-14)

| Domaine | Choix |
|---|---|
| Framework | Next.js, App Router |
| Langage | TypeScript strict |
| Interface | Tailwind CSS + composants personnalisés, aucune bibliothèque UI générique |
| Base de données / auth / stockage | Supabase |
| Accès aux données | Client Supabase typé + migrations SQL — pas de Prisma sauf nécessité démontrée |
| Hébergement | Vercel |
| Tests unitaires | Vitest |
| Tests de parcours | Playwright |
| Validation des entrées externes | Zod |
| Extraction IA des recettes | Service serveur, interface indépendante du fournisseur, OpenAI en premier fournisseur |
| Génération d'illustrations | Service serveur, interface indépendante du fournisseur, OpenAI Images en premier fournisseur |
| PDF/DOCX | Extraction de texte locale d'abord, IA pour structurer ensuite ; vision/OCR réservé aux scans/photos/captures |
| Démonstration | Mode déterministe obligatoire, sans clé API ni coût |

`ai-import-agent` et `ai-visuals-agent` possèdent chacun leur propre interface serveur indépendante du fournisseur (un port + un adaptateur OpenAI) ; aucun autre agent n'appelle le SDK OpenAI directement. `data-security-agent` est seul propriétaire du client Supabase et des migrations SQL — introduire un ORM (Prisma ou autre) est une décision produit qui repasse par une validation humaine.

## Rôle de chaque agent

| Agent | Rôle | Périmètre |
|---|---|---|
| `project-orchestrator` | Coordination, découpage, contrôle qualité produit | `docs/10,11,12`, `.claude/agents/*` |
| `frontend-design-agent` | Interface, design system, navigation, responsive mobile-first, PWA | Composants, styles, layouts, routes de présentation, manifeste, service worker |
| `data-security-agent` | Base de données, auth, sécurité | Migrations, politiques d'accès, contrats de données, `visual_assets` (structure) |
| `recipe-search-agent` | Consultation, recherche, coefficient | Pages Entreprises/Recettes/Matières premières/Spécificités, fiche adaptative, calculs |
| `ai-import-agent` | Import Quantara, extraction, classement assisté | Pipeline d'import, OCR, validation JSON, écran de vérification |
| `ai-visuals-agent` | Génération d'illustrations IA | Preset « Botanique éditorial », génération unitaire/lot, galerie de validation |
| `qa-integration-agent` | Validation indépendante et intégration | Plan de tests, rapports, régressions |

Le détail des responsabilités, fichiers possédés et règles impératives de chaque agent est dans son propre fichier `.claude/agents/<nom>.md` — cette table est un résumé, pas la source de vérité.

## Responsabilités tablette, mobile et PWA par agent

Contrainte non négociable (`CLAUDE.md`, détail dans `docs/06-DESIGN_SYSTEM.md`) : mobile-first et tablet-first, tablette = appareil principal. Portée dans le lot B dès les fondations, pas repoussée en fin de projet.

### `frontend-design-agent`

- Travaille en mobile-first ; définit les points de rupture à partir du contenu réel.
- Teste systématiquement téléphone, tablette portrait, tablette paysage et ordinateur.
- Construit des composants tactiles et accessibles (cibles ≥ 44 × 44 px).
- Configure le manifeste et l'expérience d'installation PWA.
- Prévoit les états hors connexion et de mise à jour de version.
- Vérifie les zones sûres iOS/iPadOS.

### `recipe-search-agent`

- Garantit que la fiche recette et le coefficient sont pleinement utilisables sur petit écran.
- Garantit que les listes d'ingrédients ne nécessitent aucun défilement horizontal.
- Garantit que la recherche et les filtres fonctionnent au toucher.
- Préserve l'état de navigation après un retour depuis une recette.

### `ai-import-agent`

- Prévoit l'import depuis les fichiers du téléphone et de la tablette.
- Prévoit la sélection depuis l'appareil photo lorsque la plateforme le permet.
- Construit un écran de vérification utilisable sur tablette.
- Prévoit la reprise d'un lot interrompu par une perte de connexion.

### `qa-integration-agent`

- Refuse une livraison non vérifiée au minimum en : téléphone étroit, iPhone récent, tablette portrait, tablette paysage, ordinateur standard.
- Teste aussi : installation de la PWA, lancement en mode autonome, navigation tactile, rotation de la tablette, présence d'un état hors connexion, reprise après coupure réseau, absence de défilement horizontal, comportement avec le clavier virtuel, tailles des zones tactiles.

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
5. Une branche `feature/*` par tâche pour tout travail réellement parallèle ; le ledger de verrous reste la référence pour savoir quelles branches peuvent être ouvertes en même temps.
