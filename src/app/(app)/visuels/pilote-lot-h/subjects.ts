/**
 * Sept sujets du pilote lot H (validation des 3 autres familles visuelles +
 * extension matières premières manquantes) — chaque prompt est le texte
 * fourni verbatim par l'utilisatrice, complété uniquement par les
 * contraintes techniques communes (format carré, fond ivoire opaque,
 * exclusions). Citron/Pistache ne sont JAMAIS injectés comme contenu ici —
 * seulement leurs caractéristiques de style déjà capturées dans les prompts
 * fournis (finesse du trait, aquarelle légère, espace négatif, échelle).
 */

import { getCanonicalIngredientBySlug } from "@/lib/data/canonical-ingredients";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getRecipeBySlug } from "@/lib/data/recipes";
import { getSourceBySlug } from "@/lib/data/sources";
import type { VisualSubjectKind } from "@/lib/visuals/preset";
import { getPrimaryVisualAsset } from "@/lib/visuals/storage";

export type LotHGroup = "ingredient" | "recipe" | "source" | "sourceCategory";

export const LOT_H_GROUP_LABELS: Record<LotHGroup, string> = {
  ingredient: "Matières premières",
  recipe: "Recette",
  source: "Entreprise",
  sourceCategory: "Catégorie",
};

interface LotHSubjectDef {
  key: string;
  group: LotHGroup;
  /** Ex. « carte matière première », « fiche recette » — affiché dans la galerie de présentation. */
  contextLabel: string;
  promptBody: string;
  exclusions: readonly string[];
}

const SUBJECT_DEFS: LotHSubjectDef[] = [
  {
    key: "tarte-au-citron",
    group: "recipe",
    contextLabel: "Fiche recette",
    promptBody: `Illustration éditoriale raffinée d'une tarte au citron de pâtisserie française, vue légèrement de trois quarts. Pâte sucrée fine et régulière, crème citron jaune pâle, décor élégant de petites pointes de meringue légèrement dorées. Trait délicat à l'encre olive, aquarelle légère et peu saturée, rendu artisanal haut de gamme, composition centrée et aérée, fond ivoire chaud parfaitement uniforme.`,
    exclusions: ["pas de texte", "pas de logo", "pas d'assiette", "pas de couverts", "pas de mains", "pas de décor de cuisine", "pas de photoréalisme", "pas de miettes excessives", "pas de fruits ou fleurs ajoutés inutilement"],
  },
  {
    key: "ambiance-hennessy",
    group: "source",
    contextLabel: "Bannière entreprise",
    promptBody: `Illustration éditoriale élégante évoquant une grande maison de cognac française : façade patrimoniale discrète, quelques lignes de vigne et une touche d'ambre rappelant le cognac, composition architecturale et botanique très légère. Trait fin à l'encre olive, aquarelle subtile dans des tons ivoire, sauge, cacao et ambre ancien, atmosphère raffinée, professionnelle et intemporelle, beaucoup d'espace négatif.`,
    exclusions: ["aucun logo", "aucun mot Hennessy dans l'image", "aucune bouteille identifiable", "aucune étiquette", "aucun blason inventé", "aucune personne", "pas de publicité", "pas de photoréalisme", "pas de grand château imaginaire spectaculaire"],
  },
  {
    key: "recettes-de-base",
    group: "sourceCategory",
    contextLabel: "Carte catégorie",
    promptBody: `Illustration éditoriale minimaliste représentant les fondamentaux de la pâtisserie : un fouet fin, une poche à douille souple, une gousse de vanille et un petit motif abstrait de crème fouettée. Composition harmonieuse et très aérée, trait à l'encre olive, aquarelle légère ivoire, beige et sauge, esprit carnet technique de pâtisserie française haut de gamme.`,
    exclusions: ["aucun texte", "aucun livre avec écriture", "aucune recette lisible", "aucune personne", "aucun plan de travail chargé", "pas de photoréalisme", "pas de multiplication excessive des ustensiles"],
  },
  {
    key: "chocolat",
    group: "ingredient",
    contextLabel: "Carte matière première",
    promptBody: `Illustration botanique éditoriale raffinée de quelques morceaux de chocolat noir accompagnés d'une cabosse de cacao discrètement ouverte et de quelques fèves. Trait fin à l'encre olive, aquarelle légère dans des tons cacao profonds et naturels, composition élégante, aérée et peu chargée, fond ivoire chaud uniforme.`,
    exclusions: ["tablette avec logo ou inscription", "emballage", "coulures excessives", "décor de cuisine", "photoréalisme"],
  },
  {
    key: "vanille",
    group: "ingredient",
    contextLabel: "Carte matière première",
    promptBody: `Illustration botanique éditoriale raffinée de deux gousses de vanille souples, dont une légèrement ouverte laissant apparaître quelques grains, accompagnées d'une fleur de vanillier très discrète. Trait fin à l'encre olive, aquarelle légère dans des tons brun profond, crème et sauge, composition délicate et aérée, fond ivoire chaud uniforme.`,
    exclusions: ["flacon d'extrait", "texte", "accumulation de fleurs", "photoréalisme", "composition tropicale chargée"],
  },
  {
    key: "noisette",
    group: "ingredient",
    contextLabel: "Carte matière première",
    promptBody: `Illustration botanique éditoriale raffinée de quelques noisettes entières et ouvertes, avec une noisette décortiquée et deux feuilles discrètes. Trait fin à l'encre olive, aquarelle légère dans des tons beige, brun doux et sauge, composition naturelle et aérée, fond ivoire chaud uniforme.`,
    exclusions: ["pâte à tartiner", "emballage", "accumulation excessive", "photoréalisme"],
  },
  {
    key: "poire",
    group: "ingredient",
    contextLabel: "Carte matière première",
    promptBody: `Illustration botanique éditoriale raffinée d'une poire entière accompagnée d'une demi-poire délicatement coupée et d'une feuille discrète. Trait fin à l'encre olive, aquarelle légère dans des tons vert sauge, jaune doux et beige, composition élégante et aérée, fond ivoire chaud uniforme.`,
    exclusions: ["assiette", "couteau", "panier", "décor de table", "photoréalisme"],
  },
];

