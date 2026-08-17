/**
 * Preset visuel unique « Botanique éditorial » (tâche E2). Donnée versionnée,
 * source unique du prompt : jamais dupliquée par type d'usage (matière
 * première / recette / entreprise / catégorie). Toute évolution du preset
 * crée une nouvelle version (`v2`, …) sans jamais régénérer automatiquement
 * les visuels déjà stockés sous une version antérieure (`docs/09-AI_VISUALS.md`
 * § Cohérence et versionnement).
 */

export const VISUAL_PRESET_VERSION = "v1";

export type VisualSubjectKind = "ingredient" | "recipe" | "source" | "sourceCategory";
export type RecipeVisualMode = "photo" | "description";
export type VisualRatio = "1:1" | "4:3" | "16:9";
export type VisualBackground = "ivoire" | "transparent";

/** Texte commun, verbatim `docs/09-AI_VISUALS.md` § Preset « Botanique éditorial ». */
const BASE_PROMPT = `Illustration culinaire botanique française, élégante et intemporelle.
Sujet unique immédiatement reconnaissable, composition aérée et centrée.
Trait fin à l'encre olive profond, lavis aquarelle subtil, ombres très douces,
couleurs naturelles légèrement désaturées, détails précis sans photoréalisme dur.
Fond ivoire chaud uniforme ou véritable transparence selon le support.
Esthétique d'un grand livre de pâtisserie haut de gamme, artisanale et éditoriale,
cohérente avec une typographie Bodoni Moda/Karla et une palette cacao/olive/sauge.`;

/** Exclusions explicites, listées séparément du texte libre pour rester vérifiables une à une (tests). */
export const PRESET_EXCLUSIONS = [
  "aucun texte intégré à l'image",
  "aucune lettre ni logo inventé",
  "aucune personne représentée",
  "aucune main représentée",
  "pas de photoréalisme",
  "pas de rose ni de terracotta",
  "pas de décor encombré ni de végétation excessive",
  "aucune marque ni packaging identifiable",
  "aucune vaisselle inutile",
  "aucune ombre lourde",
  "aucun cadre dessiné dans l'image",
  "aucun filigrane",
] as const;

interface SubjectFraming {
  ratio: VisualRatio;
  background: VisualBackground;
  /** `{subject}` est remplacé par le libellé du sujet. */
  instruction: string;
}

/** Cadrage/format par type d'usage — `docs/09-AI_VISUALS.md` § Formats recommandés. */
const FRAMING: Record<VisualSubjectKind, SubjectFraming> = {
  ingredient: {
    ratio: "1:1",
    background: "transparent",
    instruction:
      "Étude botanique isolée de {subject} : la plante, le fruit, la graine, la cabosse ou la gousse entière selon la matière, et une coupe discrète si pertinent. Composition propre à petite échelle, cadrée comme une vignette de carte. Quelques éléments secondaires (feuille, fleur, écorce) tolérés uniquement s'ils facilitent la reconnaissance de {subject} ; jamais un ingrédient voisin ou une variante absente inventée. Aucun ustensile, aucun décor de table.",
  },
  recipe: {
    ratio: "4:3",
    background: "ivoire",
    instruction:
      "Illustration pâtissière éditoriale de la réalisation « {subject} », sujet centré, marge d'environ 8 %. Composition crédible construite uniquement à partir des informations réellement présentes ; cette illustration est une interprétation éditoriale, jamais une photo contractuelle exacte de la composition du dessert réel.",
  },
  source: {
    ratio: "16:9",
    background: "ivoire",
    instruction:
      "Ambiance éditoriale évoquant {subject} : architecture stylisée ou élément végétal/outil discret, espace négatif pour l'interface, sans texte, sans logo réel ou inventé.",
  },
  sourceCategory: {
    ratio: "4:3",
    background: "ivoire",
    instruction: "Symbole culinaire épuré et centré représentant la catégorie « {subject} », marge d'environ 10 %.",
  },
};

