/**
 * Port d'extraction IA pour l'import (D3) — interface indépendante du
 * fournisseur (CLAUDE.md, docs/05-AI_IMPORT.md). Le code métier (`/importer`,
 * `src/lib/import/**`) ne connaît que ces types ; jamais un SDK fournisseur.
 * OpenAI sera le premier adaptateur réel branché derrière ce même port —
 * aucun appel réseau ni secret dans cette tranche, seulement le contrat et
 * un adaptateur de démonstration déterministe (`demoProvider.ts`).
 *
 * Chaque proposition porte un statut de vérification : jamais `confirmed`
 * automatiquement, quelle que soit la confiance de la règle/du modèle —
 * seule une action humaine explicite dans l'écran de vérification confirme
 * ou rejette (CLAUDE.md, principe 8).
 */

import type { SpecificitySource, SpecificityStatus, VerificationStatus } from "@/lib/domain/schemas";

export interface ExtractedIngredient {
  originalName: string;
  /** Texte brut de quantité tel qu'observé — `null` si illisible/absent, jamais deviné. */
  originalQuantityText: string | null;
  unit: string | null;
}

export interface ExtractedSection {
  /** `null` → préparation sans nom (liste simple). */
  name: string | null;
  /** Procédé propre à CETTE préparation, distinct du procédé global de la recette — `null`/absent s'il n'existe pas dans la source, jamais partagé entre préparations (correction lot G, extraction « Riz au lait Vanille Caramel »). */
  procedureText?: string | null;
  ingredients: ExtractedIngredient[];
}

/** Méthode ayant produit le texte : extraction locale (PDF/DOCX) ou vision/OCR (scans, photos, captures) — jamais l'inverse (docs/05-AI_IMPORT.md § Formats et priorité). */
export type ExtractionMethod = "local-text" | "ocr" | "manual";

export type CompletenessStatus = "complete" | "possibly_incomplete" | "needs_review";

/**
 * Contrôle de complétude de l'extraction (correction lot G — recette à
 * plusieurs préparations partiellement extraite). Méta-donnée d'IMPORT
 * uniquement : ne doit jamais devenir un champ de la recette enregistrée
 * (`ImportRecipeDraft` ne la reprend pas). `status` n'est jamais `"complete"`
 * uniquement parce que la sortie JSON est valide — voir `reconcileCompleteness`.
 */
export interface ExtractionCompleteness {
  detectedPreparationTitles: string[];
  extractedPreparationTitles: string[];
  status: CompletenessStatus;
  missingOrUnclearSections: string[];
}

export interface RawExtractionResult {
  method: ExtractionMethod;
  /** `null` si le titre n'a pas pu être identifié avec certitude — jamais un titre inventé. */
  title: string | null;
  sections: ExtractedSection[];
  /** Procédé, température, informations complémentaires : `null` chacun si absents du document — jamais déduits. */
  procedure: string | null;
  temperature: string | null;
  additionalInformation: string | null;
  /** Avertissements de l'extraction (champ illisible, ingrédient ambigu…) — toujours affichés, jamais tus. */
  warnings: string[];
  /** Absent pour l'adaptateur de démonstration et le repli manuel — `buildImportDraft` applique un défaut « complet » déterministe dans ce cas (sections canned/vides, rien à réconcilier). */
  completeness?: ExtractionCompleteness;
  /**
   * Matières premières principales proposées (tags de recherche gustatifs,
   * F-KEY1) — noms bruts déjà censés respecter les règles de
   * sélection/regroupement/normalisation du prompt (3 à 6, 0 si aucun
   * ingrédient gustatif pertinent), PAS encore résolus vers un identifiant
   * canonique : `buildImportDraft` fait cette résolution/ce dédoublonnage
   * (`resolveKeyIngredientTags`, `rules.ts`) contre le référentiel déjà
   * chargé. `undefined`/absent pour l'adaptateur de démonstration classique
   * et le repli manuel — traité comme un tableau vide, jamais une erreur.
   */
  proposedKeyIngredientNames?: string[];
}

export interface CanonicalIngredientProposal {
  originalName: string;
  /** `null` si aucune correspondance canonique trouvée. */
  canonicalIngredientSlug: string | null;
}

export interface AllergenProposal {
  allergenSlug: string;
  status: VerificationStatus;
  reason: string;
}

export interface SpecificityProposal {
  specificitySlug: string;
  status: SpecificityStatus;
  reason: string | null;
  source: SpecificitySource;
}

/**
 * Fichier/texte source d'une extraction (F-IA1). `text` et `fileBase64` sont
 * tous deux optionnels : l'adaptateur de démonstration n'en a besoin
 * d'aucun (il identifie ses 3 exemples par nom de fichier) ; l'adaptateur
 * réel les utilise pour décider texte local vs vision (texte prioritaire —
 * docs/05-AI_IMPORT.md).
 */
export interface ExtractSourceFile {
  name: string;
  type: string;
  /** Texte déjà disponible localement (collé par la personne, ou déjà extrait localement d'un PDF/DOCX en amont de ce port) — prioritaire sur la vision quand exploitable. */
  text?: string | null;
  /** Contenu binaire encodé en base64 (image, capture, page de PDF scanné) — utilisé seulement quand aucun texte local exploitable n'est fourni. */
  fileBase64?: string | null;
  /** Nombre de pages du document si connu (PDF) — permet de refuser un document trop long avant tout appel payant. */
  pageCount?: number | null;
  /** Chemin Storage réel du fichier ORIGINAL une fois archivé côté navigateur (I6, `uploadSourceFile`) — jamais une URL fictive, `null` si l'archivage n'a pas (encore) réussi. Simple passager jusqu'à `ImportFileRef.sourceFileUrl` (`buildImportDraft`) : cette valeur n'est jamais utilisée pour l'extraction elle-même. */
  sourceFileUrl?: string | null;
}

/** Un seul fichier (cas courant) ou plusieurs pages/captures ORDONNÉES d'UNE SEULE recette (correction lot G — regroupement en un seul appel, jamais une recette par fichier). */
export type ExtractSourceInput = ExtractSourceFile | ExtractSourceFile[];

export interface ExtractOptions {
  /** Identifiant stable de la demande, consommé par la garde de coût (idempotence, anti-double-clic). Un adaptateur sans état (démonstration) l'ignore. */
  requestId?: string;
  /** Vrai seulement si la personne a explicitement signalé un document difficile à lire — jamais déduit automatiquement (paramètre explicite de l'appel, pas un état global). */
  documentDifficult?: boolean;
}

/**
 * Port serveur d'extraction/normalisation d'import. Toutes les méthodes sont
 * asynchrones (traitement d'import asynchrone, CLAUDE.md) même quand
 * l'adaptateur de démonstration résout immédiatement.
 */
export interface ImportAIProvider {
  readonly name: string;
  extractText(files: ExtractSourceInput, options?: ExtractOptions): Promise<RawExtractionResult>;
  proposeCanonicalIngredients(ingredients: ExtractedIngredient[]): Promise<CanonicalIngredientProposal[]>;
  proposeAllergens(ingredients: ExtractedIngredient[]): Promise<AllergenProposal[]>;
  proposeSpecificities(ingredients: ExtractedIngredient[]): Promise<SpecificityProposal[]>;
}
