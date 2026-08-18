"use server";

/**
 * Frontière Server Action de la recherche globale (C9) — seul point d'entrée
 * appelé par `page.tsx` (Client Component, état de requête porté par l'URL).
 * Un Client Component ne peut pas lire Supabase directement (clés serveur) ;
 * voir `src/app/(app)/importer/importActions.ts` pour le même patron.
 */

import { searchAllData } from "@/lib/data/search";
import type { SearchResults } from "@/lib/recipes/search";

export async function searchAllAction(query: string): Promise<SearchResults> {
  return searchAllData(query);
}