/** Indices de symbole par catégorie — `docs/09-AI_VISUALS.md` § Catégorie d'entreprise. Propres à Hennessy pour l'instant, extensible. */
const CATEGORY_SYMBOL_HINTS: Record<string, string> = {
  "desserts-a-lassiette": "un dessert dressé sous cloche ou sur une assiette raffinée",
  "desserts-boutique": "un petit gâteau individuel en présentation vitrine",
  "recettes-de-base": "un fouet, une poche à douille et une préparation en cours",
  "petit-dejeuner": "une viennoiserie raffinée",
};

export function getSubjectFraming(kind: VisualSubjectKind): SubjectFraming {
  return FRAMING[kind];
}

export interface BuildVisualPromptInput {
  kind: VisualSubjectKind;
  subjectLabel: string;
  /** Slug de la catégorie locale, pour affiner le symbole (`sourceCategory` uniquement). */
  categorySlug?: string;
  /** Recette uniquement : photo fournie (préserver la réalisation) ou description seule. */
  recipeMode?: RecipeVisualMode;
  /** Recette uniquement (K7, données `VisualSubject` de K6) : titres de préparation réellement présents. */
  preparationNames?: string[];
  /** Recette uniquement (K7, données `VisualSubject` de K6) : matières premières canoniques dont un ingrédient source est validé (`confirmed`) — jamais les propositions non validées. */
  validatedKeyIngredientNames?: string[];
  /** Recette uniquement (K7, données `VisualSubject` de K6) : information complémentaire réellement saisie, `null`/absente si aucune — jamais inventée. */
  additionalInformation?: string | null;
}

/**
 * Construit le prompt final exact, stocké tel quel avec chaque visuel
 * (`VisualAsset.prompt`) — jamais reconstruit après coup, pour garder une
 * traçabilité exacte de ce qui a été demandé au fournisseur.
 */
export function buildVisualPrompt(input: BuildVisualPromptInput): string {
  const framing = FRAMING[input.kind];
  let instruction = framing.instruction.replace("{subject}", input.subjectLabel);

  if (input.kind === "sourceCategory" && input.categorySlug) {
    const hint = CATEGORY_SYMBOL_HINTS[input.categorySlug];
    if (hint) instruction += ` Représenter ${hint}.`;
  }

  if (input.kind === "recipe") {
    instruction +=
      input.recipeMode === "photo"
        ? " S'appuyer sur la photo fournie : préserver la forme, le montage et les volumes de la réalisation, sans inventer de décor absent."
        : " Représenter uniquement les éléments décrits ; ne pas inventer de décoration complexe absente de la description.";

    const preparations = input.preparationNames?.filter((name) => name.trim().length > 0) ?? [];
    if (preparations.length > 0) {
      instruction += ` Préparations réellement présentes dans la recette, à évoquer si visuellement pertinent : ${preparations.join(", ")}.`;
    }

    const keyIngredients = input.validatedKeyIngredientNames?.filter((name) => name.trim().length > 0) ?? [];
    if (keyIngredients.length > 0) {
      instruction += ` Matières premières validées à représenter fidèlement si elles apparaissent naturellement : ${keyIngredients.join(", ")}. Aucune autre matière première ne doit être suggérée.`;
    }

    if (input.additionalInformation?.trim()) {
      instruction += ` Tenir compte de cette information complémentaire réelle sans en inventer d'autre : « ${input.additionalInformation.trim()} ».`;
    }
  }

  const formatLine = `Format : ratio ${framing.ratio}, fond ${framing.background === "ivoire" ? "ivoire" : "transparent"}.`;
  const exclusionsLine = `Exclusions impératives : ${PRESET_EXCLUSIONS.join(", ")}.`;

  return [BASE_PROMPT.trim(), instruction, formatLine, exclusionsLine].join("\n\n");
}

/** Vue d'ensemble du preset (nom, version, texte commun, exclusions) — utile pour l'affichage/les tests. */
export const VISUAL_PRESET = {
  version: VISUAL_PRESET_VERSION,
  name: "Botanique éditorial",
  basePrompt: BASE_PROMPT.trim(),
  exclusions: PRESET_EXCLUSIONS,
} as const;
