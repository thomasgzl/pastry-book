"use client";

import { useCallback, useState, type CSSProperties } from "react";

interface ImageWithSkeletonProps {
  src: string;
  alt: string;
  /**
   * Appliquée IDENTIQUEMENT au calque de chargement et à l'image elle-même
   * (dimensions, `object-fit`, positionnement éventuel `absolute`) : les deux
   * calques doivent occuper exactement la même zone. Le conteneur parent
   * reste responsable de réserver l'espace (`relative`, `overflow-hidden`) —
   * jamais l'inverse.
   */
  className: string;
  /** Style appliqué uniquement à l'image réelle (ex. `objectPosition` — sans effet sur un calque de couleur unie). */
  style?: CSSProperties;
}

/**
 * Visuel réseau (photo IA via Storage signé — jamais un SVG statique local,
 * déjà instantané) avec un calque gris animé le temps du téléchargement réel
 * du fichier, plutôt qu'un blanc/saut brutal une fois l'image arrivée
 * (constaté sur les grilles de cartes recette, photos plus lourdes qu'un
 * SVG). `img.complete` vérifié via la ref : une image déjà en cache
 * navigateur peut déclencher `load` avant que React n'attache l'écouteur,
 * ce qui laisserait sinon le calque affiché indéfiniment.
 */
export function ImageWithSkeleton({ src, alt, className, style }: ImageWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  const checkAlreadyLoaded = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  }, []);

  return (
    <>
      {!loaded && <div aria-hidden="true" className={`${className} animate-pulse bg-grise`} />}
      {/* eslint-disable-next-line @next/next/no-img-element -- visuel approuvé/statique, pas de pipeline next/image dédié (lot E) — voir CulinaryFrame. */}
      <img
        ref={checkAlreadyLoaded}
        src={src}
        alt={alt}
        style={style}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </>
  );
}
