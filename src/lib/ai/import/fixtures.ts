/**
 * Trois exemples démo contrôlés (D3) — PAS un import de masse. Couvrent :
 * (a) CAP, ingrédients seuls, aucune préparation nommée ; (b) Hennessy
 * détaillée (préparations multiples, informations complémentaires) ; (c)
 * capture simulée avec une quantité illisible → `null` + avertissement,
 * jamais une valeur inventée. Données FICTIVES, comme `src/lib/demo/data.ts`.
 */

import type { RawExtractionResult } from "./types";

export type DemoFixtureId = "cap-tarte-pommes" | "hennessy-tartelette-citron" | "capture-illisible";

export interface DemoFixture {
  id: DemoFixtureId;
  /** Nom de fichier simulé, tel que l'utilisateur le sélectionnerait dans l'étape « Fichiers ». */
  fileName: string;
  fileType: string;
  label: string;
  description: string;
  extraction: RawExtractionResult;
}

export const DEMO_FIXTURES: Record<DemoFixtureId, DemoFixture> = {
  "cap-tarte-pommes": {
    id: "cap-tarte-pommes",
    fileName: "cap-tarte-aux-pommes.pdf",
    fileType: "application/pdf",
    label: "Exemple CAP — Tarte aux pommes",
    description: "PDF Quantara : ingrédients seuls, aucune préparation nommée, aucune information complémentaire.",
    extraction: {
      method: "local-text",
      title: "Tarte aux pommes (CAP)",
      procedure: null,
      temperature: null,
      additionalInformation: null,
      sections: [
        {
          name: null,
          ingredients: [
            { originalName: "Farine T55", originalQuantityText: "250", unit: "g" },
            { originalName: "Beurre", originalQuantityText: "125", unit: "g" },
            { originalName: "Sucre", originalQuantityText: "100", unit: "g" },
            { originalName: "Pommes", originalQuantityText: "4", unit: "pièce" },
            { originalName: "Cannelle", originalQuantityText: "QS", unit: null },
          ],
        },
      ],
      warnings: [],
    },
  },
  "hennessy-tartelette-citron": {
    id: "hennessy-tartelette-citron",
    fileName: "hennessy-tartelette-citron-meringuee.pdf",
    fileType: "application/pdf",
    label: "Exemple Hennessy — Tartelette citron meringuée",
    description: "PDF Quantara : préparations multiples, informations complémentaires, allergènes détectables par règle.",
    extraction: {
      method: "local-text",
      title: "Tartelette citron meringuée (Hennessy)",
      procedure: "Cuisson à blanc de la pâte sucrée 15 min à 170°C avant garnissage.",
      temperature: "170°C",
      additionalInformation: "Dresser la meringue juste avant le service (démo).",
      sections: [
        {
          name: "Pâte sucrée",
          ingredients: [
            { originalName: "Farine T55", originalQuantityText: "200", unit: "g" },
            { originalName: "Beurre", originalQuantityText: "100", unit: "g" },
            { originalName: "Sucre glace", originalQuantityText: "80", unit: "g" },
            { originalName: "Œuf", originalQuantityText: "1", unit: "pièce" },
          ],
        },
        {
          name: "Crème citron",
          ingredients: [
            { originalName: "Jus de citron", originalQuantityText: "120", unit: "ml" },
            { originalName: "Œufs", originalQuantityText: "3", unit: "pièce" },
            { originalName: "Sucre", originalQuantityText: "90", unit: "g" },
            { originalName: "Beurre", originalQuantityText: "90", unit: "g" },
          ],
        },
        {
          name: "Meringue française",
          ingredients: [
            { originalName: "Blancs d'œufs", originalQuantityText: "100", unit: "g" },
            { originalName: "Sucre", originalQuantityText: "200", unit: "g" },
          ],
        },
      ],
      warnings: [],
    },
  },
  "capture-illisible": {
    id: "capture-illisible",
    fileName: "capture-sables-noisette.jpg",
    fileType: "image/jpeg",
    label: "Exemple capture — quantité illisible",
    description: "Photo/capture : vision-OCR, une quantité illisible reste absente — jamais estimée.",
    extraction: {
      method: "ocr",
      title: "Sablés noisette (capture)",
      procedure: null,
      temperature: null,
      additionalInformation: null,
      sections: [
        {
          name: null,
          ingredients: [
            { originalName: "Poudre de noisette", originalQuantityText: "100", unit: "g" },
            { originalName: "Beurre", originalQuantityText: null, unit: null },
            { originalName: "Sucre glace", originalQuantityText: "80", unit: "g" },
            { originalName: "Farine T55", originalQuantityText: "150", unit: "g" },
          ],
        },
      ],
      warnings: ["Quantité du « Beurre » illisible sur la capture — laissée « À vérifier », jamais estimée."],
    },
  },
};

export function getDemoFixture(id: DemoFixtureId): DemoFixture {
  return DEMO_FIXTURES[id];
}

export function listDemoFixtures(): DemoFixture[] {
  return Object.values(DEMO_FIXTURES);
}
