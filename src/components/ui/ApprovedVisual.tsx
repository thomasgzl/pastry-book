import type { VisualAsset } from "@/lib/domain/schemas";
import { getApprovedVisualUrl } from "@/lib/visuals/approvedVisual";
import { CulinaryFrame } from "./CulinaryFrame";

type SubjectType = VisualAsset["subjectType"];

const FALLBACK_SRC: Record<SubjectType, string> = {
  recipe: "/visuals/placeholders/placeholder-recipe-4x3.svg",
  ingredient: "/visuals/placeholders/placeholder-recipe-4x3.svg",
  source: "/visuals/placeholders/placeholder-hero.svg",
  sourceCategory: "/visuals/placeholders/placeholder-hero.svg",
};

/** Cadrage par défaut selon le sujet (docs/06-DESIGN_SYSTEM.md § Illustrations et images). */
const DEFAULT_FIT: Record<SubjectType, "cover" | "contain"> = {
  recipe: "cover",
  // matière première : image entière visible, jamais recadrée.
  ingredient: "contain",
  source: "cover",
  sourceCategory: "cover",
};

interface ApprovedVisualProps {
  subjectType: SubjectType;
  subjectId: string;
  /** Texte alternatif pertinent, utilisé UNIQUEMENT quand un vrai visuel est
   * affiché — un placeholder reste purement décoratif (`alt=""`). */
  alt: string;
  ratio?: "4:3" | "16:9" | "1:1";
  fit?: "cover" | "contain";
  className?: string;
}

/**
 * Composant central de lecture d'un visuel approuvé (lot J5/J consommation).
 * Server Component uniquement : appelle `getApprovedVisualUrl`, qui passe
 * par le client Supabase serveur — ne jamais importer ce fichier depuis un
 * module `"use client"` (même règle que `approvedVisual.ts`/`storage.ts`).
 *
 * Dimensions toujours réservées via `CulinaryFrame` (ratio fixe) : aucun
 * saut de mise en page, que le visuel soit présent ou non. Repli placeholder
 * botanique cohérent si `getApprovedVisualUrl` renvoie `null` (pas encore
 * illustré, ou Supabase/Storage indisponible) — jamais une erreur bloquante.
 */
export async function ApprovedVisual({
  subjectType,
  subjectId,
  alt,
  ratio = "4:3",
  fit,
  className = "",
}: ApprovedVisualProps) {
  let url: string | null = null;
  try {
    url = await getApprovedVisualUrl(subjectType, subjectId);
  } catch {
    // Lecture Storage/Supabase indisponible : repli silencieux vers le
    // placeholder, jamais un écran d'erreur pour une simple illustration
    // décorative (l'essentiel de la page — recette, ingrédient — reste lisible).
    url = null;
  }

  return (
    <CulinaryFrame
      src={url ?? FALLBACK_SRC[subjectType]}
      alt={url ? alt : ""}
      ratio={ratio}
      fit={fit ?? DEFAULT_FIT[subjectType]}
      decorate={!url}
      className={className}
    />
  );
}
