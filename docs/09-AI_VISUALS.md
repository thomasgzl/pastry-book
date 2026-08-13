# Génération des visuels par IA

## Objectif

Créer automatiquement une bibliothèque d'illustrations homogène pour éviter de chercher ou dessiner manuellement chaque visuel, tout en conservant une identité élégante, végétale et artisanale.

Les objets illustrables sont :

- les matières premières canoniques ;
- les recettes ;
- les entreprises et formations ;
- les catégories propres � une entreprise.

## Types de visuels

### Matière première

Exemples : Citron, Pistache, Chocolat, Vanille, Noisette, Poire.

Le visuel doit être immédiatement reconnaissable sous forme d'étude botanique isolée. Il peut associer la plante, le fruit entier et une coupe discrète. Aucun ustensile ni décor de table.

### Recette

Deux modes :

1. **Photo vers illustration** : préserver la forme, le montage, les volumes et les principaux éléments de la réalisation.
2. **Description vers illustration** : représenter uniquement les informations fournies ; ne pas inventer une décoration complexe absente de la description.

La photo source et l'illustration restent disponibles séparément.

### Entreprise ou formation

Créer une ambiance éditoriale liée au lieu ou au métier : architecture stylisée, élément végétal ou outil discret. Ne jamais reproduire ou inventer un logo officiel. L'image ne doit contenir aucun texte.

### Catégorie d'entreprise

Créer un symbole culinaire lisible :

- Dessert � l'assiette : dessert dressé sous cloche ou assiette raffinée ;
- Dessert boutique : petit gâteau individuel en présentation vitrine ;
- Recettes de base : fouet, poche � douille et préparation ;
- Petit-déjeuner : viennoiserie raffinée.

Ces associations sont propres � la catégorie concernée et peuvent être modifiées.

## Preset « Botanique éditorial »

### Prompt commun

```text
Illustration culinaire botanique française, élégante et intemporelle.
Sujet unique immédiatement reconnaissable, composition aérée et centrée.
Trait fin �  l'encre olive profond, lavis aquarelle subtil, ombres très douces,
couleurs naturelles légèrement désaturées, détails précis sans photoréalisme dur.
Fond ivoire chaud uniforme ou véritable transparence selon le support.
Esthétique d'un grand livre de pâtisserie haut de gamme, artisanale et éditoriale.
Aucun texte, aucune lettre, aucun logo, aucune personne, aucun cadre,
aucun décor encombré, aucun rose, aucun terracotta vif, aucun filigrane.
```

Le sujet, le cadrage et le fond sont ajoutés au prompt selon le type de visuel. Ce texte est stocké dans un preset versionné et non dupliqué dans chaque composant.

## Formats recommandés

| Usage                    | Ratio | Fond                  | Zone sûre                                                |
| ------------------------ | ----- | --------------------- | --------------------------------------------------------- |
| Carte matière première | 1:1   | Transparent ou ivoire | 12 % autour du sujet                                      |
| Carte recette            | 4:3   | Ivoire                | Sujet centré, marge 8 %                                  |
| Bannière entreprise     | 16:9  | Ivoire                | Espace négatif pour l'interface, sans texte dans l'image |
| Carte catégorie         | 4:3   | Ivoire                | Symbole centré, marge 10 %                               |

Le texte et les libellés sont toujours ajoutés par l'interface HTML, jamais générés dans l'image.

## Parcours de génération unitaire

```text
Objet sans visuel
�  Générer une illustration
�  Aperçu de la proposition
�  Approuver / Régénérer / Rejeter
�  Publication du visuel approuvé
```

Pour une recette, l'utilisatrice choisit d'abord : photo source ou description.

## Génération en lot

Disponible pour les matières premières, entreprises et catégories sans visuel :

1. sélectionner les éléments ;
2. afficher le nombre d'images et une estimation de consommation si disponible ;
3. lancer une file de génération limitée ;
4. présenter une galerie de validation ;
5. approuver individuellement ou en masse les résultats satisfaisants.

Par défaut, un lot ignore tout objet possédant déj� un visuel approuvé. Les recettes ne sont pas illustrées automatiquement au moment de leur import.

## Cohérence et versionnement

- Stocker le prompt final exact, le preset et sa version avec chaque image.
- Une modification du preset ne régénère pas les anciennes images automatiquement.
- Permettre plus tard de filtrer les visuels créés avec une ancienne version.
- Ne montrer qu'une image principale approuvée par objet.
- Conserver les variantes rejetées jusqu'� suppression volontaire, ou appliquer une politique de nettoyage explicitement validée.

## Contrôles automatiques

Avant de proposer une image :

- fichier valide et dimensions suffisantes ;
- ratio attendu ;
- aucun texte ou logo détecté si un contrôle est disponible ;
- sujet non coupé ;
- arrière-plan compatible avec la carte ;
- absence de contenu sans rapport avec le sujet.

Un échec de contrôle place l'image en `ì vérifier`, jamais en visuel principal.

## Interface de gestion

Prévoir :

- bouton `Générer un visuel` sur les fiches concernées ;
- bouton `Générer les visuels manquants` dans les listes administrables ;
- galerie des variantes ;
- actions `Approuver`, `Régénérer`, `Rejeter`, `Définir comme principal` ;
- affichage du type de source : photo, description ou nom canonique ;
- état de génération et message d'erreur compréhensible.

## Sécurité et confidentialité

- Les photos et illustrations sont stockées dans un espace privé.
- Le serveur seul appelle le fournisseur de génération, derrière une interface indépendante du fournisseur (port + adaptateur). OpenAI Images est le premier fournisseur branché ; le code métier n'appelle jamais son SDK directement.
- Les photos ne sont envoyées qu'au fournisseur configuré pour cette fonction.
- Aucun nom d'entreprise confidentiel n'est nécessaire dans l'image si une description d'ambiance suffit.
- Supprimer les métadonnées inutiles des images publiées.

## Hors périmètre initial

- génération automatique sans validation ;
- création de logos ;
- vidéo ou animation ;
- retouche avancée par masque ;
- entraînement d'un modèle personnalisé ;
- génération de toutes les recettes en une seule opération.
