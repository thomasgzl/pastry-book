import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// `test.globals` n'est pas activé dans vitest.config.ts : l'auto-cleanup de
// @testing-library/react (qui dépend d'un `afterEach` global implicite) ne
// se déclenche donc pas seule. Sans cet appel explicite, le DOM d'un test
// reste monté pour le suivant dans le même fichier (requêtes ambiguës,
// faux positifs de fuite mémoire).
afterEach(() => {
  cleanup();
});
