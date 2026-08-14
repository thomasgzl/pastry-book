"use client";

import { useState } from "react";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Button } from "@/components/ui/Button";
import type { SourceCategory } from "@/lib/domain/schemas";

interface CategoryStepProps {
  categories: SourceCategory[];
  sourceCategoryId: string | null;
  onChange: (sourceCategoryId: string | null) => void;
  /** L'appelant crée la catégorie (store) et sélectionne son id ; ce composant reste sans effet de bord sur le store. */
  onCreateCategory: (name: string) => void;
}

/**
 * Étape 2 — catégorie locale à l'entreprise choisie, facultative (D1).
 * « Aucune catégorie » est une option de premier ordre, jamais un état par
 * défaut ambigu. Catégorie propre à `sourceId`, jamais globalisée (CLAUDE.md,
 * principe 6).
 */
export function CategoryStep({ categories, sourceCategoryId, onChange, onCreateCategory }: CategoryStepProps) {
  const [newCategoryName, setNewCategoryName] = useState("");

  function handleCreate() {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    onCreateCategory(trimmed);
    setNewCategoryName("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <EditorialTitle as="h2">Catégorie locale</EditorialTitle>
        <p className="text-sm text-cacao/70">Facultatif — propre à cette entreprise uniquement.</p>
      </div>

      <div role="radiogroup" aria-label="Catégorie locale" className="flex flex-col gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={sourceCategoryId === null}
          onClick={() => onChange(null)}
          className={`min-h-11 rounded-lg border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
            sourceCategoryId === null ? "border-olive bg-olive text-coquille" : "border-grise bg-coquille text-cacao hover:bg-avoine"
          }`}
        >
          Aucune catégorie
        </button>
        {categories.map((category) => {
          const selected = category.id === sourceCategoryId;
          return (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(category.id)}
              className={`min-h-11 rounded-lg border px-4 py-3 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive ${
                selected ? "border-olive bg-olive text-coquille" : "border-grise bg-coquille text-cacao hover:bg-avoine"
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-grise p-3">
        <label htmlFor="new-category" className="text-sm font-medium text-cacao">
          Créer une nouvelle catégorie locale
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="new-category"
            type="text"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Ex. Viennoiseries"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive"
          />
          <Button type="button" variant="secondary" onClick={handleCreate} disabled={!newCategoryName.trim()}>
            Créer et sélectionner
          </Button>
        </div>
      </div>
    </div>
  );
}