const GROUP_TO_KIND: Record<LotHGroup, VisualSubjectKind> = {
  ingredient: "ingredient",
  recipe: "recipe",
  source: "source",
  sourceCategory: "sourceCategory",
};

export interface LotHSubject {
  key: string;
  group: LotHGroup;
  kind: VisualSubjectKind;
  subjectId: string;
  label: string;
  contextLabel: string;
  prompt: string;
  /** `true` si un visuel approuvé/principal existe déjà pour ce sujet au moment de la lecture — jamais généré, jamais dupliqué. */
  alreadyApproved: boolean;
}

const FORMAT_LINE = "Format : carré 1:1, fond ivoire opaque parfaitement uniforme (jamais transparent — non pris en charge par le modèle).";

function assemblePrompt(def: LotHSubjectDef): string {
  const exclusionsLine = `Exclusions impératives : ${def.exclusions.join(", ")}.`;
  return [def.promptBody, FORMAT_LINE, exclusionsLine].join("\n\n");
}

/**
 * Résout dynamiquement les 7 sujets (id réel + statut d'approbation actuel)
 * — appelée à l'affichage de la confirmation ET à nouveau juste avant
 * chaque appel réel (défense en profondeur contre une approbation
 * survenue entre-temps). Un sujet introuvable dans le référentiel est omis
 * (jamais un identifiant inventé).
 */
export async function resolveLotHSubjects(): Promise<LotHSubject[]> {
  const hennessy = getSourceBySlug("hennessy");
  const results: LotHSubject[] = [];

  for (const def of SUBJECT_DEFS) {
    let subjectId: string | null = null;
    let label = "";

    if (def.key === "tarte-au-citron") {
      const recipe = getRecipeBySlug("tarte-au-citron-hennessy");
      if (recipe) {
        subjectId = recipe.id;
        label = recipe.title;
      }
    } else if (def.key === "ambiance-hennessy") {
      if (hennessy) {
        subjectId = hennessy.id;
        label = hennessy.name;
      }
    } else if (def.key === "recettes-de-base") {
      const category = hennessy ? getCategoryBySlug(hennessy.id, "recettes-de-base") : undefined;
      if (category) {
        subjectId = category.id;
        label = category.name;
      }
    } else {
      const ingredient = getCanonicalIngredientBySlug(def.key);
      if (ingredient) {
        subjectId = ingredient.id;
        label = ingredient.name;
      }
    }

    if (!subjectId) continue; // sujet introuvable dans le référentiel — jamais inventé, simplement omis.

    const kind = GROUP_TO_KIND[def.group];
    results.push({
      key: def.key,
      group: def.group,
      kind,
      subjectId,
      label,
      contextLabel: def.contextLabel,
      prompt: assemblePrompt(def),
      alreadyApproved: Boolean(await getPrimaryVisualAsset(kind, subjectId)),
    });
  }

  return results;
}
