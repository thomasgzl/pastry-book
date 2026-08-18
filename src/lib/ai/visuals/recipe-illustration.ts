import { revalidatePath } from "next/cache";
import type { Result } from "@/lib/domain/errors";
import { ok, err } from "@/lib/domain/errors";
import type { VisualAsset } from "@/lib/domain/schemas";
import { getVisualSubject } from "@/lib/visuals/subjects";
import { approveVisualAsset, getPrimaryVisualAsset } from "@/lib/visuals/storage";
import { generateRealVisualDraft } from "./real-generation";

/**
 * Revalide toutes les listes qui affichent des cartes recette — seul endroit
 * qui le fait, pour ne jamais en oublier une au prochain appelant
 * (`saveImportRecipeAction`, `generateRecipeIllustrationAction`). Les pages
 * elles-mêmes lisent déjà Supabase via un client qui dépend des cookies de
 * requête (`createSupabaseServerClient`), donc un rendu serveur frais est de
 * toute façon déjà dynamique ; ceci vise le cache de navigation côté client
 * (Router Cache) pour un retour/lien déjà visité dans la même session.
 */
function revalidateRecipeCardPages(recipeSlug: string): void {
  revalidatePath(`/recettes/${recipeSlug}`);
  revalidatePath("/recettes");
  revalidatePath("/specificites");
  revalidatePath("/entreprises");
  revalidatePath("/matieres-premieres");
}

/**
 * Génère puis publie immédiatement l'illustration d'une recette (F-IA3,
 * import + fiche recette). Contrairement au parcours galerie
 * (`generateVisualDraft`/`/visuels`, brouillon en attente de validation
 * humaine), une recette n'a pas d'écran de validation dédié : le visuel
 * généré ici est directement approuvé et défini principal, pour apparaître
 * sur les cartes sans étape supplémentaire — ce dont ce module est seul
 * responsable, jamais dupliqué ailleurs.
 *
 * Ne relance jamais un appel si la recette a déjà un visuel principal —
 * `data: null` dans ce cas, jamais un second appel payant (idempotence, même
 * garde que `generateRealVisualDraft`). Ne lève jamais d'exception : un échec
 * (fournisseur, réseau, stockage) ne doit jamais empêcher l'enregistrement de
 * la recette qui a déclenché cet appel.
 */
export async function generateMissingRecipeIllustration(
  recipeId: string,
): Promise<Result<VisualAsset | null>> {
  try {
    const existing = await getPrimaryVisualAsset("recipe", recipeId);
    if (existing) return ok(null);

    const subject = await getVisualSubject("recipe", recipeId);
    if (!subject) return err("not_found", "Recette introuvable.");

    const generated = await generateRealVisualDraft({
      subjectType: "recipe",
      subjectId: recipeId,
      subjectLabel: subject.label,
      sourcePhotoUrl: subject.photoUrl,
      recipeMode: subject.photoUrl ? "photo" : "description",
      preparationNames: subject.preparationNames,
      validatedKeyIngredientNames: subject.validatedKeyIngredientNames,
      additionalInformation: subject.additionalInformation,
    });
    if (!generated.ok) return generated;

    const published = await approveVisualAsset(generated.data.id);
    revalidateRecipeCardPages(subject.slug);
    return ok(published);
  } catch (cause) {
    return err(
      "unknown",
      cause instanceof Error ? cause.message : "Génération de l'illustration impossible.",
      cause,
    );
  }
}
