# Protocole d'intégration

## 0. Modèle de branches (git flow)

Dépôt : `https://github.com/thomasgzl/pastry-book.git`.

- `main` — toujours déployable, reflète l'état validé du produit.
- `develop` — branche d'intégration, reçoit chaque tâche terminée et validée par le QA.
- `feature/<lot>-<id>-<résumé>` — une branche par tâche du tableau (ex. `feature/b3-schema-recettes`), partant de `develop`, fusionnée dans `develop` une fois `Terminée`.
- `release/<version>` — ouverte à la fin d'un lot complet (A à F), le temps de la stabilisation avant fusion dans `main`.
- `hotfix/<résumé>` — correction urgente sur `main`, fusionnée à la fois dans `main` et `develop`.

Commit : un ou plusieurs commits par tâche, message préfixé par l'ID du tableau (`B3: crée le schéma recettes`).

**Commit/push automatique** : à chaque tâche terminée et validée par `qa-integration-agent`, ou à chaque fin de lot, l'agent (ou `project-orchestrator`) commit et pousse directement sur `origin` sans redemander confirmation à chaque fois — autorisation donnée une fois pour toutes par l'utilisateur (voir `CLAUDE.md`). Un `git push --force` reste interdit sans confirmation explicite.

## 1. Démarrage d'une tâche

1. L'agent lit sa propre définition (`.claude/agents/<nom>.md`), `CLAUDE.md` et les fichiers de `docs/` pertinents à la tâche.
2. L'agent vérifie dans `docs/11-TASK_BOARD.md` que la tâche est au statut `Prête` et que ses dépendances sont `Terminée`.
3. L'agent vérifie le ledger de verrous : si un fichier qu'il doit modifier apparaît déjà, il ne démarre pas et signale un conflit à `project-orchestrator`.
4. Si tout est libre, `project-orchestrator` passe la tâche à `En cours` et ajoute une ligne au ledger de verrous avec la liste exacte des fichiers concernés.

## 2. Réservation des fichiers

- La réservation se fait par déclaration explicite dans le ledger de `docs/11-TASK_BOARD.md`, pas par un mécanisme automatique.
- Un agent ne réserve que les fichiers listés dans la tâche assignée. Besoin d'un fichier supplémentaire → retour à `project-orchestrator` avant modification, pas d'extension silencieuse.
- Le dépôt est initialisé (git flow, voir section 0). Chaque tâche `En cours` doit correspondre à sa propre branche `feature/<lot>-<id>-<résumé>` partant de `develop`, et le ledger sert à savoir quelles branches sont ouvertes simultanément.

## 3. Rendu du travail

Chaque livraison contient obligatoirement :

- résumé des changements ;
- liste exacte des fichiers modifiés ;
- décisions prises (notamment celles non explicitement couvertes par la documentation) ;
- tests exécutés et leur résultat ;
- limites ou points à vérifier ;
- instructions pour l'agent suivant.

L'agent retire ensuite sa ligne du ledger de verrous et passe sa tâche au statut `À vérifier`.

## 4. Vérification par le QA

Le périmètre de vérification (niveau 1, 2 ou 3, voir §9) est fixé avant que `qa-integration-agent` démarre. Il ne relance jamais systématiquement l'ensemble par défaut — le niveau du checkpoint en cours détermine ce qu'il exécute.

`qa-integration-agent` :

1. Convertit les critères pertinents de `docs/08-ACCEPTANCE_CRITERIA.md` en cas de test concrets pour la tâche.
2. Exécute les tests prévus par le niveau du checkpoint (§9) et vérifie manuellement les critères non automatisables (absence de section vide, cohérence visuelle, non-invention de donnée).
2bis. Dès qu'une route protégée existe (auth, proxy), lance au moins une vérification HTTP réelle (`npm run dev` + `curl`/requête directe, pas seulement build/typecheck/lint/tests) sur une route censée être bloquée. Leçon du lot C : `middleware.ts` (convention Next.js 15) a cessé d'être exécuté après la migration Next 16 vers `proxy.ts`, sans aucune erreur ni échec de build/lint/test — seule une requête HTTP réelle l'a révélé. Aucun test automatisé existant ne couvre ce type de régression silencieuse de configuration serveur.
3. Rédige un rapport pass/fail par critère.
4. Si tout passe : tâche proposée à `Terminée`. Si un défaut est trouvé : tâche renvoyée à `Bloquée` avec le défaut assigné à l'agent propriétaire — le QA ne corrige pas lui-même, sauf correction minuscule explicitement qualifiée comme telle dans son rapport.

## 5. Intégration par le coordinateur

