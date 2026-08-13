import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-olive text-coquille hover:bg-olive/90",
  secondary: "bg-coquille text-cacao border border-grise hover:bg-avoine",
};

/**
 * Bouton tactile de base : cible ≥ 44x44px, activable au clavier (élément
 * <button> natif, pas de comportement réservé au survol), focus visible.
 * Voir docs/06-DESIGN_SYSTEM.md § Expérience tactile.
 */
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg px-4 py-2 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
