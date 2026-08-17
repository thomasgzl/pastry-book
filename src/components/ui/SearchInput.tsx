"use client";

import { useEffect, useId, useRef } from "react";

interface SearchInputProps {
  /** Valeur affichée, contrôlée par l'appelant (mise à jour à chaque frappe
   * pour un champ réactif). */
  value: string;
  onChange: (value: string) => void;
  /**
   * Appelé avec la valeur courante `debounceMs` après la dernière frappe.
   * C'est le seul point d'entrée à brancher sur une recherche réelle : ce
   * composant ne fait aucune requête ni filtrage lui-même (UI générique,
   * pas de logique métier — voir périmètre de la tâche C1).
   */
  onSearch?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  /** Libellé accessible. Masqué visuellement (`sr-only`) : le placeholder
   * suffit visuellement, mais un champ de recherche a toujours besoin d'un
   * nom accessible pour les lecteurs d'écran. */
  label?: string;
  className?: string;
}

/**
 * Champ de recherche générique et debouncé. Choix d'API : `value`/`onChange`
 * restent synchrones (l'appelant peut afficher le texte tapé immédiatement,
 * ex. dans l'URL ou un champ contrôlé), `onSearch` est débouncé ici car il
 * s'agit d'un détail d'interface (éviter une recherche à chaque frappe), pas
 * d'une règle métier.
 */
export function SearchInput({
  value,
  onChange,
  onSearch,
  debounceMs = 300,
  placeholder = "Rechercher…",
  label = "Recherche",
  className = "",
}: SearchInputProps) {
  const id = useId();
  const onSearchRef = useRef(onSearch);

  // Tenu à jour hors rendu (règle react-hooks/refs) : évite de redéclencher
  // le minuteur de debounce quand seule l'identité de `onSearch` change.
  useEffect(() => {
    onSearchRef.current = onSearch;
  });

  useEffect(() => {
    if (!onSearchRef.current) return;
    const timeout = setTimeout(() => {
      onSearchRef.current?.(value);
    }, debounceMs);
    return () => clearTimeout(timeout);
  }, [value, debounceMs]);

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cacao/50"
      >
        <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.5 13.5 L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-lg border border-grise bg-coquille py-2 pr-3 pl-10 text-base text-cacao placeholder:text-cacao/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
      />
    </div>
  );
}
