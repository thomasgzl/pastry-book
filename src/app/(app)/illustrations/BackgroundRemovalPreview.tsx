"use client";

/**
 * Comparaison Original/Fond supprimé (K-BG) — partie interactive isolée du
 * reste de `IllustrationEntryCard` (Server Component) : seuls le damier de
 * transparence et l'agrandissement ont besoin d'état client, les boutons
 * « Utiliser… » restent des Server Actions ordinaires passées en props
 * (`setUseBackgroundRemovedAction`), rien de nouveau côté traitement.
 *
 * Fond derrière les deux aperçus identique aux cards du répertoire public
 * (`CanonicalIngredientCard`, `#fbf7ef`) — même teinte mesurée sur les
 * illustrations réelles, pour juger le détourage dans les conditions
 * d'affichage réelles plutôt que sur un blanc neutre.
 */

import { useEffect, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";

/** Même teinte que `bg-[#fbf7ef]` sur `CanonicalIngredientCard.tsx` — dupliqué plutôt
 * qu'extrait : deux usages, un changement de design system futur les fera diverger. */
const CARD_BACKGROUND = "#fbf7ef";

const CHECKERBOARD_STYLE: CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg, #d8cdbd 25%, transparent 25%), linear-gradient(-45deg, #d8cdbd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8cdbd 75%), linear-gradient(-45deg, transparent 75%, #d8cdbd 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
};

interface PreviewFrameProps {
  src: string;
  label: string;
  name: string;
  checkerboard: boolean;
  onEnlarge: () => void;
}

function PreviewFrame({ src, label, name, checkerboard, onEnlarge }: PreviewFrameProps) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onEnlarge}
        aria-label={`Agrandir : ${name}, ${label}`}
        className="relative h-[180px] w-[180px] overflow-hidden rounded-lg border border-grise focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:h-[200px] sm:w-[200px]"
        style={checkerboard ? CHECKERBOARD_STYLE : { backgroundColor: CARD_BACKGROUND }}
      >
        <ImageWithSkeleton src={src} alt="" className="h-full w-full object-contain p-2" />
      </button>
      <span className="text-xs text-cacao/60">{label}</span>
    </div>
  );
}

interface LightboxState {
  src: string;
  label: string;
}

interface BackgroundRemovalPreviewProps {
  assetId: string;
  name: string;
  originalUrl: string | null;
  cleanedUrl: string;
  useBackgroundRemoved: boolean;
  setUseBackgroundRemovedAction: (formData: FormData) => void | Promise<void>;
}

export function BackgroundRemovalPreview({
  assetId,
  name,
  originalUrl,
  cleanedUrl,
  useBackgroundRemoved,
  setUseBackgroundRemovedAction,
}: BackgroundRemovalPreviewProps) {
  const [checkerboard, setCheckerboard] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightbox]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-grise bg-ivoire p-3">
      <label className="inline-flex min-h-11 w-fit items-center gap-2 text-sm text-cacao/80">
        <input
          type="checkbox"
          checked={checkerboard}
          onChange={(event) => setCheckerboard(event.target.checked)}
          className="h-5 w-5 accent-olive"
        />
        Damier de transparence (vérifier les contours)
      </label>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center">
        {originalUrl && (
          <PreviewFrame
            src={originalUrl}
            label="Original"
            name={name}
            checkerboard={checkerboard}
            onEnlarge={() => setLightbox({ src: originalUrl, label: "Original" })}
          />
        )}
        <PreviewFrame
          src={cleanedUrl}
          label="Fond supprimé"
          name={name}
          checkerboard={checkerboard}
          onEnlarge={() => setLightbox({ src: cleanedUrl, label: "Fond supprimé" })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <form action={setUseBackgroundRemovedAction}>
          <input type="hidden" name="assetId" value={assetId} />
          <input type="hidden" name="use" value="false" />
          <Button
            type="submit"
            variant={useBackgroundRemoved ? "secondary" : "primary"}
            disabled={!useBackgroundRemoved}
            className="text-sm"
          >
            Utiliser l'original
          </Button>
        </form>
        <form action={setUseBackgroundRemovedAction}>
          <input type="hidden" name="assetId" value={assetId} />
          <input type="hidden" name="use" value="true" />
          <Button
            type="submit"
            variant={useBackgroundRemoved ? "primary" : "secondary"}
            disabled={useBackgroundRemoved}
            className="text-sm"
          >
            Utiliser la version nettoyée
          </Button>
        </form>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-cacao/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${name}, ${lightbox.label}, agrandi`}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-3 rounded-lg bg-coquille p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-cacao">
                {name} — {lightbox.label}
              </span>
              <Button type="button" variant="secondary" onClick={() => setLightbox(null)} className="text-sm">
                Fermer
              </Button>
            </div>
            <div
              className="flex flex-1 items-center justify-center overflow-hidden rounded-lg"
              style={checkerboard ? CHECKERBOARD_STYLE : { backgroundColor: CARD_BACKGROUND }}
            >
              <ImageWithSkeleton src={lightbox.src} alt="" className="max-h-[70vh] w-full object-contain p-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
