# Parcours utilisateurs

## 1. Parcourir une entreprise

```text
Accueil
→ Par entreprise
→ Liste des entreprises
→ Hennessy
→ Desserts à l'assiette
→ Sélection d'une recette
→ Fiche recette
```

Règle importante : Hennessy est toujours choisi depuis la liste générale des entreprises.

## 2. Rechercher une recette par nom

```text
Accueil
→ Par recette
→ Saisie « cookies »
→ Résultats de toutes les sources
→ Sélection de « Cookies pistache — Maison Durand »
→ Fiche recette
```

Deux recettes portant le même nom restent distinctes et affichent clairement leur source.

## 3. Rechercher par matière première

```text
Accueil
→ Par matière première
→ Citron
→ Recettes contenant une forme de citron
→ Filtres facultatifs par entreprise
→ Fiche recette
```

La normalisation sert à la recherche, mais la fiche conserve « jus de citron », « zestes » ou « purée » tels qu'importés.

## 4. Rechercher par spécificité

```text
Accueil
→ Par spécificité
→ Sans gluten
→ Recettes confirmées puis recettes proposées à vérifier
→ Fiche recette
```

Les allergènes restent accessibles comme filtres séparés. « Sans gluten » ne doit pas être confondu avec une simple absence de mot « farine ».

## 5. Utiliser le coefficient

```text
Fiche recette
→ Choix × 2
→ Recalcul instantané des quantités numériques
→ Quantités originales toujours disponibles
→ Retour × 1 sans modification enregistrée
```

Cas particuliers :

- `1 pincée` peut être multiplié uniquement si une quantité numérique fiable est extraite ;
- `QS`, `PM` ou une quantité illisible restent inchangés et marqués ;
- les unités ne sont pas converties automatiquement dans le MVP.

## 6. Importer des recettes Quantara

```text
Importer
→ Sélection de plusieurs PDF/Word
→ Création d'un lot
→ Extraction automatique
→ Résumé : prêtes / à vérifier / en erreur
→ Correction des seuls champs ambigus
→ Validation
→ Enregistrement des recettes
```

La validation doit pouvoir se faire recette par recette ou en masse pour les recettes sans ambiguïté.

## 7. Importer depuis des images

Parcours de repli :

```text
Importer
→ Sélection de photos/captures
→ Association éventuelle de plusieurs pages à une recette
→ OCR et extraction
→ Vérification obligatoire des champs incertains
→ Validation
```

Le fichier original reste accessible depuis l'écran de vérification pour comparer visuellement.

## 8. Afficher une recette minimale ou détaillée

### Recette CAP minimale

```text
Titre
Source
Préparations et ingrédients
Coefficient
Allergènes/tags disponibles
```

### Dessert à l'assiette détaillé

Même structure, avec un bloc « Informations complémentaires » ajouté uniquement s'il contient réellement du texte.

