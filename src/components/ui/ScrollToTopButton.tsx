"use client";

/**
 * Bouton flottant « remonter en haut » (mobile/tablet-first, CLAUDE.md) —
 * posé une seule fois dans le shell applicatif (`(app)/layout.tsx`), visible
 * sur toute page une fois suffisamment défilée. Cible tactile ≥ 44×44 px,
 * jamais dépendant du survol souris (CLAUDE.md, principe 10).
 */

import { useEffect, useState } from "react";

const SHOW_AFTER_PX = 400;

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Remonter en haut de la page"
      className="fixed bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-grise bg-coquille text-cacao shadow-lg transition-colors hover:bg-avoine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:right-6"
    >
      <span aria-hidden="true" className="text-lg leading-none">
        ↑
      </span>
    </button>
  );
}
