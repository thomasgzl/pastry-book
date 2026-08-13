# Direction artistique et design system

## Intention

Fusionner deux univers :

- l'élégance éditoriale d'un grand livre de pâtisserie ;
- une dimension végétale, naturelle et artisanale.

Le résultat doit rester professionnel, intime, chaleureux et intemporel. Le végétal est un accent, jamais la structure de l'interface.

## Mots-clés

Élégant · Épuré · Chaleureux · Professionnel · Artisanal · Botanique · Privé · Intemporel

## Palette proposée

| Usage | Couleur | Valeur indicative |
|---|---|---|
| Fond principal | Ivoire chaud | `#F7F3EA` |
| Surface | Blanc coquille | `#FFFCF6` |
| Surface secondaire | Beige avoine | `#E8DDCC` |
| Texte principal | Brun cacao | `#3B291F` |
| Action/navigation | Vert olive profond | `#556043` |
| Accent secondaire | Sauge | `#8C9774` |
| Accent rare | Laiton ancien | `#B38A45` |
| Bordures | Beige grisé | `#D8CDBD` |
| Erreur/à vérifier | Brun rouge discret | `#8A4F45` |

Les valeurs peuvent être ajustées pour atteindre les contrastes d'accessibilité. Éviter le rose, le terracotta vif et les grands aplats sombres.

## Typographies

- Titres : **Bodoni Moda** ou serif éditoriale équivalente.
- Interface et texte : **Karla** ou sans-serif humaniste équivalente.
- Quantités : chiffres tabulaires pour aligner les colonnes.

Limiter le nombre de graisses et préserver des tailles confortables sur mobile.

## Illustrations et images

- Dessins botaniques à trait fin olive : citronnier, pistachier, vanille, cacao, poire, noisette.
- Utilisation en bordure, dans les cartes de matières premières ou autour d'une pâtisserie.
- Photos de pâtisseries avec lumière douce et fond neutre.
- Possibilité de fondre une moitié photo dans une moitié illustration IA.
- Ne pas utiliser de fleurs décoratives en excès.
- Ne pas utiliser de logo officiel d'une entreprise ; préférer un monogramme ou une illustration d'ambiance.

## Mise en page

- Grille aérée et surfaces ivoire.
- Cartes avec bordure fine, rayon modéré et ombre très légère.
- Espacement plus important que la décoration.
- Sur ordinateur : contenu centré avec largeur maximale lisible.
- Sur mobile : cartes empilées et zones tactiles d'au moins 44 px.

## Composants essentiels

### Carte d'entrée principale

Icône au trait, titre et éventuellement quelques tags. Les quatre cartes de l'accueil ont le même poids visuel.

### Carte entreprise

Nom, visuel facultatif, nombre dynamique de recettes et flèche. Hennessy n'a pas de traitement structurel différent des autres entreprises.

### Carte catégorie d'entreprise

Nom, nombre de recettes, visuel et action « Voir les recettes ». N'existe que dans la page de l'entreprise concernée.

### Carte recette

Visuel, titre, source, catégorie locale et un maximum de deux tags d'ingrédients. Pas de temps, difficulté, notation ou conservation.

### Carte matière première

Illustration botanique, nom canonique et nombre de recettes.

### Fiche recette

Ordre recommandé :

1. titre et source ;
2. photo/illustration si disponible ;
3. coefficient ;
4. préparations et ingrédients ;
5. allergènes détectés et ingrédients clés ;
6. informations complémentaires seulement si présentes.

### Coefficient

- Boutons `× 0,5`, `× 1`, `× 1,5`, `× 2`.
- Champ personnalisé accessible.
- Quantité calculée mise en avant.
- Quantité originale visible dans un ton secondaire.
- Valeur `À vérifier` non calculée.

### État « À vérifier »

Badge discret mais visible, accompagné d'une explication. Ne pas se contenter de la couleur.

## Contrainte prioritaire : tablette, mobile et PWA

L'application est principalement utilisée sur tablette et téléphone, en laboratoire. Conception **mobile-first et tablet-first**, puis adaptation à l'ordinateur. Contrainte non négociable, voir `CLAUDE.md`.

- L'intégralité du projet est responsive ; toutes les pages et fonctionnalités marchent sur téléphone, tablette et ordinateur.
- Aucun écran n'est développé pour desktop puis adapté à la fin.
- La tablette est l'appareil principal de consultation.
- Application installable en PWA sur iOS, iPadOS, Android et ordinateur.
- Manifeste PWA complet : nom, nom court, icônes, couleurs, mode `standalone`, écran de démarrage lorsque la plateforme le permet.
- Service worker et page de repli claire en cas de perte de connexion.
- Une recette déjà chargée reste consultable lors d'une coupure réseau temporaire.
- L'installation de la PWA n'est jamais imposée pour utiliser l'application dans le navigateur.
- Les mises à jour de la PWA sont gérées sans conserver indéfiniment une ancienne version en cache.

## Expérience tactile

- Cibles interactives ≥ 44 × 44 px.
- Aucun comportement dépendant uniquement du survol souris.
- Boutons du coefficient facilement utilisables au doigt.
- Navigation et retour arrière évidents.
- Champs et claviers mobiles adaptés au contenu (`type="number"`, `type="tel"`, etc.).
- Quantités parfaitement lisibles et alignées.
- Absence de défilement horizontal.
- Formulaires utilisables avec le clavier virtuel ouvert (champ actif non masqué).
- Prise en compte des zones sûres des appareils mobiles (encoche, barre de gestes — `env(safe-area-inset-*)`).
- Illustrations décoratives réduites ou masquées lorsqu'elles gênent la lecture.

## Comportement selon l'écran

### Téléphone

- Navigation compacte.
- Cartes empilées verticalement.
- Recherche rapidement accessible.
- Fiche recette en une seule colonne.
- Coefficient visible avant la liste des ingrédients.
- Quantités et unités lisibles sans zoom.
- Actions principales accessibles au pouce.

### Tablette — support prioritaire

- Mise en page utilisant efficacement l'espace disponible.
- Consultation confortable en orientation portrait et paysage.
- Recette avec ses ingrédients affichable sans densité excessive.
- Éléments tactiles jamais trop petits lorsque plusieurs colonnes sont utilisées.
- Changement d'orientation sans perte de saisie ni rupture de mise en page.

### Ordinateur

- Utiliser l'espace supplémentaire sans étirer excessivement les textes.
- Conserver une largeur de lecture confortable.
- Ne pas ajouter de fonction exclusivement disponible sur ordinateur.

## Points de rupture

Définis à partir du contenu réel (où une carte, une fiche ou une liste casse visuellement), pas de valeurs arbitraires imposées à l'avance. Vérification systématique sur : téléphone étroit, tablette portrait, tablette paysage, ordinateur standard.

## Ce que le design ne doit pas devenir

- tableau de bord d'entreprise ;
- interface de stock ou ERP ;
- carnet rustique surchargé ;
- magazine illisible ;
- galerie décorative où la recherche passe au second plan.

