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
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao placeholder:text-cacao/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
      />
    </div>
  );
}
