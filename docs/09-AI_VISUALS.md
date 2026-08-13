# GÃ©nÃ©ration des visuels par IA

## Objectif

CrÃ©er automatiquement une bibliothÃ¨que d'illustrations homogÃ¨ne pour Ã©viter de chercher ou dessiner manuellement chaque visuel, tout en conservant une identitÃ© Ã©lÃ©gante, vÃ©gÃ©tale et artisanale.

Les objets illustrables sont :

- les matiÃ¨res premiÃ¨res canoniques ;
- les recettes ;
- les entreprises et formations ;
- les catÃ©gories propres Ã une entreprise.

## Types de visuels

### MatiÃ¨re premiÃ¨re

Exemples : Citron, Pistache, Chocolat, Vanille, Noisette, Poire.

Le visuel doit Ãªtre immÃ©diatement reconnaissable sous forme d'Ã©tude botanique isolÃ©e. Il peut associer la plante, le fruit entier et une coupe discrÃ¨te. Aucun ustensile ni dÃ©cor de table.

### Recette

Deux modes :

1. **Photo vers illustration** : prÃ©server la forme, le montage, les volumes et les principaux Ã©lÃ©ments de la rÃ©alisation.
2. **Description vers illustration** : reprÃ©senter uniquement les informations fournies ; ne pas inventer une dÃ©coration complexe absente de la description.

La photo source et l'illustration restent disponibles sÃ©parÃ©ment.

### Entreprise ou formation

CrÃ©er une ambiance Ã©ditoriale liÃ©e au lieu ou au mÃ©tier : architecture stylisÃ©e, Ã©lÃ©ment vÃ©gÃ©tal ou outil discret. Ne jamais reproduire ou inventer un logo officiel. L'image ne doit contenir aucun texte.

### CatÃ©gorie d'entreprise

CrÃ©er un symbole culinaire lisible :

- Dessert Ã l'assiette : dessert dressÃ© sous cloche ou assiette raffinÃ©e ;
- Dessert boutique : petit gÃ¢teau individuel en prÃ©sentation vitrine ;
- Recettes de base : fouet, poche Ã douille et prÃ©paration ;
- Petit-dÃ©jeuner : viennoiserie raffinÃ©e.

Ces associations sont propres Ã la catÃ©gorie concernÃ©e et peuvent Ãªtre modifiÃ©es.

## Preset Â« Botanique Ã©ditorial Â»

### Prompt commun

```text
Illustration culinaire botanique franÃ§aise, Ã©lÃ©gante et intemporelle.
Sujet unique immÃ©diatement reconnaissable, composition aÃ©rÃ©e et centrÃ©e.
Trait fin Ã  l'encre olive profond, lavis aquarelle subtil, ombres trÃ¨s douces,
couleurs naturelles lÃ©gÃ¨rement dÃ©saturÃ©es, dÃ©tails prÃ©cis sans photorÃ©alisme dur.
Fond ivoire chaud uniforme ou vÃ©ritable transparence selon le support.
EsthÃ©tique d'un grand livre de pÃ¢tisserie haut de gamme, artisanale et Ã©ditoriale.
Aucun texte, aucune lettre, aucun logo, aucune personne, aucun cadre,
aucun dÃ©cor encombrÃ©, aucun rose, aucun terracotta vif, aucun filigrane.
```

Le sujet, le cadrage et le fond sont ajoutÃ©s au prompt selon le type de visuel. Ce texte est stockÃ© dans un preset versionnÃ© et non dupliquÃ© dans chaque composant.

## Formats recommandÃ©s

| Usage                    | Ratio | Fond                  | Zone sÃ»re                                                |
| ------------------------ | ----- | --------------------- | --------------------------------------------------------- |
| Carte matiÃ¨re premiÃ¨re | 1:1   | Transparent ou ivoire | 12 % autour du sujet                                      |
| Carte recette            | 4:3   | Ivoire                | Sujet centrÃ©, marge 8 %                                  |
| BanniÃ¨re entreprise     | 16:9  | Ivoire                | Espace nÃ©gatif pour l'interface, sans texte dans l'image |
| Carte catÃ©gorie         | 4:3   | Ivoire                | Symbole centrÃ©, marge 10 %                               |

