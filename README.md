# Le Grand Livre de Pâtisserie

Base privée destinée à centraliser, retrouver et consulter plus de 600 recettes professionnelles provenant de plusieurs entreprises et formations.

Le produit doit rester simple : il accepte aussi bien une fiche CAP composée uniquement d'ingrédients qu'un dessert à l'assiette contenant des informations complémentaires. Une rubrique vide ne doit jamais être affichée.

## Parcours principal

```text
Accueil
├── Entreprises
│   └── Hennessy (exemple)
│       ├── Desserts à l'assiette
│       ├── Desserts boutique
│       ├── Recettes de base
│       └── Petit-déjeuner
├── Recettes
├── Matières premières
└── Spécificités
```

Hennessy est une entreprise parmi d'autres. Ses sous-catégories lui sont propres et ne deviennent jamais automatiquement des catégories universelles.

## Fonctions essentielles

- Recherche par entreprise, recette, matière première et spécificité.
- Sous-catégories propres à chaque entreprise.
- Fiches adaptatives sans sections vides.
- Ingrédients regroupés en préparations propres à la recette et à sa source.
- Coefficient multiplicateur non destructif.
- Classement des ingrédients et détection d'allergènes assistés par IA.
- Import en lot de fichiers Quantara, idéalement PDF ou Word.
- Photo de réalisation ou illustration culinaire générée à partir d'une photo/description.
- Interface responsive et installable comme application web privée.

## Documentation

- [`CLAUDE.md`](./CLAUDE.md) — instructions permanentes pour Claude Code.
- [`docs/01-PRODUCT_BRIEF.md`](./docs/01-PRODUCT_BRIEF.md) — vision, périmètre et règles produit.
- [`docs/02-INFORMATION_ARCHITECTURE.md`](./docs/02-INFORMATION_ARCHITECTURE.md) — pages, navigation et hiérarchie.
- [`docs/03-USER_FLOWS.md`](./docs/03-USER_FLOWS.md) — parcours de consultation et d'import.
- [`docs/04-DATA_MODEL.md`](./docs/04-DATA_MODEL.md) — modèle de données recommandé.
- [`docs/05-AI_IMPORT.md`](./docs/05-AI_IMPORT.md) — extraction, classement et contrôles IA.
- [`docs/06-DESIGN_SYSTEM.md`](./docs/06-DESIGN_SYSTEM.md) — direction visuelle et composants.
- [`docs/07-MVP_PLAN.md`](./docs/07-MVP_PLAN.md) — ordre de réalisation.
- [`docs/08-ACCEPTANCE_CRITERIA.md`](./docs/08-ACCEPTANCE_CRITERIA.md) — critères permettant de valider le MVP.

## Démarrage avec Claude Code

1. Ouvrir ce dossier comme racine du projet.
2. Demander à Claude Code de lire `CLAUDE.md`, puis l'ensemble de `docs/`, avant toute création de code.
3. Lui demander de proposer le plan de la première phase et l'arborescence technique, sans encore implémenter l'import IA.
4. Valider le plan, puis réaliser les phases dans l'ordre indiqué dans `docs/07-MVP_PLAN.md`.

Prompt conseillé :

> Lis intégralement `CLAUDE.md` et tous les fichiers du dossier `docs`. Résume les contraintes non négociables, propose l'architecture du MVP et un plan d'implémentation par petites étapes vérifiables. Ne code rien avant d'avoir présenté ce plan.

