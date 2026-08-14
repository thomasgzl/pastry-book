import { ImporterWizard } from "./ImporterWizard";

/**
 * Route `/importer` (D1) — import manuel assisté. Voir `ImporterWizard` pour
 * le parcours complet (état, étapes, validation, enregistrement).
 */
export default function ImporterPage() {
  return <ImporterWizard />;
}
