"use client";

/**
 * Fiche recette adaptative (C5) — porte l'état du coefficient (C6) et
 * affiche chaque ingrédient recalculé via `getIngredientQuantityDisplay`.
 * Chaque bloc optionnel (photo, spécificités, matières premières clés,
 * informations complémentaires) ne se rend que si la donnée existe
 * (CLAUDE.md, principe 2 : aucune section vide).
 *
 * CBF4 (refonte visuelle) : présentation uniquement, aucun changement de
 * logique (coefficient, QS, `needs_review`, sections conditionnelles).
 *
 * Visuel (lot J5/J6, toujours affiché depuis K12) : `visual` est un
 * `ReactNode` déjà résolu et rendu côté serveur par la page
 * (`<ApprovedVisual />` — visuel approuvé si présent, repli placeholder
 * botanique sinon, jamais absent), composé ici via le slot enfant standard
 * pour Server Component dans un Client Component. Ce fichier n'importe
 * jamais `approvedVisual.ts`/`ApprovedVisual` directement (règle non
 * négociable : lecture Storage serveur uniquement).
 */

import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { RecipeIngredient } from "@/lib/domain/schemas";
import { SpecificityBadge, type BadgeStatus } from "@/components/ui/StatusBadge";
import { WarningIcon } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CoefficientControl } from "@/components/ui/CoefficientControl";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { IllustrationAction } from "@/components/ui/IllustrationAction";
import { getIngredientQuantityDisplay, isValidCoefficient } from "@/lib/recipes/coefficient";
import type { RecipeKeyIngredient, RecipeSectionWithIngredients } from "@/lib/data/recipes";

interface RecipeSheetSpecificity {
  id: string;
  name: string;
  status: BadgeStatus;
}

interface RecipeSheetProps {
  title: string;
  sourceName: string;
  categoryName?: string;
  /** Visuel déjà résolu et rendu par la page (voir note ci-dessus) — toujours
   * présent (visuel approuvé ou repli placeholder, K12). */
  visual: ReactNode;
  /** Sujet déjà pourvu d'un visuel principal approuvé ? Détermine le libellé
   * de l'action secondaire (« Créer une illustration » / « Nouvelle version »,
   * K12) — jamais déduit de `visual`, qui affiche toujours un cadre (image ou
   * placeholder). */
  hasApprovedVisual: boolean;
  sections: RecipeSectionWithIngredients[];
  specificities: RecipeSheetSpecificity[];
  keyIngredients: RecipeKeyIngredient[];
  additionalInformation?: string | null;
}

function IngredientRow({ ingredient, coefficient }: { ingredient: RecipeIngredient; coefficient: number }) {
  const display = getIngredientQuantityDisplay(ingredient, coefficient);
  const needsReview = display.primary === "À vérifier";

  return (
    <li className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-cacao">{ingredient.originalName}</span>
      <span className="shrink-0 text-right">
        {needsReview ? (
          <span className="inline-flex items-center gap-1 font-medium text-brunrouge">
            <WarningIcon />
            {display.primary}
          </span>
        ) : (
          <span className="font-medium tabular-nums text-cacao">{display.primary}</span>
        )}
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
  visual,
  hasApprovedVisual,
  sections,
  specificities,
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
        <EditorialTitle>{title}</EditorialTitle>
        <p className="text-cacao/70">
          {sourceName}
          {categoryName ? ` · ${categoryName}` : ""}
        </p>
      </div>

      <div className="mx-auto w-full sm:max-w-xl lg:max-w-md">{visual}</div>

      <IllustrationAction
        subjectType="recipe"
        hasVisual={hasApprovedVisual}
        label={title}
        className="self-start"
      />

      <Card className="flex flex-col gap-3">
        <EditorialTitle as="h2">Coefficient</EditorialTitle>
        <CoefficientControl value={coefficient} onChange={handleCoefficientChange} />
        <p className="text-sm text-cacao/70">
          Quantités recalculées à l&rsquo;affichage uniquement — les quantités enregistrées ne changent jamais.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {sections.map((section) => (
          <div key={section.id} className="flex flex-col gap-2">
            {section.name && <EditorialTitle as="h2">{section.name}</EditorialTitle>}
            <ul className="flex flex-col divide-y divide-grise rounded-xl border border-grise bg-coquille">
              {section.ingredients.map((ingredient) => (
                <IngredientRow key={ingredient.id} ingredient={ingredient} coefficient={coefficient} />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {specificities.length > 0 && (
        <Card className="flex flex-col gap-3">
          <EditorialTitle as="h2">Spécificités</EditorialTitle>
          <div className="flex flex-wrap gap-2">
            {specificities.map((specificity) => (
              <SpecificityBadge key={specificity.id} name={specificity.name} status={specificity.status} />
            ))}
          </div>
        </Card>
      )}

      {keyIngredients.length > 0 && (
        <Card className="flex flex-col gap-3">
          <EditorialTitle as="h2">Matières premières clés</EditorialTitle>
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
        </Card>
      )}

      {hasAdditionalInformation && (
        <Card className="flex flex-col gap-3">
          <EditorialTitle as="h2">Informations complémentaires</EditorialTitle>
          <p className="whitespace-pre-line text-cacao">{additionalInformation}</p>
        </Card>
      )}
    </div>
  );
}
