"use client";

const PRESETS = [0.5, 1, 1.5, 2] as const;

interface CoefficientControlProps {
  /** Coefficient courant. Purement affiché : aucun calcul n'est fait ici, le
   * recalcul des quantités reste à la charge de l'appelant (voir
   * CLAUDE.md § Coefficient non destructif). */
  value: number;
  onChange: (next: number) => void;
  className?: string;
}

function formatPreset(preset: number): string {
  return `× ${String(preset).replace(".", ",")}`;
}

/**
 * Boutons préréglés `× 0,5 / × 1 / × 1,5 / × 2` et champ personnalisé.
 * Le champ personnalisé affiche un contour "à vérifier" quand la valeur
 * courante n'est pas strictement positive, mais ne bloque jamais la saisie
 * ni l'appel à `onChange` : la validation métier réelle (accepter/rejeter,
 * bornes, arrondi) reste à la charge de l'appelant.
 */
export function CoefficientControl({
  value,
  onChange,
  className = "",
}: CoefficientControlProps) {
  const isValid = value > 0;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <div role="group" aria-label="Coefficient prédéfini" className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value === preset}
            onClick={() => onChange(preset)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-2 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
              value === preset
                ? "border-olive bg-olive text-coquille"
                : "border-grise bg-coquille text-cacao hover:bg-avoine"
            }`}
          >
            {formatPreset(preset)}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-cacao">
        <span>Personnalisé</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={Number.isFinite(value) ? value : ""}
          aria-invalid={!isValid}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            if (!Number.isNaN(next)) onChange(next);
          }}
          className={`min-h-11 w-24 rounded-lg border bg-coquille px-3 py-2 text-base text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
            isValid ? "border-grise" : "border-brunrouge"
          }`}
        />
      </label>
    </div>
  );
}
