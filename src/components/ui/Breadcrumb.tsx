import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Fil d'Ariane générique et réutilisable. Le dernier élément est toujours
 * traité comme la page courante (pas de lien, `aria-current="page"`), même
 * s'il porte un `href`. Ne se rend pas si `items` est vide (aucune section
 * vide affichée — voir CLAUDE.md).
 */
export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Fil d'Ariane" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-cacao/70">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden="true" className="text-cacao/40">
                  /
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded hover:text-cacao hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-medium text-cacao" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
