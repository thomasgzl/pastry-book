"use client";

import { useEffect } from "react";

/**
 * Enregistre `public/sw.js` (B8). Ne rend rien : un échec d'enregistrement
 * (navigateur sans support, erreur réseau) n'empêche jamais l'utilisation de
 * l'application dans le navigateur, il est seulement journalisé.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Échec de l'enregistrement du service worker :", error);
    });
  }, []);

  return null;
}
