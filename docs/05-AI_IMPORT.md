# Import et assistance IA

## Objectif

Importer des centaines de recettes sans saisie manuelle individuelle, tout en garantissant que l'IA n'invente jamais une information absente ou illisible.

## Formats et priorité

1. PDF exporté depuis Quantara.
2. Word/DOCX exporté depuis Quantara.
3. PDF imprimé ou scanné.
4. Images, photos et captures d'écran.
5. Saisie manuelle pour les exceptions.

L'interface accepte plusieurs fichiers dans un même lot.

Pour un PDF/DOCX exploitable, extraction de texte **locale** d'abord (sans IA), puis appel IA uniquement pour structurer ce texte. La vision/OCR n'est utilisée que pour les scans, photos et captures où le texte n'est pas extractible localement.

Extraction structurée et détection assistée exposées par un service côté serveur, derrière une interface indépendante du fournisseur (port + adaptateur). OpenAI est le premier fournisseur branché ; le code métier n'appelle jamais son SDK directement, ce qui permet de changer ou d'ajouter un fournisseur sans toucher à la logique métier.

## Pipeline

```text
Fichiers originaux
→ Extraction de texte/OCR
→ Détection des limites de recettes
→ Extraction structurée
→ Validation stricte du schéma
→ Normalisation des ingrédients
→ Détection prudente des allergènes et spécificités
→ Détection de doublons
→ Écran de vérification
→ Enregistrement validé
```

## Données extraites

Pour chaque recette :

- titre ;
- entreprise/source ;
- catégorie locale si elle est explicite ou proposée ;
- préparations dans leur ordre ;
- ingrédients dans leur ordre ;
- quantité brute ;
- quantité numérique si certaine ;
- unité ;
- informations complémentaires uniquement si présentes.

## Sortie structurée indicative

```json
{
  "title": "Tarte citron meringuée",
  "source": { "name": "CAP Pâtissier", "status": "confirmed" },
  "sourceCategory": null,
  "sections": [
    {
      "name": "Pâte sucrée",
      "ingredients": [
        {
          "originalName": "Farine T55",
          "originalQuantityText": "250",
          "quantityDecimal": "250",
          "unit": "g",
          "status": "confirmed"
        }
      ]
    }
  ],
  "additionalInformation": null,
  "warnings": []
}
```

Le schéma réel doit être validé strictement. Un champ manquant reste `null`, jamais une chaîne inventée.

## Normalisation des matières premières

L'IA ou les règles proposent une liaison vers un ingrédient canonique :

| Libellé d'origine | Canonique proposé | Tag parent éventuel |
|---|---|---|
| Jus de citron | Citron | Agrumes |
| Zeste de citron jaune | Citron | Agrumes |
| Purée de citron | Citron | Agrumes |
| Pâte de pistache | Pistache | Fruits à coque |

Le libellé original reste affiché dans la recette. Une nouvelle correspondance confirmée peut enrichir le dictionnaire d'alias pour les imports suivants.

## Allergènes

Approche recommandée : règles déterministes d'abord, IA pour les cas ambigus.

Exemples :

- beurre, crème, lait → Lait ;
- farine de blé → Gluten ;
- œuf, blanc d'œuf, jaune d'œuf → Œufs ;
- pistache, noisette, amande → Fruits à coque.

Cas nécessitant une vérification :

- chocolat sans composition ;
- nappage, pâte, préparation ou produit commercial générique ;
- ingrédient illisible ;
- mention « peut contenir » absente de la recette.

Le système ne donne pas de garantie réglementaire et ne déduit jamais les traces ou contaminations croisées.

## Spécificités

Une spécificité comme « Vegan » ou « Sans gluten » ne doit être confirmée automatiquement que si les règles et les données sont suffisantes. Sinon, elle est seulement proposée.

Exemple : l'absence de farine dans une liste incomplète ne suffit pas à confirmer « Sans gluten ».

## Écran de vérification

Afficher :

- document original et proposition côte à côte ;
- champs incertains mis en évidence ;
- raison de l'incertitude ;
- choix de source et catégorie existantes ;
- création contrôlée d'une nouvelle catégorie locale ;
- validation recette par recette ;
- validation groupée des recettes sans avertissement.

## Règles de sécurité et de coût

- Aucun secret d'API côté client.
- Limiter taille, type et nombre de fichiers.
- Traiter l'import en tâche asynchrone.
- Rendre une tâche rejouable sans créer de doublons.
- Journaliser le modèle, la version du schéma et les avertissements.
- Prévoir un mode de démonstration déterministe sans appel payant.

## Illustration IA

Fonction distincte de l'extraction :

- entrée : photo de réalisation ou description ;
- sortie : illustration culinaire botanique cohérente avec le design ;
- toujours conserver la photo originale ;
- ne jamais utiliser l'illustration comme preuve de la composition de la recette ;
- génération à la demande, pas automatiquement pour les 600 recettes.

