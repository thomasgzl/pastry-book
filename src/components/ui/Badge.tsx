import type { ReactNode } from "react";

interface BadgeProps {
  children?: ReactNode;
  className?: string;
}

/**
 * Badge « À vérifier » : discret mais visible, jamais porté par la seule
 * couleur (icône + texte). Voir docs/06-DESIGN_SYSTEM.md § État « À vérifier ».
 */
export function Badge({ children = "À vérifier", className = "" }: BadgeProps) {
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border border-brunrouge/40 bg-brunrouge/10 px-2.5 py-1 text-sm font-medium text-brunrouge ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="h-3.5 w-3.5 shrink-0"
      >
        <path
          d="M10 2 L18.5 17H1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="9.25" y="7.5" width="1.5" height="4.5" rx="0.75" fill="currentColor" />
        <rect x="9.25" y="13.2" width="1.5" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}
