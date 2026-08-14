# Génération des visuels par IA

## Objectif

Créer automatiquement une bibliothèque d'illustrations homogène pour éviter de chercher ou dessiner manuellement chaque visuel, tout en conservant une identité élégante, végétale et artisanale.

Les objets illustrables sont :

- les matières premières canoniques ;
- les recettes ;
- les entreprises et formations ;
- les catégories propres à une entreprise.

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

- Dessert à l'assiette : dessert dressé sous cloche ou assiette raffinée ;
- Dessert boutique : petit gâteau individuel en présentation vitrine ;
- Recettes de base : fouet, poche à douille et préparation ;
- Petit-déjeuner : viennoiserie raffinée.

Ces associations sont propres à la catégorie concernée et peuvent être modifiées.

## Preset « Botanique éditorial »

### Prompt commun

```text
Illustration culinaire botanique française, élégante et intemporelle.
Sujet unique immédiatement reconnaissable, composition aérée et centrée.
Trait fin à l'encre olive profond, lavis aquarelle subtil, ombres très douces,
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
→ Générer une illustration
→ Aperçu de la proposition
→ Approuver / Régénérer / Rejeter
→ Publication du visuel approuvé
```

Pour une recette, l'utilisatrice choisit d'abord : photo source ou description.

## Génération en lot

Disponible pour les matières premières, entreprises et catégories sans visuel :

1. sélectionner les éléments ;
2. afficher le nombre d'images et une estimation de consommation si disponible ;
3. lancer une file de génération limitée ;
4. présenter une galerie de validation ;
5. approuver individuellement ou en masse les résultats satisfaisants.

Par défaut, un lot ignore tout objet possédant déjà un visuel approuvé. Les recettes ne sont pas illustrées automatiquement au moment de leur import.

## Cohérence et versionnement

