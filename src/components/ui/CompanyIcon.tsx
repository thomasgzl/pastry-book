/**
 * Pictogrammes des badges de carte entreprise (page `/entreprises`, voir
 * `SourceCard.tsx`) — même style trait fin que `SiteHeader.tsx` (`stroke`
 * `currentColor`, pas de remplissage). Un symbole par entreprise réelle
 * (voir `companyIllustrations.ts`), jamais un logo — juste une évocation de
 * son activité. `fallback` sert à toute source sans correspondance connue.
 */

export type CompanyIconVariant = "building" | "cup" | "wine" | "bottle" | "palm" | "chefHat" | "house";

type IconProps = { className: string };

function sharedProps(className: string) {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

function BuildingIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <rect x="5" y="4" width="14" height="16" rx="1" />
      <path d="M9 20v-4h6v4" />
      <path d="M8 8h1.5M14.5 8H16M8 11.5h1.5M14.5 11.5H16" />
    </svg>
  );
}

function CupIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <path d="M5 9h11v5a5.5 5.5 0 0 1-5.5 5.5H10.5A5.5 5.5 0 0 1 5 14Z" />
      <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M9 5c-.6.6-.6 1.4 0 2M12.5 5c-.6.6-.6 1.4 0 2" />
    </svg>
  );
}

function WineIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <path d="M7 3.5h10c0 4.5-2 7-5 7s-5-2.5-5-7Z" />
      <path d="M12 10.5V18" />
      <path d="M8.5 20.5h7" />
    </svg>
  );
}

function BottleIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <path d="M10 3h4v3.2l1.5 2.3v11a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 8.5 19.5v-11L10 6.2Z" />
      <path d="M9.5 12h5" />
      <path d="M10 3h4" />
    </svg>
  );
}

function PalmIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <path d="M12 21V11" />
      <path d="M12 11c0-3 2-5 5-5-1 3-3 4.5-5 5Z" />
      <path d="M12 11c0-3-2-5-5-5 1 3 3 4.5 5 5Z" />
      <path d="M12 9c0-2.5 1.6-4 4-4.5-.8 2.3-2.2 3.6-4 4.5Z" />
      <path d="M12 9c0-2.5-1.6-4-4-4.5.8 2.3 2.2 3.6 4 4.5Z" />
    </svg>
  );
}

function ChefHatIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <path d="M8 11a3.5 3.5 0 0 1 1-6.8A3 3 0 0 1 12 2a3 3 0 0 1 3 2.2A3.5 3.5 0 0 1 16 11" />
      <path d="M8 11h8v4.5H8Z" />
      <path d="M8.5 19.5h7" />
      <path d="M9 15.5v4M15 15.5v4" />
    </svg>
  );
}

function HouseIcon({ className }: IconProps) {
  return (
    <svg {...sharedProps(className)}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h12V10" />
      <path d="M10 19.5v-5h4v5" />
    </svg>
  );
}

const ICON_BY_VARIANT: Record<CompanyIconVariant, (props: IconProps) => React.JSX.Element> = {
  building: BuildingIcon,
  cup: CupIcon,
  wine: WineIcon,
  bottle: BottleIcon,
  palm: PalmIcon,
  chefHat: ChefHatIcon,
  house: HouseIcon,
};

export function CompanyIcon({ variant, className = "h-5 w-5" }: { variant: CompanyIconVariant; className?: string }) {
  const Icon = ICON_BY_VARIANT[variant];
  return <Icon className={className} />;
}
