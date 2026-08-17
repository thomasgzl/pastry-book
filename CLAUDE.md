# Instructions pour Claude Code

## Mission

Construire « Le Grand Livre de Pâtisserie », une application web privée, responsive et installable, permettant de consulter plus de 600 recettes professionnelles issues de plusieurs entreprises et formations.

Avant toute modification :

1. Lire entièrement ce fichier.
2. Lire tous les fichiers du dossier `docs/`.
3. Examiner le dépôt existant et préserver tout travail déjà présent.
4. Présenter un plan court avant une modification structurelle.

## Principes non négociables

1. **Simplicité avant exhaustivité.** Ne pas transformer le produit en logiciel de production, de stock ou de coût de revient.
2. **Aucune section vide.** Une fiche CAP peut ne contenir que son titre, sa source et ses ingrédients. Les informations complémentaires n'apparaissent que lorsqu'elles existent.
3. **Aucune donnée inventée.** Une quantité, une unité, un ingrédient ou une catégorie incertaine doit être marqué `À vérifier`, jamais complété arbitrairement.
4. **Source intacte.** Conserver le texte et les quantités d'origine. Toute normalisation ou tout calcul est une couche dérivée.
5. **Coefficient non destructif.** Le coefficient modifie uniquement l'affichage. Il ne remplace jamais les quantités enregistrées.
6. **Catégories locales aux entreprises.** Hennessy est une entrée de la page Entreprises. Ses catégories sont propres à Hennessy.
7. **Préparations non globalisées.** Une crème pâtissière Hennessy et une crème pâtissière CAP sont deux préparations indépendantes. Une préparation appartient à une recette précise.
8. **IA supervisée.** L'IA propose une extraction, des ingrédients canoniques, des spécificités et des allergènes. Les cas ambigus passent en validation humaine.
9. **Allergènes prudents.** Ne jamais déduire les traces ou contaminations croisées à partir de la seule recette. Afficher clairement ce qui est détecté et ce qui reste à vérifier.
10. **Mobile-first et tablet-first, non négociable.** L'application est principalement utilisée sur tablette et téléphone en laboratoire. Toute page ou fonctionnalité se conçoit d'abord pour téléphone et tablette, puis s'adapte à l'ordinateur — jamais l'inverse. La tablette est l'appareil principal de consultation. Aucun écran n'est développé « pour desktop d'abord, responsive ensuite ».
11. **PWA installable dès les fondations.** Manifeste complet, service worker et repli hors connexion font partie du lot B (fondations techniques), pas d'une phase de finition. Une recette déjà chargée reste consultable lors d'une coupure réseau temporaire. L'installation ne doit jamais être imposée pour utiliser l'application dans le navigateur.

## Architecture fonctionnelle à respecter

```text
Accueil
├── Entreprises
│   ├── Hennessy
│   │   └── Catégories propres à Hennessy
│   ├── CAP Pâtissier
│   └── Autres entreprises/sources
├── Recettes
├── Matières premières
└── Spécificités
```

Ne jamais présenter Hennessy comme un onglet de premier niveau.

## Contrainte prioritaire : tablette, mobile et PWA

Détail complet dans `docs/06-DESIGN_SYSTEM.md`. Résumé impératif :

- Mobile-first et tablet-first pour toute page, tout composant.
- Fonctionnement complet sur téléphone, tablette et ordinateur — pas de fonction exclusive à un format.
- Cibles tactiles ≥ 44 × 44 px, aucun comportement dépendant du survol souris.
- Aucun défilement horizontal, formulaires utilisables clavier virtuel ouvert.
- PWA installable (iOS/iPadOS, Android, ordinateur) sans que l'installation soit obligatoire pour utiliser l'app dans le navigateur.
- Manifeste complet, service worker, page de repli hors connexion, mise à jour de version sans conserver indéfiniment une ancienne version en cache.
- Rotation tablette portrait/paysage sans perte de saisie ni rupture de mise en page.

## Périmètre du MVP

- Authentification privée simple.
- Accueil et quatre accès principaux.
- Liste des entreprises, page d'une entreprise et catégories locales.
- Liste/recherche des recettes et fiche recette adaptative.
- Répertoire des matières premières normalisées.
- Répertoire des spécificités et filtres d'allergènes distincts.
- Coefficient `× 0,5`, `× 1`, `× 1,5`, `× 2` et valeur personnalisée positive.
- Import en lot avec écran de vérification avant enregistrement.
- Ajout d'une photo et emplacement prévu pour une illustration IA.

## Hors périmètre tant que le MVP n'est pas validé

- Planning de production, J-1/J-2, minuteurs ou mode cuisine.
- Stocks, fournisseurs, coûts, marges, commandes et étiquettes.
- Durées de conservation.
- Difficulté, notation, saison idéale et matériel obligatoire.
- Valeurs nutritionnelles.
- Préparations globales partagées entre les entreprises.
- Application mobile native séparée.