- **Référence artistique — preset v1 (lot G, pilote G3)** : le visuel « Citron » réel généré et approuvé le 14/08/2026 (`visual_assets.id = 049a7647-417a-4659-bc15-18845e797ec5`, prompt et preset stockés avec l'asset) sert de référence de STYLE pour toute génération réelle ultérieure de cette version — niveau de détail, finesse du trait, légèreté de l'aquarelle, fond ivoire, quantité d'espace négatif, échelle dans le cadre, palette olive/sauge. Réutilisé verbatim via `PILOT_STYLE_DESCRIPTOR` (`src/app/(app)/visuels/pilotStyleKit.ts`), jamais comme élément de CONTENU des autres sujets.
- Stocker le prompt final exact, le preset et sa version avec chaque image.
- Une modification du preset ne régénère pas les anciennes images automatiquement.
- Permettre plus tard de filtrer les visuels créés avec une ancienne version.
- Ne montrer qu'une image principale approuvée par objet.
- Conserver les variantes rejetées jusqu'à suppression volontaire, ou appliquer une politique de nettoyage explicitement validée.

## Contrôles automatiques

Avant de proposer une image :

- fichier valide et dimensions suffisantes ;
- ratio attendu ;
- aucun texte ou logo détecté si un contrôle est disponible ;
- sujet non coupé ;
- arrière-plan compatible avec la carte ;
- absence de contenu sans rapport avec le sujet.

Un échec de contrôle place l'image en `À vérifier`, jamais en visuel principal.

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

## Contrat des placeholders — Lot C-bis

Tâche `CBV1`. Avant que la génération IA ne soit branchée (lot E), chaque emplacement de futur visuel affiche un asset SVG temporaire, dessiné à la main, dans `public/visuals/placeholders/`. Aucun appel réseau, aucune clé, aucun coût : ce sont des fichiers statiques versionnés.

**Règle de remplacement** : le nom de fichier est stable. Quand un visuel IA approuvé existe pour un objet donné, le composant consommateur bascule son `src` vers l'image réelle stockée (bibliothèque `visual_assets`) ; le placeholder ne sert que de repli (`fallback`) tant qu'aucun visuel approuvé n'existe. Aucun composant ne doit être modifié pour changer un placeholder par un autre — seul le contenu du fichier SVG ou le `src` pointé change.

**Marquage temporaire** : les deux plus grands formats (héro, fiche recette) portent un cadre en pointillés et un petit encart texte « Visuel à générer » en `cacao` à opacité réduite — cohérent avec la règle « aucun texte dans l'image publiée » puisqu'il s'agit justement d'un repli non publié, jamais d'un visuel principal approuvé. Les cartes plus petites (matière première, emblème, ornement) portent un cadre en pointillés discret et un style volontairement schématique (traits fins, pas de texte, taille de rendu trop réduite pour un libellé lisible) plutôt qu'un label — la balise `<title>` du SVG porte la mention « temporaire » pour les lecteurs d'écran et les outils.

Style commun à tous les fichiers : trait fin olive (`#556043`), lavis léger en aplats semi-transparents (`sauge #8C9774`, `laiton #B38A45` en accent rare), fond ivoire (`#F7F3EA`) ou transparent selon le tableau ci-dessous, aucune photo, aucune personne, aucun logo — conforme à `docs/06-DESIGN_SYSTEM.md`.

| Emplacement | Nom logique | Fichier | Dimensions (px) | Ratio | Fond | Comportement responsive | Page / composant |
|---|---|---|---|---|---|---|---|
| Emblème d'accueil | `emblem` | `emblem.svg` | rendu cible 64–96 px carré (viewBox `96×96`) | 1:1 | Transparent | Taille fixe, ne grandit pas avec la mise en page ; remplace le carré « L » (`PlaceholderIllustration`) dans l'en-tête de l'accueil | `src/app/(app)/page.tsx` (tâche `CBF2`) |
| Héro accueil | `hero` | `placeholder-hero.svg` | viewBox `1600×900` | 16:9 (paysage éditorial) | Ivoire | Pleine largeur du conteneur héro, hauteur fluide (`aspect-ratio` CSS) ; recadré/masqué avant le texte sur mobile étroit selon `CBF5`, jamais sous du texte important | `src/app/(app)/page.tsx` (tâche `CBF2`) |
| Visuel de fiche recette | `recipe-4x3` | `placeholder-recipe-4x3.svg` | viewBox `800×600` | 4:3 | Ivoire | Desktop / tablette paysage : ratio 4:3, hauteur limitée, coins arrondis appliqués par le conteneur (pas baké dans le SVG). Mobile / tablette portrait : pleine largeur, coins arrondis, ratio conservé | `src/app/(app)/recettes/[slug]/RecipeSheet.tsx` (tâche `CBF4`) |
| Carte matière première | `botanical-{ingrédient}` | `botanical-lemon.svg`, `botanical-pistachio.svg`, `botanical-vanilla.svg`, `botanical-cacao.svg`, `botanical-pear.svg`, `botanical-hazelnut.svg` | viewBox `200×200` | 1:1 | Transparent (la carte pose son propre fond ivoire/avoine) | Carré léger, remplace `PlaceholderIllustration` dans `CanonicalIngredientCard` ; un fichier par matière première canonique déjà validée (Citron, Pistache, Vanille, Chocolat/Cacao, Poire, Noisette) | `src/components/cards/CanonicalIngredientCard.tsx` |
| Ornement de bordure | `ornament-branch` | `ornament-branch.svg` | viewBox `400×200` | libre (branche horizontale fine) | Transparent | Élément purement décoratif, réutilisable en le pivotant/reflétant en CSS (`transform: rotate() / scaleX(-1)`) autour du héro, en coin de carte ou dans un état vide ; masquable en premier sur mobile étroit s'il gêne la lecture (`CBF5`) | Héro accueil, cartes, `EmptyState` |

**Convention de nommage pour les futures matières premières** : `botanical-{slug-ingrédient}.svg` (slug déjà utilisé pour l'ingrédient canonique). Tant qu'un fichier dédié n'existe pas pour un ingrédient donné, le composant retombe sur le monogramme générique existant (`PlaceholderIllustration`), jamais sur un placeholder d'un autre ingrédient.

**Correspondance avec les futurs visuels IA (lot E)** : quand un visuel est généré et approuvé pour un objet, il est stocké via `visual_assets` avec sa propre URL ; il ne prend jamais le nom d'un fichier de ce dossier. Les fichiers de `public/visuals/placeholders/` ne sont ni régénérés ni écrasés par le lot E — ils restent le repli permanent pour tout objet sans visuel approuvé.

## Hors périmètre initial

- génération automatique sans validation ;
- création de logos ;
- vidéo ou animation ;
- retouche avancée par masque ;
- entraînement d'un modèle personnalisé ;
- génération de toutes les recettes en une seule opération.
