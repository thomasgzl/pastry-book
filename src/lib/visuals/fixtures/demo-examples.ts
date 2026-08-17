/**
 * Cinq exemples de référence, mode démonstration UNIQUEMENT (tâche E4) :
 * Citron, Pistache, Tarte au citron, ambiance Hennessy, catégorie
 * « Recettes de base ». Aucun appel réel : chaque image est produite par le
 * même moteur déterministe que `demoImageProvider`
 * (`src/lib/ai/visuals/demo-provider.ts`), simplement appelé directement ici
 * au chargement du module — comme `src/lib/demo/data.ts` pour le reste de
 * l'application, ce sont des données de démonstration figées, pas une
 * génération automatique déclenchée par l'IA (CLAUDE.md : "génération à la
 * demande, jamais automatique").
 *
 * Statuts volontairement variés pour couvrir les trois états visibles dans
 * la galerie : Pistache illustre explicitement le cycle rejeté -> régénéré
 * (un premier essai rejeté, un second en brouillon en attente de
 * validation) ; Hennessy reste en brouillon (ambiance sensible côté logo,
 * validation humaine requise avant publication) ; les trois autres sont déjà
 * approuvés et principaux.
 */

import { canonicalIngredients, recipes, sourceCategories, sources } from "@/lib/demo/data";
import type { VisualAsset } from "@/lib/domain/schemas";
import { renderDemoIllustrationSvg } from "@/lib/ai/visuals/demo-provider";
import { buildVisualPrompt, getSubjectFraming, VISUAL_PRESET_VERSION } from "@/lib/visuals/preset";
import type { RecipeVisualMode, VisualSubjectKind } from "@/lib/visuals/preset";

function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function demoAsset(params: {
  id: string;
  subjectType: VisualSubjectKind;
  subjectId: string;
  subjectLabel: string;
  status: VisualAsset["status"];
  isPrimary: boolean;
  createdAt: string;
  sourcePhotoUrl?: string | null;
  categorySlug?: string;
  recipeMode?: RecipeVisualMode;
}): VisualAsset {
  const prompt = buildVisualPrompt({
    kind: params.subjectType,
    subjectLabel: params.subjectLabel,
    categorySlug: params.categorySlug,
    recipeMode: params.recipeMode,
  });
  const framing = getSubjectFraming(params.subjectType);

  return {
    id: params.id,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    status: params.status,
    isPrimary: params.isPrimary,
    imageUrl: toDataUri(renderDemoIllustrationSvg(prompt, framing.ratio)),
    sourcePhotoUrl: params.sourcePhotoUrl ?? null,
    prompt,
    presetVersion: VISUAL_PRESET_VERSION,
    createdAt: params.createdAt,
  };
}

// Sujets démo réutilisés depuis src/lib/demo/data.ts (mêmes ids que le reste
// de l'application, jamais recréés) — ne jamais fusionner avec seed.sql.
const citron = canonicalIngredients.find((ingredient) => ingredient.slug === "citron")!;
const pistache = canonicalIngredients.find((ingredient) => ingredient.slug === "pistache")!;
const tarteAuCitron = recipes.find((recipe) => recipe.slug === "tarte-au-citron-hennessy")!;
const hennessy = sources.find((source) => source.slug === "hennessy")!;
const recettesDeBase = sourceCategories.find(
  (category) => category.slug === "recettes-de-base" && category.sourceId === hennessy.id,
)!;

export const DEMO_VISUAL_ASSETS: VisualAsset[] = [
  demoAsset({
    id: "00000000-0000-4000-8000-000000009901",
    subjectType: "ingredient",
    subjectId: citron.id,
    subjectLabel: "Citron",
    status: "approved",
    isPrimary: true,
    createdAt: "2026-08-14T09:00:00.000Z",
  }),
  demoAsset({
    id: "00000000-0000-4000-8000-000000009902",
    subjectType: "ingredient",
    subjectId: pistache.id,
    subjectLabel: "Pistache",
    status: "rejected",
    isPrimary: false,
    createdAt: "2026-08-14T09:05:00.000Z",
  }),
  demoAsset({
    id: "00000000-0000-4000-8000-000000009903",
    subjectType: "ingredient",
    subjectId: pistache.id,
    subjectLabel: "Pistache",
    status: "draft",
    isPrimary: false,
    createdAt: "2026-08-14T09:10:00.000Z",
  }),
  demoAsset({
    id: "00000000-0000-4000-8000-000000009904",
    subjectType: "recipe",
    subjectId: tarteAuCitron.id,
    subjectLabel: "Tarte au citron",
    status: "approved",
    isPrimary: true,
    createdAt: "2026-08-14T09:15:00.000Z",
    sourcePhotoUrl: tarteAuCitron.photoUrl,
    recipeMode: "photo",
  }),
  demoAsset({
    id: "00000000-0000-4000-8000-000000009905",
    subjectType: "source",
    subjectId: hennessy.id,
    subjectLabel: "Hennessy",
    status: "draft",
    isPrimary: false,
    createdAt: "2026-08-14T09:20:00.000Z",
  }),
  demoAsset({
    id: "00000000-0000-4000-8000-000000009906",
    subjectType: "sourceCategory",
    subjectId: recettesDeBase.id,
    subjectLabel: "Recettes de base",
    status: "approved",
    isPrimary: true,
    createdAt: "2026-08-14T09:25:00.000Z",
    categorySlug: "recettes-de-base",
  }),
];
