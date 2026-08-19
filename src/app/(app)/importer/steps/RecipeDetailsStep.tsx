"use client";

import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Allergen, CanonicalIngredient, Specificity } from "@/lib/domain/schemas";
import { deriveQuantity, slugify } from "@/lib/import/model";
import { TITLE_PLACEHOLDER, type ImportRecipeDraft, type ImportSectionDraft } from "@/lib/import/schema";
import { createEmptyIngredient, createEmptySection } from "../draftFactory";

/** Nombre maximal de matières premières principales (F-KEY1, règle produit) — jamais dépassé, même par ajout manuel. */
const MAX_KEY_INGREDIENTS = 6;

interface RecipeDetailsStepProps {
  draft: ImportRecipeDraft;
  canonicalIngredients: CanonicalIngredient[];
  specificities: Specificity[];
  allergens: Allergen[];
  onChange: (updater: (draft: ImportRecipeDraft) => ImportRecipeDraft) => void;
  /** Faux pour la modification manuelle d'une recette déjà enregistrée : la
   * fiche recette n'affiche plus les allergènes (voir `RecipeSheet`) et leur
   * modification n'est pas prise en charge par ce formulaire dans ce
   * contexte — masquer plutôt qu'afficher un bloc dont les changements ne
   * seraient jamais enregistrés (CLAUDE.md, aucune rubrique trompeuse).
   * Vrai par défaut (comportement de l'import, inchangé). */
  showAllergens?: boolean;
}

const inputClasses =
  "min-h-11 w-full min-w-0 rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive";

const moveButtonClasses =
  "min-h-11 min-w-11 rounded-lg text-cacao focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-30";

function updateSection(draft: ImportRecipeDraft, sectionId: string, update: (section: ImportSectionDraft) => ImportSectionDraft): ImportRecipeDraft {
  return { ...draft, sections: draft.sections.map((section) => (section.id === sectionId ? update(section) : section)) };
}

/** Réorganisation monter/descendre — même patron que `moveFile` (FilesStep, K3-IMPORT), pas de librairie de glisser-déposer. */
function moveSection(draft: ImportRecipeDraft, index: number, direction: -1 | 1): ImportRecipeDraft {
  const target = index + direction;
  if (target < 0 || target >= draft.sections.length) return draft;
  const sections = [...draft.sections];
  [sections[index], sections[target]] = [sections[target], sections[index]];
  return { ...draft, sections };
}

/**
 * Étape 4 — informations reconnues (D1, saisie manuelle sans IA) + correction
 * manuelle de chaque champ, dans le même écran (une valeur affichée EST déjà
 * modifiable, pas d'écran séparé purement en lecture). Aucune section
 * n'impose de préparation nommée (liste simple valide, CAP minimale).
 */
