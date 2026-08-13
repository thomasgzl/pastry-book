"use client";

/**
 * Client Supabase navigateur (B4). Utilise uniquement la clé anonyme
 * publique — jamais la clé de service. Les requêtes passent par les
 * politiques RLS (`supabase/migrations/20260814090100_rls_policies.sql`) :
 * un utilisateur non authentifié ne peut rien lire ni écrire.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey());
}
