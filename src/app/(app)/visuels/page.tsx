/**
 * Galerie de validation des visuels IA (E3). Quatre types d'usage (matière
 * première, recette, entreprise, catégorie d'entreprise), chacun listé sans
 * section vide (CLAUDE.md, principe 2). Génération individuelle et
 * régénération passent par `SubjectGallery` (galerie de variantes par
 * sujet) ; la génération en lot (« visuels manquants ») passe par
 * `BatchGenerateMissing`, protégée par une confirmation nommée obligatoire.
 * Aucun appel IA réel : `getVisualsProvider()` ne renvoie que l'adaptateur de
 * démonstration dans ce lot.
 */

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { EditorialTitle } from "@/components/ui/EditorialTitle";
import { getVisualsProvider } from "@/lib/ai/visuals/registry";
import { VISUAL_PRESET_VERSION, type VisualSubjectKind } from "@/lib/visuals/preset";
import { hasAnyVisualAsset, listVisualAssets } from "@/lib/visuals/storage";
import { VISUAL_KIND_LABELS, getAllVisualSubjects } from "@/lib/visuals/subjects";
import { BatchGenerateMissing } from "./BatchGenerateMissing";
import { SubjectGallery } from "./SubjectGallery";

const KINDS: VisualSubjectKind[] = ["ingredient", "recipe", "source", "sourceCategory"];

export default async function VisuelsPage({
  searchParams,
}: {
  searchParams: Promise<{ manquants?: string }>;
}) {
  const { manquants } = await searchParams;
  const onlyMissing = manquants === "1";

  const provider = getVisualsProvider();
  const subjects = getAllVisualSubjects();
  const missingFlags = await Promise.all(subjects.map((subject) => hasAnyVisualAsset(subject.type, subject.id)));
  const missingBySubjectId = new Map(subjects.map((subject, index) => [`${subject.type}-${subject.id}`, !missingFlags[index]]));
  const missingCount = missingFlags.filter((hasAsset) => !hasAsset).length;
  const assetsBySubjectId = new Map(
    await Promise.all(
      subjects.map(
        async (subject) => [`${subject.type}-${subject.id}`, await listVisualAssets(subject.type, subject.id)] as const,
      ),
    ),
  );

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumb items={[{ label: "Accueil", href: "/" }, { label: "Visuels IA" }]} />

      <div className="flex flex-col gap-2">
        <EditorialTitle>Visuels IA</EditorialTitle>
        <p className="text-sm text-cacao/70">
          Preset « Botanique éditorial — {VISUAL_PRESET_VERSION} ». Fournisseur actuel : {provider.name} · modèle{" "}
          {provider.model} · coût par image :{" "}
          {provider.costPerImageEstimateEur === null ? "estimation indisponible" : `${provider.costPerImageEstimateEur} €`}.
        </p>
      </div>

      <BatchGenerateMissing
        missingCount={missingCount}
        providerName={provider.name}
        providerModel={provider.model}
        costPerImageEstimateEur={provider.costPerImageEstimateEur}
      />

      <div role="group" aria-label="Filtrer la liste des sujets" className="flex flex-wrap gap-2">
        <Link href="/visuels">
          <Button type="button" variant={onlyMissing ? "secondary" : "primary"}>
            Tous les sujets
          </Button>
        </Link>
        <Link href="/visuels?manquants=1">
          <Button type="button" variant={onlyMissing ? "primary" : "secondary"}>
            Visuels manquants uniquement
          </Button>
        </Link>
      </div>

      {KINDS.map((kind) => {
        const kindSubjects = subjects
          .filter((subject) => subject.type === kind)
          .filter((subject) => !onlyMissing || missingBySubjectId.get(`${subject.type}-${subject.id}`));

        // Aucune section vide affichée (CLAUDE.md, principe 2) : ni un type sans
        // sujet en démo, ni un type entièrement filtré par « manquants uniquement ».
        if (kindSubjects.length === 0) return null;

        return (
          <section key={kind} className="flex flex-col gap-3">
            <EditorialTitle as="h2">{VISUAL_KIND_LABELS[kind]}</EditorialTitle>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {kindSubjects.map((subject) => (
                <SubjectGallery
                  key={`${subject.type}-${subject.id}`}
                  subject={subject}
                  assets={assetsBySubjectId.get(`${subject.type}-${subject.id}`) ?? []}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
