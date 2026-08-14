"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
  { label: "Accueil", href: "/" },
  { label: "Entreprises", href: "/entreprises" },
  { label: "Recettes", href: "/recettes" },
  { label: "Matières premières", href: "/matieres-premieres" },
  { label: "Spécificités", href: "/specificites" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      {open ? <path d="M5 5 L19 19 M19 5 L5 19" /> : <path d="M4 6 H20 M4 12 H20 M4 18 H20" />}
    </svg>
  );
}

/**
 * En-tête du shell authentifié : titre du site, navigation principale
 * (desktop en ligne, mobile en menu déroulant — bascule unique au point de
 * rupture `md`, cible tactile ≥ 44px), bouton Importer visible mais
 * désactivé (aucune route `/importer` n'existe encore : un `<button
 * disabled>` natif est plus sûr qu'un lien qui mènerait à une page absente).
 * Hennessy n'apparaît jamais ici : ce n'est pas un onglet de premier niveau,
 * seulement une carte de la page Entreprises (CLAUDE.md).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-grise bg-ivoire/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap rounded font-serif text-lg font-semibold text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive sm:text-xl"
          onClick={() => setMenuOpen(false)}
        >
          <span className="sm:hidden">Grand Livre</span>
          <span className="hidden sm:inline">Le Grand Livre de Pâtisserie</span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden md:block">
          <ul className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center rounded-lg px-4 text-[0.95rem] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
                      active
                        ? "bg-avoine font-semibold text-olive"
                        : "text-cacao hover:bg-avoine/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled className="hidden md:inline-flex">
            Importer
          </Button>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-principal-mobile"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-grise text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive md:hidden"
          >
            <span className="sr-only">{menuOpen ? "Fermer le menu" : "Ouvrir le menu"}</span>
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="menu-principal-mobile"
          aria-label="Navigation principale (mobile)"
          className="border-t border-grise bg-ivoire md:hidden"
        >
          <ul className="flex flex-col gap-1 px-4 py-3">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex min-h-11 items-center rounded-lg px-3 text-base font-medium ${
                      active ? "bg-avoine font-semibold text-olive" : "text-cacao hover:bg-avoine/60"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Button variant="secondary" disabled className="mt-1 w-full justify-start">
                Importer
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
