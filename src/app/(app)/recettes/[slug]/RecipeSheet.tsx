"use client";

/**
 * Fiche recette adaptative (C5) — porte l'état du coefficient (C6) et
 * affiche chaque ingrédient recalculé via `getIngredientQuantityDisplay`.
 * Chaque bloc optionnel (photo, allergènes, matières premières clés,
 * informations complémentaires) ne se rend que si la donnée existe
 * (CLAUDE.md, principe 2 : aucune section vide).
 */

import { useState } from "react";
import Link from "next/link";
import type { RecipeIngredient } from "@/lib/domain/schemas";
import { AllergenBadge, type BadgeStatus } from "@/components/ui/StatusBadge";
import { CoefficientControl } from "@/components/ui/CoefficientControl";
import { getIngredientQuantityDisplay, isValidCoefficient } from "@/lib/recipes/coefficient";
import type { RecipeKeyIngredient, RecipeSectionWithIngredients } from "@/lib/data/recipes";

interface RecipeSheetAllergen {
  id: string;
  name: string;
  status: BadgeStatus;
}

interface RecipeSheetProps {
  title: string;
  sourceName: string;
  categoryName?: string;
  photoUrl?: string;
  sections: RecipeSectionWithIngredients[];
  allergens: RecipeSheetAllergen[];
  keyIngredients: RecipeKeyIngredient[];
  additionalInformation?: string | null;
}

function IngredientRow({ ingredient, coefficient }: { ingredient: RecipeIngredient; coefficient: number }) {
  const display = getIngredientQuantityDisplay(ingredient, coefficient);
  const needsReview = display.primary === "À vérifier";

  return (
    <li className="flex items-baseline justify-between gap-3 px-4 py-2.5">
      <span className="text-cacao">{ingredient.originalName}</span>
      <span className="shrink-0 text-right">
        <span className={`font-medium tabular-nums ${needsReview ? "text-brunrouge" : "text-cacao"}`}>
          {display.primary}
        </span>
        {display.original && (
          <span className="ml-2 text-sm tabular-nums text-cacao/60">({display.original})</span>
        )}
      </span>
    </li>
  );
}

export function RecipeSheet({
  title,
  sourceName,
  categoryName,
  photoUrl,
  sections,
  allergens,
  keyIngredients,
  additionalInformation,
}: RecipeSheetProps) {
  // Coefficient non destructif (CLAUDE.md, principe 5) : purement local à
  // l'affichage, jamais enregistré. `× 1` par défaut à l'ouverture de la
  // fiche.
  const [coefficient, setCoefficient] = useState(1);

  function handleCoefficientChange(next: number) {
    // Coefficient invalide (0, négatif, NaN…) rejeté : l'état conserve la
    // dernière valeur valide plutôt que d'appliquer une valeur qui ne
    // recalculerait rien de fiable (voir `isValidCoefficient`).
    if (isValidCoefficient(next)) setCoefficient(next);
  }

  const hasAdditionalInformation = Boolean(additionalInformation && additionalInformation.trim().length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-cacao sm:text-3xl">{title}</h1>
        <p className="text-cacao/70">
          {sourceName}
          {categoryName ? ` · ${categoryName}` : ""}
        </p>
      </div>

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- même choix que RecipeCard : pas de pipeline next/image dédié (lot E, non lancé).
        <img src={photoUrl} alt="" className="h-56 w-full rounded-xl object-cover sm:h-72" />
      )}

      <div className="flex flex-col gap-2">
        <CoefficientControl value={coefficient} onChange={handleCoefficientChange} />
        <p className="text-sm text-cacao/70">
          Quantités recalculées à l&rsquo;affichage uniquement — les quantités enregistrées ne changent jamais.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-2">
            {section.name && (
              <h2 className="font-serif text-lg font-semibold text-cacao">{section.name}</h2>
            )}
            <ul className="flex flex-col divide-y divide-grise rounded-xl border border-grise bg-coquille">
              {section.ingredients.map((ingredient) => (
                <IngredientRow key={ingredient.id} ingredient={ingredient} coefficient={coefficient} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {allergens.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-semibold text-cacao">Allergènes détectés</h2>
          <div className="flex flex-wrap gap-2">
            {allergens.map((allergen) => (
              <AllergenBadge key={allergen.id} name={allergen.name} status={allergen.status} />
            ))}
          </div>
        </div>
      )}

      {keyIngredients.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-semibold text-cacao">Matières premières clés</h2>
          <ul className="flex flex-wrap gap-2">
            {keyIngredients.map((ingredient) => (
              <li key={ingredient.slug}>
                <Link
                  href={`/matieres-premieres/${ingredient.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-grise bg-avoine px-3 text-sm font-medium text-cacao hover:bg-avoine/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
                >
                  {ingredient.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAdditionalInformation && (
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-lg font-semibold text-cacao">Informations complémentaires</h2>
          <p className="whitespace-pre-line text-cacao">{additionalInformation}</p>
        </div>
      )}
    </div>
  );
}
