# Product brief

## Vision

Créer un livre de recettes numérique personnel, privé et élégant pour centraliser plus de 600 recettes accumulées dans différentes entreprises et formations.

L'application n'est pas un outil de gestion de laboratoire. Sa valeur est de permettre de retrouver rapidement la bonne recette, de consulter fidèlement ses ingrédients et d'en adapter les quantités.

## Problème à résoudre

Les recettes sont nombreuses, issues de sources différentes et de niveaux de détail très variables :

- certaines recettes CAP contiennent uniquement les ingrédients ;
- certaines recettes d'entreprise contiennent plusieurs préparations ;
- certains desserts à l'assiette possèdent des informations complémentaires détaillées ;
- plusieurs préparations portent le même nom sans avoir la même composition selon leur entreprise ;
- les recettes actuellement présentes dans Quantara doivent pouvoir être récupérées sans 600 saisies manuelles.

## Utilisatrice principale

Une pâtissière professionnelle qui connaît le vocabulaire métier et veut un outil personnel, rapide et fiable. Le produit doit privilégier la consultation et la recherche, pas l'explication pédagogique.

## Proposition de valeur

> Toutes mes recettes professionnelles, fidèlement conservées et immédiatement retrouvables par source, produit, ingrédient ou besoin alimentaire.

## Fonctions prioritaires

### 1. Trouver

- par entreprise ou formation ;
- par nom/type de recette ;
- par matière première normalisée ;
- par spécificité alimentaire ;
- par allergène détecté, dans un espace distinct des spécificités.

### 2. Comprendre la provenance

Chaque recette possède une source obligatoire. Les catégories sont créées à l'intérieur d'une entreprise/source et peuvent différer d'une entreprise à l'autre.

### 3. Consulter une fiche adaptative

Champs minimaux :

- titre ;
- entreprise/source ;
- une ou plusieurs préparations ;
- ingrédients, quantités et unités.

Champs facultatifs :

- photo ;
- illustration IA ;
- informations complémentaires ;
- spécificités ;
- allergènes détectés ;
- tags de matières premières.

Un champ facultatif vide n'est pas rendu.

### 4. Adapter les quantités

Le coefficient est un calcul d'affichage :

```text
quantité affichée = quantité originale × coefficient
```

- Valeur par défaut : `1`.
- Raccourcis : `0,5`, `1`, `1,5`, `2`.
- Une valeur personnalisée positive est autorisée.
- Les quantités originales restent consultables.
- Une quantité non numérique demeure `À vérifier` et n'est pas calculée.

### 5. Importer sans tout ressaisir

Priorité aux exports PDF/Word de Quantara. Les images et captures sont une solution de repli. L'import se fait en lot et produit une proposition à valider avant son entrée dans la base.

## Différence entre concepts proches

| Concept | Exemple | Règle |
|---|---|---|
| Entreprise/source | Hennessy, CAP Pâtissier | Niveau de provenance obligatoire |
| Catégorie d'entreprise | Desserts boutique | N'existe qu'à l'intérieur de sa source |
| Recette | Tarte citron meringuée | Fiche consultable |
| Préparation | Crème citron | Partie d'une recette, jamais globale par défaut |
| Matière première canonique | Citron | Sert à la recherche malgré les variantes de nom |
| Spécificité | Vegan, sans gluten | Propriété alimentaire recherchable |
| Allergène | Œufs, lait | Détection prudente à partir des ingrédients |

## Indicateurs qualitatifs de réussite

- Une recette peut être retrouvée en quelques actions depuis chacun des quatre axes.
- Une recette pauvre en informations reste visuellement aboutie.
- Une recette riche reste lisible sans imposer ses rubriques aux autres.
- Aucun original n'est altéré par le classement ou le coefficient.
- Après un import en lot, l'utilisatrice ne vérifie que les éléments ambigus.

