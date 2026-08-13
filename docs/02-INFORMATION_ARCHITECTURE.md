# Architecture de l'information

## Navigation principale

```text
Accueil
├── Entreprises
│   └── Page entreprise
│       └── Catégorie propre à l'entreprise
│           └── Recette
├── Recettes
│   └── Recette
├── Matières premières
│   └── Résultats pour une matière
│       └── Recette
└── Spécificités
    └── Résultats pour une spécificité
        └── Recette
```

## Routes recommandées

Les noms techniques peuvent être adaptés au framework, mais la hiérarchie fonctionnelle doit rester la suivante :

| Page | Route indicative | Contenu principal |
|---|---|---|
| Connexion | `/connexion` | Accès privé |
| Accueil | `/` | Recherche globale et quatre entrées |
| Entreprises | `/entreprises` | Toutes les entreprises/sources |
| Entreprise | `/entreprises/:entreprise` | Catégories propres et dernières recettes |
| Catégorie | `/entreprises/:entreprise/:categorie` | Recettes de cette catégorie |
| Recettes | `/recettes` | Toutes les recettes et filtres simples |
| Recette | `/recettes/:id` | Fiche adaptative et coefficient |
| Matières premières | `/matieres-premieres` | Répertoire des ingrédients canoniques |
| Matière première | `/matieres-premieres/:matiere` | Recettes correspondantes |
| Spécificités | `/specificites` | Vegan, sans gluten, sans lactose… |
| Spécificité | `/specificites/:specificite` | Recettes correspondantes |
| Import | `/importer` | Import en lot et progression |
| Vérification | `/verifier-import/:lot` | Corrections avant validation |

## Accueil

Éléments obligatoires :

- titre « Le Grand Livre de Pâtisserie » ;
- recherche globale ;
- quatre cartes de navigation de poids visuel égal ;
- action Importer, visible mais secondaire.

La page d'accueil n'affiche pas de statistiques, planning ou widgets de gestion.

## Entreprises

La page générale liste toutes les sources, par exemple :

- Hennessy ;
- CAP Pâtissier ;
- Le 7 — Cité du Vin ;
- Peter Coffee Shop ;
- Personnel ;
- autres entreprises à venir.

Chaque carte affiche uniquement : nom, illustration/monogramme facultatif et nombre dynamique de recettes.

### Exemple Hennessy

La page Hennessy peut contenir :

- Desserts à l'assiette ;
- Desserts boutique ;
- Recettes de base ;
- Petit-déjeuner.

Ces catégories ne doivent pas être créées automatiquement chez les autres entreprises. Une catégorie vide n'est pas affichée.

## Recettes

- Recherche par titre.
- Filtres simples fondés sur les données existantes.
- Cartes : visuel, titre, source, catégorie locale et quelques tags d'ingrédients.
- Aucun filtre ne doit être présenté s'il ne possède aucun résultat.

## Matières premières

La page repose sur des ingrédients canoniques. Ainsi, « jus de citron », « zestes de citron » et « purée de citron » peuvent faire remonter la matière « Citron » sans changer le libellé original dans la fiche.

La sélection d'une matière affiche toutes les recettes qui lui sont reliées, quelle que soit leur source.

## Spécificités et allergènes

Les deux notions restent séparées :

- **Spécificités** : vegan, sans gluten, sans lactose…
- **Allergènes** : gluten, œufs, lait, fruits à coque…

Une recette peut être proposée dans une spécificité par l'IA, mais la valeur doit porter un état `proposée` ou `confirmée`.

## Recherche globale

La recherche globale renvoie des groupes distincts :

- Entreprises ;
- Recettes ;
- Matières premières ;
- Catégories d'entreprise.

Le résultat doit indiquer sa source. Une recherche comme « citron » doit retrouver à la fois la matière première Citron et les recettes correspondantes.

