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
- [ ] Les quatre parcours fonctionnent sur téléphone étroit, tablette portrait, tablette paysage et ordinateur.
- [ ] Les quantités restent alignées et lisibles sur petit écran.
- [ ] Aucun élément hors périmètre n'apparaît dans l'interface.
- [ ] Aucune page n'a été conçue pour l'ordinateur puis adaptée après coup.
- [ ] Aucun défilement horizontal, sur aucun écran.
- [ ] Toutes les cibles interactives mesurent au moins 44 × 44 px.
- [ ] Aucun comportement essentiel ne dépend du survol de la souris.
- [ ] Un formulaire reste utilisable avec le clavier virtuel ouvert (champ actif non masqué).
- [ ] La rotation de la tablette (portrait ↔ paysage) ne provoque ni perte de saisie ni rupture de mise en page.

## PWA et hors connexion

- [ ] L'application est installable sur iOS/iPadOS, Android et ordinateur.
- [ ] Le manifeste PWA contient nom, nom court, icônes, couleurs et mode `standalone`.
- [ ] L'application se lance en mode autonome après installation, sans barre de navigateur.
- [ ] L'installation n'est jamais imposée pour utiliser l'application dans le navigateur.
- [ ] Une recette déjà chargée reste consultable lors d'une coupure réseau temporaire.
- [ ] Une page de repli claire s'affiche pour un contenu non chargé hors connexion.
- [ ] Une mise à jour de la PWA ne conserve pas indéfiniment une ancienne version en cache.
- [ ] Un import interrompu par une perte de connexion reprend sans créer de doublon.

