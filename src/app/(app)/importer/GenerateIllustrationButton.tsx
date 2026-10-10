"use client";

/**
 * Un clic, zéro navigation (K13) : génère un brouillon d'illustration pour
 * UNE matière première qui vient d'être créée par cette recette, sans avoir
 * à aller la chercher dans `/illustrations/manquantes`. Reste un geste
 * humain explicite (CLAUDE.md : jamais de génération automatique) — ce
 * bouton existe précisément pour qu'il n'y ait plus qu'UN geste au lieu de
 * naviguer jusqu'à l'ingrédient pour le déclencher. Le brouillon produit
 * n'est jamais approuvé automatiquement (même règle que partout ailleurs) :
 * un lien vers le Centre des illustrations reste nécessaire pour le valider.
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { generateDraftAction } from "../visuels/actions";

export function GenerateIllustrationButton({ subjectId, name }: { subjectId: string; name: string }) {
  const [state, setState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (state === "pending") return;
    setState("pending");
    setError(null);
    const result = await generateDraftAction({ subjectType: "ingredient", subjectId });
    if (!result.ok) {
      setError(result.error);
      setState("error");
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return <span className="text-sm text-olive">« {name} » : brouillon généré, à valider dans Illustrations.</span>;
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="secondary" onClick={handleClick} disabled={state === "pending"} className="text-sm">
        {state === "pending" ? "Génération…" : `Générer l'illustration de « ${name} »`}
      </Button>
      {error && <span className="text-sm text-brunrouge">{error}</span>}
    </span>
  );
}
