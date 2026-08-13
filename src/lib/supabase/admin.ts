/**
 * Client Supabase privilégié (B4) — clé de service, contourne RLS.
 * Réservé au code serveur (ex. pipeline d'import de masse, tâche D1+).
 * Ne jamais importer depuis un composant client : la clé ne doit jamais
 * atteindre le navigateur (CLAUDE.md, principe non négociable).
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "createSupabaseAdminClient ne doit jamais être appelé dans le navigateur.",
    );
  }

  return createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
