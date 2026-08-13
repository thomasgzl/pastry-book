# Critères d'acceptation du MVP

## Navigation

- [ ] L'accueil affiche exactement quatre entrées principales de même importance.
- [ ] La page Entreprises liste toutes les sources.
- [ ] Hennessy est accessible depuis Entreprises, jamais comme onglet principal.
- [ ] Les catégories visibles dans Hennessy lui appartiennent uniquement.
- [ ] Une catégorie vide n'est pas affichée.
- [ ] Le retour arrière et le fil d'Ariane conservent une navigation cohérente.

## Fiche recette

- [ ] Une recette minimale avec uniquement des ingrédients est complète visuellement.
- [ ] Aucune section vide n'est rendue.
- [ ] Une recette détaillée peut afficher ses informations complémentaires.
- [ ] Le titre et la source sont toujours visibles.
- [ ] Les préparations gardent leur ordre d'origine.
- [ ] Deux préparations homonymes de sources différentes restent indépendantes.

## Coefficient

- [ ] Le coefficient `× 1` restitue toutes les quantités originales.
- [ ] Les boutons `× 0,5`, `× 1,5` et `× 2` calculent correctement les décimaux.
- [ ] Une valeur personnalisée n'accepte qu'un nombre strictement positif.
- [ ] Le calcul ne modifie aucune donnée enregistrée.
- [ ] La quantité originale reste accessible.
- [ ] `QS`, quantité absente ou quantité incertaine ne produit aucune valeur inventée.

## Recherche

- [ ] Une recette est retrouvable par son titre.
- [ ] Une recette est retrouvable par sa source.
- [ ] Une recette utilisant « jus de citron » est retrouvable via « Citron ».
- [ ] Les résultats indiquent toujours leur entreprise/source.
- [ ] Les spécificités et les allergènes sont présentés séparément.
- [ ] L'absence de résultat possède un état clair et utile.

## Import

- [ ] Plusieurs fichiers peuvent être ajoutés à un même lot.
- [ ] Le document original est conservé.
- [ ] Une extraction invalide ne peut pas atteindre la base validée.
- [ ] Les valeurs illisibles apparaissent comme `À vérifier`.
- [ ] L'utilisatrice peut comparer l'original et la proposition.
- [ ] Les recettes sans avertissement peuvent être validées en groupe.
- [ ] Une relance du traitement ne crée pas de doublon silencieux.

## IA et allergènes

- [ ] Une proposition IA porte un statut distinct d'une valeur confirmée.
- [ ] Le libellé original d'un ingrédient est conservé.
- [ ] Les alias confirmés améliorent les imports suivants.
- [ ] Les ingrédients ambigus déclenchent une vérification.
- [ ] Les traces et contaminations croisées ne sont jamais inventées.
- [ ] La génération d'illustration est facultative et ne modifie pas la recette.

## Confidentialité et sécurité

- [ ] Les pages métier ne sont pas accessibles sans authentification.
- [ ] Les médias privés ne sont pas publiquement listables.
- [ ] Aucune clé secrète n'est envoyée au client.
- [ ] Les types et tailles de fichiers sont contrôlés.
- [ ] Les politiques d'accès à la base ont été testées.

## Design et responsive

- [ ] Le thème ivoire, cacao et olive est cohérent sur toutes les pages.
- [ ] Le végétal ne réduit jamais la lisibilité.
- [ ] Les contrastes et focus clavier sont visibles.
- [ ] Les quatre parcours fonctionnent sur mobile.
- [ ] Les quantités restent alignées et lisibles sur petit écran.
- [ ] Aucun élément hors périmètre n'apparaît dans l'interface.

