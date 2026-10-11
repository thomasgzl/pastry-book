/**
 * Constante partagée par l'action serveur et le formulaire client de
 * génération en lot (E3). Séparée de `actions.ts` : un fichier `"use server"`
 * ne peut exporter que des fonctions asynchrones, jamais une constante.
 */
export const BATCH_CONFIRMATION_PREFIX = "GENERER";

/** Même rôle, pour la validation en lot des versions fond-transparent (K-BG) en attente d'un choix humain. */
export const BACKGROUND_REMOVAL_BATCH_CONFIRMATION_PREFIX = "VALIDER";
