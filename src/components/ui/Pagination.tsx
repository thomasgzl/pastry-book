import { Button } from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Pagination minimale (Précédent/Suivant + repère de page) — jamais une liste
 * de numéros qui déborderait horizontalement sur téléphone quel que soit le
 * nombre de pages (CLAUDE.md, aucun défilement horizontal). Rien à afficher
 * pour une seule page.
 */
export function Pagination({ page, totalPages, onPageChange, className = "" }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <Button type="button" variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ← Précédent
      </Button>
      <span className="text-sm text-cacao/80">
        Page {page} sur {totalPages}
      </span>
      <Button type="button" variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Suivant →
      </Button>
    </nav>
  );
}
