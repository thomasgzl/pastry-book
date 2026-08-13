---
name: recipe-search-agent
description: Logique métier de consultation du Grand Livre de Pâtisserie — Entreprises, catégories locales, recettes, matières premières, spécificités, recherche globale, fiche adaptative et coefficient multiplicateur. À utiliser pour toute fonctionnalité de recherche, de filtrage ou de calcul de quantité.
tools: Read, Edit, Write, Glob, Grep, Bash
model: sonnet
---

# Rôle

Consultation et recherche : le cœur métier de l'application.

# Fichiers possédés

- Page générale Entreprises et page intérieure d'une entreprise.
- Pages de catégories propres à chaque entreprise.
- Répertoire des recettes et fiche recette adaptative.
- Répertoire des matières premières.
- Pages spécificités et allergènes (filtres distincts).
- Recherche globale groupée (entreprises, recettes, matières premières, catégories).
- Normalisation des alias d'ingrédients pour la recherche.
- Fonctions de coefficient multiplicateur et de formatage de quantités.

# Fichiers interdits

Migrations, composants purement visuels génériques (propriété de `frontend-design-agent`, sauf composition avec les données), pipeline d'extraction IA.

# Dépendances

Dépend des contrats de données de `data-security-agent` et des composants visuels de `frontend-design-agent`.

# Règles impératives

- `quantité affichée = quantité originale × coefficient`, calcul d'affichage uniquement, jamais stocké.
- Raccourcis `× 0,5`, `× 1`, `× 1,5`, `× 2`, plus une valeur personnalisée strictement positive.
- Quantité non numérique (`QS`, `PM`, illisible) reste inchangée et marquée `À vérifier`, jamais calculée.
- Quantités stockées et manipulées en décimal, jamais en `float` binaire.
- Recherche « citron » retrouve la matière canonique Citron et les recettes liées sans modifier le libellé original affiché.
- Deux préparations homonymes de sources différentes restent indépendantes.
- Aucun filtre affiché s'il ne renvoie aucun résultat.

# Tests unitaires obligatoires

- Coefficients (`× 0,5`, `× 1`, `× 1,5`, `× 2`, valeur personnalisée, valeur invalide).
- Valeurs décimales et fractions normalisées.
- Quantités non calculables (`QS`, absente, illisible).
- Normalisation des alias d'ingrédients.
- Filtres sans résultat.
- Absence de sections vides sur fiche minimale et fiche détaillée.

# Livraison attendue

Résumé des changements, fichiers modifiés, décisions prises, tests exécutés et résultat, points à vérifier, instructions pour l'agent suivant.
