# Modèle de données recommandé

## Principes

- La donnée importée originale est immuable.
- Les quantités normalisées, tags et allergènes sont dérivés.
- Une préparation appartient à une seule recette.
- Une catégorie appartient à une seule entreprise/source.
- Un ingrédient canonique sert à la recherche sans remplacer le texte original.
- Tous les éléments proposés par l'IA possèdent un état de vérification.

## Entités principales

### `sources`

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `name` | texte | Obligatoire, ex. Hennessy |
| `slug` | texte | Unique |
| `description` | texte nullable | Facultatif |
| `illustration_url` | texte nullable | Facultatif |
| `created_at` | timestamp | Automatique |

Une formation comme CAP Pâtissier est traitée comme une source afin de conserver une navigation uniforme.

### `source_categories`

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `source_id` | UUID | Obligatoire |
| `name` | texte | Ex. Desserts boutique |
| `slug` | texte | Unique à l'intérieur de la source |
| `position` | entier | Ordre d'affichage |

Contrainte unique recommandée : `(source_id, slug)`.

### `recipes`

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `source_id` | UUID | Obligatoire |
| `source_category_id` | UUID nullable | Facultatif, doit appartenir à la même source |
| `title` | texte | Obligatoire |
| `slug` | texte | Identifiant lisible, non utilisé seul comme clé métier |
| `additional_information` | texte nullable | Procédés/notes lorsqu'ils existent |
| `original_document_url` | texte nullable | Source importée |
| `photo_url` | texte nullable | Réalisation originale |
| `illustration_url` | texte nullable | Illustration IA |
| `import_status` | enum | `draft`, `needs_review`, `validated` |
| `created_at` | timestamp | Automatique |
| `updated_at` | timestamp | Automatique |

### `recipe_sections`

Représente une préparation à l'intérieur d'une recette.

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `recipe_id` | UUID | Obligatoire |
| `name` | texte nullable | Ex. Crème citron ; nullable pour une liste simple |
| `position` | entier | Ordre d'origine |
| `original_text` | texte nullable | Conservation de la source brute |

Ne pas créer de table de préparations globales dans le MVP.

### `recipe_ingredients`

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `recipe_section_id` | UUID | Obligatoire |
| `original_name` | texte | Libellé intact |
| `canonical_ingredient_id` | UUID nullable | Liaison proposée/confirmée |
| `original_quantity_text` | texte nullable | Ex. `1/2`, `QS`, illisible |
| `quantity_decimal` | décimal nullable | Uniquement si fiable |
| `unit` | texte nullable | g, kg, ml, pièce… |
| `position` | entier | Ordre d'origine |
| `verification_status` | enum | `confirmed`, `proposed`, `needs_review` |
| `confidence` | décimal nullable | Métadonnée technique |

Le calcul du coefficient utilise exclusivement `quantity_decimal`, sans modifier `original_quantity_text`.

### `canonical_ingredients`

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `name` | texte | Ex. Citron |
| `slug` | texte | Unique |
| `parent_id` | UUID nullable | Hiérarchie éventuelle, ex. Agrumes |

### `ingredient_aliases`

| Champ | Type indicatif | Règle |
|---|---|---|
| `id` | UUID | Clé primaire |
| `canonical_ingredient_id` | UUID | Obligatoire |
| `alias` | texte | Ex. jus de citron |
| `normalized_alias` | texte | Accent/casse normalisés |
| `status` | enum | `confirmed`, `proposed` |

### `specificities`

Exemples initiaux : Vegan, Sans gluten, Sans lactose.

### `recipe_specificities`

Relation recette/spécificité avec :

- `status`: `confirmed`, `proposed`, `rejected` ;
- `reason`: justification courte facultative ;
- `source`: `manual`, `rule`, `ai`.

### `allergens`

Référentiel configurable des allergènes utilisés par le produit.

### `ingredient_allergens`

Relation entre ingrédient canonique et allergène, avec un état de confirmation. Les produits composés ou commerciaux peuvent rester `needs_review`.

### `recipe_allergens`

Vue calculée ou table dérivée permettant un affichage rapide. Ne pas y inclure automatiquement les traces ou contaminations croisées.

### `import_batches` et `import_items`

Conserver : fichier source, état, erreurs, extraction brute, proposition normalisée, date et validation finale. Un lot contient plusieurs recettes.

## Invariants de base de données

- Une catégorie reliée à une recette appartient à la même source que la recette.
- Une section ne peut appartenir qu'à une recette.
- Une quantité négative est interdite.
- Un coefficient n'est pas stocké dans la recette source.
- La suppression d'une source contenant des recettes est bloquée ou explicitement en cascade après confirmation forte.
- Les documents originaux ne sont jamais remplacés par le JSON extrait.

