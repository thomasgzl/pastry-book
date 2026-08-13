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
10. **Responsive dès le départ.** Les parcours principaux doivent fonctionner sur ordinateur, tablette et mobile.

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

## Choix techniques par défaut

Sauf contrainte déjà présente dans le dépôt :

- TypeScript strict.
- Framework React full-stack stable, rendu responsive et PWA.
- Supabase pour PostgreSQL, authentification et stockage des médias.
- Validation de toutes les entrées externes avec Zod ou équivalent.
- Composants accessibles, navigation clavier et contrastes suffisants.
- Tests unitaires pour les fonctions de calcul et de normalisation.
- Tests de parcours pour la navigation et l'import critique.

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

## Définition de « terminé »

Une tâche n'est terminée que si :

- Le comportement correspond aux documents produit.
- Les états responsive et vides ont été contrôlés.
- Les validations et erreurs sont traitées.
- Les tests pertinents passent.
- La documentation est mise à jour si une décision change.
- Aucun élément hors périmètre n'a été ajouté « pour plus tard » dans l'interface.