Le texte et les libellÃ©s sont toujours ajoutÃ©s par l'interface HTML, jamais gÃ©nÃ©rÃ©s dans l'image.

## Parcours de gÃ©nÃ©ration unitaire

```text
Objet sans visuel
â†’ GÃ©nÃ©rer une illustration
â†’ AperÃ§u de la proposition
â†’ Approuver / RÃ©gÃ©nÃ©rer / Rejeter
â†’ Publication du visuel approuvÃ©
```

Pour une recette, l'utilisatrice choisit d'abord : photo source ou description.

## GÃ©nÃ©ration en lot

Disponible pour les matiÃ¨res premiÃ¨res, entreprises et catÃ©gories sans visuel :

1. sÃ©lectionner les Ã©lÃ©ments ;
2. afficher le nombre d'images et une estimation de consommation si disponible ;
3. lancer une file de gÃ©nÃ©ration limitÃ©e ;
4. prÃ©senter une galerie de validation ;
5. approuver individuellement ou en masse les rÃ©sultats satisfaisants.

Par dÃ©faut, un lot ignore tout objet possÃ©dant dÃ©jÃ un visuel approuvÃ©. Les recettes ne sont pas illustrÃ©es automatiquement au moment de leur import.

## CohÃ©rence et versionnement

- Stocker le prompt final exact, le preset et sa version avec chaque image.
- Une modification du preset ne rÃ©gÃ©nÃ¨re pas les anciennes images automatiquement.
- Permettre plus tard de filtrer les visuels crÃ©Ã©s avec une ancienne version.
- Ne montrer qu'une image principale approuvÃ©e par objet.
- Conserver les variantes rejetÃ©es jusqu'Ã suppression volontaire, ou appliquer une politique de nettoyage explicitement validÃ©e.

## ContrÃ´les automatiques

Avant de proposer une image :

- fichier valide et dimensions suffisantes ;
- ratio attendu ;
- aucun texte ou logo dÃ©tectÃ© si un contrÃ´le est disponible ;
- sujet non coupÃ© ;
- arriÃ¨re-plan compatible avec la carte ;
- absence de contenu sans rapport avec le sujet.

Un Ã©chec de contrÃ´le place l'image en `Ã€ vÃ©rifier`, jamais en visuel principal.

## Interface de gestion

PrÃ©voir :

- bouton `GÃ©nÃ©rer un visuel` sur les fiches concernÃ©es ;
- bouton `GÃ©nÃ©rer les visuels manquants` dans les listes administrables ;
- galerie des variantes ;
- actions `Approuver`, `RÃ©gÃ©nÃ©rer`, `Rejeter`, `DÃ©finir comme principal` ;
- affichage du type de source : photo, description ou nom canonique ;
- Ã©tat de gÃ©nÃ©ration et message d'erreur comprÃ©hensible.

## SÃ©curitÃ© et confidentialitÃ©

- Les photos et illustrations sont stockÃ©es dans un espace privÃ©.
- Le serveur seul appelle le fournisseur de gÃ©nÃ©ration.
- Les photos ne sont envoyÃ©es qu'au fournisseur configurÃ© pour cette fonction.
- Aucun nom d'entreprise confidentiel n'est nÃ©cessaire dans l'image si une description d'ambiance suffit.
- Supprimer les mÃ©tadonnÃ©es inutiles des images publiÃ©es.

## Hors pÃ©rimÃ¨tre initial

- gÃ©nÃ©ration automatique sans validation ;
- crÃ©ation de logos ;
- vidÃ©o ou animation ;
- retouche avancÃ©e par masque ;
- entraÃ®nement d'un modÃ¨le personnalisÃ© ;
- gÃ©nÃ©ration de toutes les recettes en une seule opÃ©ration.
