# Plan de réalisation du MVP

## Principe de livraison

Construire par tranches verticales vérifiables. Ne pas commencer par l'IA. Le produit doit d'abord fonctionner avec des données de démonstration et quelques recettes saisies manuellement.

## Phase 0 — Initialisation

- Examiner le dépôt existant.
- Initialiser TypeScript strict et la qualité de code.
- Configurer variables d'environnement et exemple sans secret.
- Préparer structure de pages, composants, services et tests.
- Configurer le thème visuel et les polices, en mobile-first.
- Configurer le manifeste PWA (nom, nom court, icônes, couleurs, mode `standalone`, écran de démarrage).
- Mettre en place le service worker et la page de repli hors connexion.
- Définir les points de rupture à partir de contenus réels (carte, fiche, liste).

**Validation :** l'application démarre, une page témoin responsive utilise le thème sur téléphone/tablette/ordinateur, la PWA est installable et fonctionne hors connexion pour une page déjà chargée, les contrôles de qualité passent.

## Phase 1 — Navigation et design

- Connexion privée minimale, utilisable au clavier virtuel.
- Accueil avec les quatre entrées, mobile-first.
- Page Entreprises générale.
- Page Hennessy comme exemple imbriqué.
- Pages Recettes, Matières premières et Spécificités.
- Navigation mobile et tablette (portrait et paysage), zones tactiles ≥ 44 × 44 px.

Utiliser des données fictives explicitement marquées.

**Validation :** aucun lien principal ne mène à une impasse, Hennessy est bien imbriqué sous Entreprises, la navigation est testée sur téléphone étroit, tablette portrait, tablette paysage et ordinateur, sans défilement horizontal.

## Phase 2 — Base de données

- Créer les migrations selon `04-DATA_MODEL.md`.
- Activer les politiques d'accès privé.
- Ajouter un petit jeu de données de développement.
- Construire la couche d'accès typée.

**Validation :** les données visibles proviennent de la base et l'accès non authentifié est bloqué.

## Phase 3 — Consultation des recettes

- Fiche adaptative.
- Préparations et ingrédients ordonnés.
- Absence totale de rubriques vides.
- Affichage photo/illustration facultatif.
- Allergènes, matières clés et informations complémentaires facultatifs.

**Validation :** tester une recette CAP minimale et un dessert à l'assiette détaillé, sur téléphone, tablette portrait, tablette paysage et ordinateur, sans défilement horizontal.

## Phase 4 — Coefficient

- Raccourcis et valeur personnalisée.
- Calcul avec décimaux.
- Formatage lisible des résultats.
- Affichage permanent de la source originale.
- Gestion de `QS`, quantité absente et `À vérifier`.

**Validation :** tests unitaires couvrant décimaux, fractions normalisées, coefficients invalides et quantité nulle.

## Phase 5 — Recherche et filtres

- Recherche globale groupée.
- Recherche par entreprise, recette et matière canonique.
- Filtres par catégorie locale.
- Spécificités séparées des allergènes.
- États sans résultat.

**Validation :** « citron » retrouve les alias reliés sans modifier leurs libellés originaux.

## Phase 6 — Import sans IA

- Téléversement multiple, y compris depuis les fichiers et l'appareil photo du téléphone/tablette.
- Création et suivi d'un lot, reprenable après coupure réseau.
- Écran de vérification utilisable sur tablette.
- Saisie/correction manuelle structurée.
- Enregistrement validé et conservation du document original.

**Validation :** un lot de plusieurs recettes peut être traité sans IA ni clé payante, l'écran de vérification est testé sur tablette portrait et paysage, un lot interrompu par une coupure réseau reprend sans doublon.

## Phase 7 — Extraction et classement IA

- Extraction PDF/Word puis OCR image.
- Schéma strict et valeurs `null`.
- Normalisation des ingrédients.
- Règles allergènes, puis assistance IA pour ambiguïtés.
- Suggestions de catégorie et de spécificité.
- Validation groupée des éléments sûrs.

**Validation :** l'IA ne peut pas enregistrer directement une recette non validée et aucun champ illisible n'est inventé.

## Phase 8 — Illustration IA

- Téléversement d'une photo ou saisie d'une description.
- Génération explicite à la demande.
- Conservation simultanée photo + illustration.
- État d'attente, erreur et nouvelle tentative.

**Validation :** la génération reste totalement facultative et indépendante des données de recette.

## Après le MVP

À décider uniquement après usage réel : favoris, comparateur de recettes, collections personnelles, export/impression ou application native.