`project-orchestrator` :

1. Confirme que le rapport QA est positif ou que les corrections mineures signalées sont résolues.
2. Vérifie que la tâche respecte les principes non négociables de `CLAUDE.md` (aucune section vide, aucune donnée inventée, Hennessy sous Entreprises, catégories locales, préparations non globalisées, coefficient non destructif, IA supervisée, allergènes prudents, responsive, hors périmètre absent).
3. Passe la tâche à `Terminée` dans `docs/11-TASK_BOARD.md`.
4. Met à jour les dépendances : les tâches qui n'attendaient que celle-ci passent à `Prête`.
5. À la fin d'un lot complet, présente un résumé à l'utilisateur et attend sa validation avant d'ouvrir le lot suivant.

## 6. Gestion des conflits

- **Deux agents veulent le même fichier au même moment** : le premier inscrit dans le ledger a priorité ; le second passe `Bloquée` jusqu'à libération.
- **Un agent découvre qu'une tâche déjà `Terminée` doit être modifiée** : il ne modifie pas directement — il signale la reprise nécessaire à `project-orchestrator`, qui rouvre une tâche dédiée avec son propre verrou.
- **Deux agents proposent des décisions contradictoires sur un contrat commun** : `project-orchestrator` tranche, ou remonte à l'utilisateur si la documentation ne permet pas de trancher.

## 7. Retour en arrière sans détruire le travail existant

- Chaque tâche correspond à un commit ou une petite série de commits nommés `<ID tâche>: <résumé>` sur sa branche `feature/*`. Un retour en arrière se fait par `git revert`, jamais par `reset --hard` ou `push --force` sans confirmation explicite de l'utilisateur.
- Une suppression de donnée ou de fichier demande toujours confirmation, conformément à `CLAUDE.md`.

## 8. Quand demander une validation humaine

- Fin de chaque lot (A à F), avant le lot suivant.
- Toute décision produit absente de `CLAUDE.md` ou de `docs/`.
- Tout choix d'architecture technique non encore fixé (framework, hébergement, fournisseurs IA).
- Toute migration destructrice ou suppression en cascade.
- Passage de l'import manuel à l'import assisté par IA.
- Premier lot de génération d'illustrations en masse.
- Tout conflit que `project-orchestrator` ne peut trancher avec la documentation existante.

## 9. Économie de tests (protocole permanent)

Remplace toute exigence antérieure de validation complète après chaque tranche ou chaque livraison — y compris la mention historique d'un QA systématique « après chaque lot, pas uniquement en fin de projet » et l'exigence des cinq profils pour toute livraison dans `docs/10-AGENT_ARCHITECTURE.md`. Trois niveaux, jamais mélangés à la légère.

**Niveau 1 — pendant le développement.** Après une modification isolée : tests unitaires du module modifié (`npm run test:target`), lint des fichiers modifiés, un test fonctionnel ciblé seulement si le parcours concerné a changé. Jamais la suite Vitest complète, jamais Playwright, jamais les cinq profils, jamais de build complet, jamais `qa-integration-agent` à ce niveau.

**Niveau 2 — checkpoint intermédiaire.** À la fin d'un ensemble cohérent de fonctionnalités, pas après chaque commit : typecheck, lint, tests unitaires des domaines modifiés, un smoke test Playwright téléphone + tablette portrait — appareil principal (`npm run test:smoke`). `qa-integration-agent` intervient une seule fois à ce checkpoint, avec un périmètre précis annoncé à l'avance. Ne pas tester les cinq profils sauf si un problème responsive est détecté pendant le smoke test.

**Niveau 3 — fin de lot.** Réservé à la fin d'un lot validable, avant une fusion majeure, avant mise en production, ou après une modification transversale touchant les contrats, l'authentification, la base de données ou la navigation générale. Alors seulement : typecheck, lint complet, tests unitaires complets, build, Playwright sur les cinq profils (`npm run test:full`), validation finale par `qa-integration-agent`.

Règles transverses :

- Un seul agent travaille sur une tâche ; `qa-integration-agent` n'intervient qu'aux checkpoints de niveau 2 et 3, jamais à chaque micro-modification.
- Aucun deuxième agent n'est lancé pour répéter une vérification déjà faite par l'agent actif.
- Aucun test lorsqu'une modification concerne uniquement la documentation ou la production de captures.
- Maximum deux tentatives de correction autonome sur une même erreur ; au-delà, signaler le blocage plutôt que d'insister.
- Les rapports ne détaillent jamais les tests réussis un par un : fichiers modifiés, tests exécutés, résultat, limite éventuelle, dix lignes maximum.
