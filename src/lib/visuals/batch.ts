/**
 * Constante partagée par l'action serveur et le formulaire client de
 * génération en lot (E3). Séparée de `actions.ts` : un fichier `"use server"`
 * ne peut exporter que des fonctions asynchrones, jamais une constante.
 */
export const BATCH_CONFIRMATION_PREFIX = "GENERER";
