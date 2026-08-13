/**
 * Client Supabase serveur (B4) — Server Components, Server Actions, Route
 * Handlers. Utilise la clé anonyme publique et la session lue depuis les
 * cookies de la requête ; les politiques RLS s'appliquent normalement pour
 * l'utilisateur authentifié. À créer à chaque rendu serveur, jamais partagé
 * entre requêtes (recommandation `@supabase/ssr`).
 */

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Appelé depuis un Server Component : impossible d'écrire un cookie
          // en dehors d'une Server Action ou d'un Route Handler. Sans effet
          // ici, le middleware se charge du rafraîchissement de session.
        }
      },
    },
  });
}
