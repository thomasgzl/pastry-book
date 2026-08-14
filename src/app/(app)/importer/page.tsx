import { ImporterWizard } from "./ImporterWizard";

const OPENAI_EXTRACTION_MODEL_DEFAULT = "gpt-5-mini";

/**
 * Route `/importer` (D1) — import manuel assisté. Voir `ImporterWizard` pour
 * le parcours complet (état, étapes, validation, enregistrement). Lit
 * uniquement la PRÉSENCE de `OPENAI_API_KEY` côté serveur (jamais sa valeur)
 * pour activer les 3 emplacements du pilote IA réel (lot G, G2) — jamais de
 * bascule silencieuse, l'absence de clé masque simplement ces emplacements.
 */
export default function ImporterPage() {
  const realExtractionAvailable = Boolean(process.env.OPENAI_API_KEY?.trim());
  const extractionModel = process.env.OPENAI_EXTRACTION_MODEL?.trim() || OPENAI_EXTRACTION_MODEL_DEFAULT;

  return <ImporterWizard realExtractionAvailable={realExtractionAvailable} extractionModel={extractionModel} />;
}