export function RecipeDetailsStep({ draft, canonicalIngredients, specificities, allergens, onChange, showAllergens = true }: RecipeDetailsStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <EditorialTitle as="h2">Informations reconnues</EditorialTitle>
        <p className="text-sm text-cacao/70">Corrigez chaque champ librement. Un champ illisible reste vide ou « À vérifier ».</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="draft-title" className="text-sm font-medium text-cacao">
          Titre
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="draft-title"
            type="text"
            value={draft.title}
            onChange={(event) => onChange((d) => ({ ...d, title: event.target.value }))}
            placeholder="Titre de la recette"
            className={`${inputClasses} max-w-md`}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => onChange((d) => ({ ...d, title: TITLE_PLACEHOLDER }))}
          >
            Titre illisible → « À vérifier »
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="draft-procedure" className="text-sm font-medium text-cacao">
            Procédé (facultatif)
          </label>
          <textarea
            id="draft-procedure"
            value={draft.procedure ?? ""}
            onChange={(event) => onChange((d) => ({ ...d, procedure: event.target.value || null }))}
            rows={3}
            className={inputClasses}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="draft-temperature" className="text-sm font-medium text-cacao">
            Température (facultative)
          </label>
          <input
            id="draft-temperature"
            type="text"
            value={draft.temperature ?? ""}
            onChange={(event) => onChange((d) => ({ ...d, temperature: event.target.value || null }))}
            placeholder="Ex. 180°C"
            className={inputClasses}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="draft-additional" className="text-sm font-medium text-cacao">
          Informations complémentaires (facultatives)
        </label>
        <textarea
          id="draft-additional"
          value={draft.additionalInformation ?? ""}
          onChange={(event) => onChange((d) => ({ ...d, additionalInformation: event.target.value || null }))}
          rows={3}
          className={inputClasses}
        />
      </div>

      <div className="flex flex-col gap-4">
        <EditorialTitle as="h2">Préparations et ingrédients</EditorialTitle>
        {draft.sections.map((section, sectionIndex) => (
          <Card key={section.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`section-name-${section.id}`} className="text-sm font-medium text-cacao">
                Nom de la préparation (facultatif — laisser vide pour une liste simple)
              </label>
              {draft.sections.length > 1 && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onChange((d) => moveSection(d, sectionIndex, -1))}
                    disabled={sectionIndex === 0}
                    aria-label={`Monter la préparation ${section.name ?? sectionIndex + 1}`}
                    className={moveButtonClasses}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((d) => moveSection(d, sectionIndex, 1))}
                    disabled={sectionIndex === draft.sections.length - 1}
                    aria-label={`Descendre la préparation ${section.name ?? sectionIndex + 1}`}
                    className={moveButtonClasses}
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
            <input
              id={`section-name-${section.id}`}
              type="text"
              value={section.name ?? ""}
              onChange={(event) =>
                onChange((d) => updateSection(d, section.id, (s) => ({ ...s, name: event.target.value || null })))
              }
              placeholder="Ex. Crème citron"
              className={`${inputClasses} max-w-sm`}
            />

            <ul className="flex flex-col gap-2">
              {section.ingredients.map((ingredient, ingredientIndex) => (
                <li key={ingredient.id} className="grid grid-cols-1 gap-2 rounded-lg border border-grise p-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
                  <input
                    aria-label="Libellé original de l'ingrédient"
                    type="text"
                    value={ingredient.originalName}
                    onChange={(event) =>
                      onChange((d) =>
                        updateSection(d, section.id, (s) => ({
                          ...s,
                          ingredients: s.ingredients.map((i, idx) =>
                            idx === ingredientIndex ? { ...i, originalName: event.target.value } : i,
                          ),
                        })),
                      )
                    }
                    placeholder="Libellé original (ex. Farine T55)"
                    className={inputClasses}
                  />
                  <input
                    aria-label="Quantité d'origine"
                    type="text"
                    value={ingredient.originalQuantityText ?? ""}
                    onChange={(event) => {
                      const text = event.target.value || null;
                      const derived = deriveQuantity(text);
                      onChange((d) =>
                        updateSection(d, section.id, (s) => ({
                          ...s,
                          ingredients: s.ingredients.map((i, idx) =>
                            idx === ingredientIndex
                              ? { ...i, originalQuantityText: text, ...derived }
                              : i,
                          ),
                        })),
                      );
                    }}
                    placeholder="Ex. 250, QS, laisser vide si illisible"
                    className={inputClasses}
                  />
                  <input
                    aria-label="Unité"
                    type="text"
                    value={ingredient.unit ?? ""}
                    onChange={(event) =>
                      onChange((d) =>
                        updateSection(d, section.id, (s) => ({
                          ...s,
                          ingredients: s.ingredients.map((i, idx) =>
                            idx === ingredientIndex ? { ...i, unit: event.target.value || null } : i,
                          ),
                        })),
                      )
                    }
                    placeholder="Unité (g, ml…)"
                    className={inputClasses}
                  />
                  <select
                    aria-label="Ingrédient canonique proposé"
                    value={ingredient.canonicalIngredientId ?? ""}
                    onChange={(event) =>
                      onChange((d) =>
                        updateSection(d, section.id, (s) => ({
                          ...s,
                          ingredients: s.ingredients.map((i, idx) =>
                            idx === ingredientIndex
                              ? { ...i, canonicalIngredientId: event.target.value || null }
                              : i,
                          ),
                        })),
                      )
                    }
                    className={inputClasses}
                  >
                    <option value="">Aucune matière première canonique</option>
                    {canonicalIngredients.map((canonical) => (
                      <option key={canonical.id} value={canonical.id}>
                        {canonical.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={section.ingredients.length <= 1}
                    onClick={() =>
                      onChange((d) =>
                        updateSection(d, section.id, (s) => ({
                          ...s,
                          ingredients: s.ingredients.filter((_, idx) => idx !== ingredientIndex),
                        })),
                      )
                    }
                  >
                    Retirer
                  </Button>
                  <p className="col-span-full text-xs text-cacao/60">
                    Affichage prévu :{" "}
                    {ingredient.verificationStatus === "needs_review"
                      ? "À vérifier"
                      : ingredient.quantityDecimal
                        ? `${ingredient.quantityDecimal}${ingredient.unit ? ` ${ingredient.unit}` : ""} (confirmé)`
                        : `${ingredient.originalQuantityText ?? "À vérifier"} (proposé, à confirmer)`}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  onChange((d) =>
                    updateSection(d, section.id, (s) => ({ ...s, ingredients: [...s.ingredients, createEmptyIngredient()] })),
                  )
                }
              >
                Ajouter un ingrédient
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={draft.sections.length <= 1}
                onClick={() => onChange((d) => ({ ...d, sections: d.sections.filter((_, idx) => idx !== sectionIndex) }))}
              >
                Retirer cette préparation
              </Button>
            </div>
          </Card>
        ))}
        <Button type="button" variant="secondary" onClick={() => onChange((d) => ({ ...d, sections: [...d.sections, createEmptySection()] }))} className="self-start">
          Ajouter une préparation
        </Button>
      </div>

      <Card className="flex flex-col gap-3">
        <EditorialTitle as="h2">Matières premières principales</EditorialTitle>
        <p className="text-sm text-cacao/70">
          3 à 6 ingrédients qui définissent le goût de la recette (fruits, chocolats, épices, alcools…) — jamais farine,
          beurre, œufs, sucre, sauf exception. Zéro proposition reste normal si aucun ingrédient gustatif n&rsquo;est
          pertinent.
        </p>
        {draft.proposedKeyIngredients.length === 0 && <p className="text-sm text-cacao/60">Aucune proposition pour l&rsquo;instant.</p>}
        <ul className="flex flex-col gap-2">
          {draft.proposedKeyIngredients.map((tag, index) => (
            <li
              key={tag.kind === "existing" ? tag.canonicalIngredientId : `new-${tag.slug}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-grise p-3"
            >
              {tag.kind === "new" ? (
                <>
                  <Badge>Nouvelle matière première proposée</Badge>
                  <input
                    aria-label="Nom de la nouvelle matière première proposée"
                    type="text"
                    value={tag.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      onChange((d) => ({
                        ...d,
                        proposedKeyIngredients: d.proposedKeyIngredients.map((t, i) =>
                          i === index && t.kind === "new" ? { ...t, name, slug: slugify(name) } : t,
                        ),
                      }));
                    }}
                    className={`${inputClasses} max-w-xs`}
                  />
                  <select
                    aria-label="Remplacer par une matière première existante"
                    value=""
                    onChange={(event) => {
                      const canonical = canonicalIngredients.find((c) => c.id === event.target.value);
                      if (!canonical) return;
                      onChange((d) => ({
                        ...d,
                        proposedKeyIngredients: d.proposedKeyIngredients.map((t, i) =>
                          i === index
                            ? { kind: "existing" as const, canonicalIngredientId: canonical.id, name: canonical.name }
                            : t,
                        ),
                      }));
                    }}
                    className={`${inputClasses} max-w-xs`}
                  >
                    <option value="">Remplacer par une matière première existante…</option>
                    {canonicalIngredients.map((canonical) => (
                      <option key={canonical.id} value={canonical.id}>
                        {canonical.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <span className="text-sm text-cacao">{tag.name}</span>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  onChange((d) => ({
                    ...d,
                    proposedKeyIngredients: d.proposedKeyIngredients.filter((_, i) => i !== index),
                  }))
                }
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Ajouter une matière première principale existante"
            value=""
            disabled={draft.proposedKeyIngredients.length >= MAX_KEY_INGREDIENTS}
            onChange={(event) => {
              const canonical = canonicalIngredients.find((c) => c.id === event.target.value);
              if (!canonical) return;
              onChange((d) => ({
                ...d,
                proposedKeyIngredients: [
                  ...d.proposedKeyIngredients,
                  { kind: "existing" as const, canonicalIngredientId: canonical.id, name: canonical.name },
                ],
              }));
            }}
            className={`${inputClasses} max-w-xs`}
          >
            <option value="">+ Ajouter une matière première existante</option>
            {canonicalIngredients
              .filter((c) => !draft.proposedKeyIngredients.some((tag) => tag.kind === "existing" && tag.canonicalIngredientId === c.id))
              .map((canonical) => (
                <option key={canonical.id} value={canonical.id}>
                  {canonical.name}
                </option>
              ))}
          </select>
          {draft.proposedKeyIngredients.length >= MAX_KEY_INGREDIENTS && (
            <p className="text-xs text-cacao/60">Maximum de {MAX_KEY_INGREDIENTS} matières premières principales atteint.</p>
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <EditorialTitle as="h2">Spécificités</EditorialTitle>
        {draft.specificities.length === 0 && <p className="text-sm text-cacao/60">Aucune proposition pour l&rsquo;instant.</p>}
        <ul className="flex flex-col gap-2">
          {draft.specificities.map((entry) => {
            const specificity = specificities.find((s) => s.id === entry.specificityId);
            return (
              <li key={entry.specificityId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-grise px-3 py-2">
                <span className="text-sm text-cacao">
                  {specificity?.name ?? "Spécificité inconnue"} — <span className="italic">{entry.status === "confirmed" ? "confirmé" : entry.status === "rejected" ? "rejeté" : "proposé, à vérifier"}</span>
                  {entry.reason && <span className="block text-xs text-cacao/60">{entry.reason}</span>}
                </span>
                {entry.status === "proposed" && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        onChange((d) => ({
                          ...d,
                          specificities: d.specificities.map((s) => (s.specificityId === entry.specificityId ? { ...s, status: "confirmed" } : s)),
                        }))
                      }
                    >
                      Confirmer
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        onChange((d) => ({
                          ...d,
                          specificities: d.specificities.filter((s) => s.specificityId !== entry.specificityId),
                        }))
                      }
                    >
                      Rejeter
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          {specificities
            .filter((s) => !draft.specificities.some((entry) => entry.specificityId === s.id))
            .map((specificity) => (
              <Button
                key={specificity.id}
                type="button"
                variant="secondary"
                onClick={() =>
                  onChange((d) => ({
                    ...d,
                    specificities: [...d.specificities, { specificityId: specificity.id, status: "confirmed", reason: null, source: "manual" }],
                  }))
                }
              >
                + {specificity.name}
              </Button>
            ))}
        </div>
      </Card>

      {showAllergens && (
      <Card className="flex flex-col gap-3">
        <EditorialTitle as="h2">Allergènes</EditorialTitle>
        {draft.allergens.length === 0 && <p className="text-sm text-cacao/60">Aucune proposition pour l&rsquo;instant.</p>}
        <ul className="flex flex-col gap-2">
          {draft.allergens.map((entry) => {
            const allergen = allergens.find((a) => a.id === entry.allergenId);
            return (
              <li key={entry.allergenId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-grise px-3 py-2">
                <span className="text-sm text-cacao">
                  {allergen?.name ?? "Allergène inconnu"} — <span className="italic">{entry.status === "confirmed" ? "confirmé" : entry.status === "needs_review" ? "à vérifier" : "proposé, à vérifier"}</span>
                </span>
                <div className="flex gap-2">
                  {entry.status !== "confirmed" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        onChange((d) => ({
                          ...d,
                          allergens: d.allergens.map((a) => (a.allergenId === entry.allergenId ? { ...a, status: "confirmed" } : a)),
                        }))
                      }
                    >
                      Confirmer
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onChange((d) => ({ ...d, allergens: d.allergens.filter((a) => a.allergenId !== entry.allergenId) }))}
                  >
                    Retirer
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          {allergens
            .filter((a) => !draft.allergens.some((entry) => entry.allergenId === a.id))
            .map((allergen) => (
              <Button
                key={allergen.id}
                type="button"
                variant="secondary"
                onClick={() => onChange((d) => ({ ...d, allergens: [...d.allergens, { allergenId: allergen.id, status: "confirmed" }] }))}
              >
                + {allergen.name}
              </Button>
            ))}
        </div>
      </Card>
      )}
    </div>
  );
}
