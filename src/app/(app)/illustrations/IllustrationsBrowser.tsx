"use client";

/**
 * Centre `/illustrations` (K5) — partie interactive. Filtres (type de sujet,
 * statut, recherche par nom) portés par l'URL (`?type=`, `?statut=`, `?q=`),
 * jamais un état React local perdu à la navigation — même patron que
 * `RecettesBrowser` (K1). Aucune Server Action ici : consultation seule.
 */

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/states/EmptyState";
import { normalizeText } from "@/lib/recipes/search";
import { VISUAL_KIND_LABELS } from "@/lib/visuals/kindLabels";
import type { VisualSubjectKind } from "@/lib/visuals/preset";
import type { VisualAssetStatus, VisualDisplayStatus } from "@/lib/visuals/status";
import { IllustrationEntryCard } from "./IllustrationEntryCard";

export interface IllustrationVersion {
  id: string;
  status: VisualAssetStatus;
  isPrimary: boolean;
  imageUrl: string;
  presetVersion: string;
  createdAt: string;
}

export interface IllustrationEntry {
  type: VisualSubjectKind;
  id: string;
  slug: string;
  label: string;
  parentLabel?: string;
  status: VisualDisplayStatus;
  thumbnailUrl: string | null;
  /** Historique complet des versions, la plus ancienne en premier (ordre déjà garanti par `listVisualAssets`). */
  versions: IllustrationVersion[];
}

const TYPE_FILTERS: { value: "" | VisualSubjectKind; label: string }[] = [
  { value: "", label: "Tous les sujets" },
  { value: "recipe", label: VISUAL_KIND_LABELS.recipe },
  { value: "ingredient", label: VISUAL_KIND_LABELS.ingredient },
  { value: "source", label: VISUAL_KIND_LABELS.source },
  { value: "sourceCategory", label: VISUAL_KIND_LABELS.sourceCategory },
];

const STATUS_FILTERS: { value: "" | VisualDisplayStatus; label: string }[] = [
  { value: "", label: "Tous les statuts" },
  { value: "approved", label: "Approuvés" },
  { value: "draft", label: "Brouillons à vérifier" },
  { value: "rejected", label: "Rejetés" },
  { value: "missing", label: "Sans illustration" },
];

interface IllustrationsBrowserProps {
  entries: IllustrationEntry[];
}

function IllustrationsContent({ entries }: IllustrationsBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const typeFilter = (searchParams.get("type") ?? "") as "" | VisualSubjectKind;
  const statusFilter = (searchParams.get("statut") ?? "") as "" | VisualDisplayStatus;

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Filtre par type affiché uniquement si plus d'un type possède au moins un
  // sujet (sinon il ne pourrait jamais changer le résultat) — même règle que
  // le filtre par entreprise de `RecettesBrowser`.
  const typesPresent = new Set(entries.map((entry) => entry.type));
  const showTypeFilter = typesPresent.size > 1;

  const filtered = entries.filter((entry) => {
    const matchesType = !typeFilter || entry.type === typeFilter;
    const matchesStatus = !statusFilter || entry.status === statusFilter;
    const matchesQuery =
      !q ||
      normalizeText(entry.label).includes(normalizeText(q)) ||
      (entry.parentLabel ? normalizeText(entry.parentLabel).includes(normalizeText(q)) : false);
    return matchesType && matchesStatus && matchesQuery;
  });

  const missingCount = entries.filter((entry) => entry.status === "missing").length;

  return (
    <div className="flex flex-col gap-6">
      <SearchInput
        value={q}
        onChange={(value) => updateParams({ q: value })}
        label="Rechercher un sujet illustré par nom"
        placeholder="Rechercher par nom (recette, ingrédient, entreprise, catégorie)…"
        className="w-full max-w-md sm:max-w-lg lg:max-w-xl"
      />

      {showTypeFilter && (
        <div role="group" aria-label="Filtrer par type de sujet" className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((option) => (
            <Button
              key={option.value || "tous"}
              type="button"
              variant={typeFilter === option.value ? "primary" : "secondary"}
              onClick={() => updateParams({ type: option.value })}
            >
              {option.label}
            </Button>
          ))}
        </div>
      )}

      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((option) => (
          <Button
            key={option.value || "tous"}
            type="button"
            variant={statusFilter === option.value ? "primary" : "secondary"}
            onClick={() => updateParams({ statut: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {missingCount > 0 && (
        <p className="text-sm text-cacao/70">
          {missingCount} sujet{missingCount > 1 ? "s" : ""} sans illustration.{" "}
          <a href="/illustrations/manquantes" className="underline underline-offset-2 hover:text-cacao">
            Voir la file des illustrations manquantes
          </a>{" "}
          (sélection, lot plafonné, K8).
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState message="Aucun sujet ne correspond à ces filtres." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((entry) => (
            <li key={`${entry.type}-${entry.id}`}>
              <IllustrationEntryCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IllustrationsBrowser(props: IllustrationsBrowserProps) {
  // useSearchParams impose une frontière Suspense (App Router).
  return (
    <Suspense fallback={null}>
      <IllustrationsContent {...props} />
    </Suspense>
  );
}