## Git et dépôt distant

Dépôt : `https://github.com/thomasgzl/pastry-book.git`. Modèle git flow (`main`, `develop`, `feature/*`, `release/*`, `hotfix/*`) décrit dans `docs/12-INTEGRATION_PROTOCOL.md`.

**Autorisation permanente** : à chaque tâche terminée et validée, ou à chaque fin de lot, commit et `git push` sur `origin` directement, sans redemander confirmation — validé une fois pour toutes par l'utilisateur le 2026-08-13. Ceci ne couvre jamais `push --force`, `reset --hard` sur une branche partagée, ni la suppression d'une branche `main`/`develop` : ces actions restent soumises à confirmation explicite.

## Choix techniques (décidés, tâche A2 validée le 2026-08-14)

- Framework : Next.js, App Router, version stable au moment de l'installation.
- TypeScript strict.
- Interface : Tailwind CSS + composants personnalisés adaptés à la direction artistique. Pas de bibliothèque UI générique (Material, Chakra, Ant…) qui dénaturerait le design.
- Supabase : PostgreSQL, authentification, stockage privé des médias.
- Accès aux données : client Supabase typé + migrations SQL. Pas de Prisma sauf nécessité technique démontrée et validée par l'utilisateur.
- Hébergement cible : Vercel.
- Tests unitaires : Vitest. Tests de parcours : Playwright.
- Validation de toutes les entrées externes avec Zod.
- Composants accessibles, navigation clavier et contrastes suffisants.
- Extraction IA des recettes et génération d'illustrations : deux services côté serveur, chacun derrière une interface indépendante du fournisseur. OpenAI comme premier fournisseur (texte pour l'extraction, OpenAI Images pour les visuels) ; le code métier ne dépend jamais directement du SDK du fournisseur.
- Aucun appel IA ni aucune clé secrète depuis le navigateur.
- Mode démonstration déterministe obligatoire : développer et tester sans clé API ni consommation payante.
- PDF/DOCX : extraction de texte locale d'abord lorsque c'est possible, IA ensuite pour structurer. Vision/OCR réservé aux scans, photos et captures.
- Génération de visuels jamais automatique en masse ; à la demande ou en lot explicitement confirmé, toujours validée avant publication.

Ne pas fixer une version de dépendance sans vérifier la version stable disponible dans le projet au moment de l'installation.

## Règles d'implémentation

- Écrire de petits composants cohérents, pas une page monolithique.
- Séparer données sources et données dérivées.
- Stocker les quantités en décimal, jamais en `float` binaire.
- Centraliser les unités, les alias d'ingrédients et les règles allergènes.
- Prévoir la recherche sans dépendre de l'IA à chaque requête.
- Ne jamais exposer les clés privées au navigateur.
- L'import doit être asynchrone, rejouable et traçable.
- Toute suppression doit demander confirmation.
- Fournir des états : chargement, aucun résultat, erreur et `À vérifier`.
- Utiliser des données de démonstration clairement identifiées comme fictives.

## Économie de tests (protocole permanent)

Remplace toute exigence antérieure de validation complète après chaque tranche ou chaque livraison. Détail complet dans `docs/12-INTEGRATION_PROTOCOL.md` §9. Résumé impératif :

- Niveau 1 (pendant le développement) : tests ciblés sur le module modifié uniquement. Jamais la suite complète, jamais Playwright, jamais `qa-integration-agent` à ce niveau.
- Niveau 2 (checkpoint intermédiaire, fin d'un ensemble cohérent de fonctionnalités) : typecheck, lint, tests unitaires des domaines modifiés, smoke test téléphone + tablette portrait. `qa-integration-agent` intervient une seule fois, à ce moment.
- Niveau 3 (fin de lot, avant fusion majeure, avant mise en production, ou modification transversale des contrats/auth/BDD/navigation) : suite complète, cinq profils responsive, validation finale par `qa-integration-agent`.
- Aucun rapport détaillé pour un test réussi ; aucun agent supplémentaire pour répéter une vérification déjà faite ; aucun test pour une modification purement documentaire ou pour la production de captures ; maximum deux tentatives de correction autonome sur une même erreur avant de signaler un blocage.

## Définition de « terminé »

Une tâche n'est terminée que si :

- Le comportement correspond aux documents produit.
- Les états responsive et vides ont été contrôlés sur téléphone étroit, tablette portrait, tablette paysage et ordinateur.
- Les validations et erreurs sont traitées.
- Les tests pertinents passent.
- La documentation est mise à jour si une décision change.
- Aucun élément hors périmètre n'a été ajouté « pour plus tard » dans l'interface.

