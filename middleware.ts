/**
 * Middleware d'authentification privée (B4).
 *
 * Bloque l'accès aux pages métier pour un utilisateur non authentifié et
 * rafraîchit la session Supabase à chaque requête. `middleware.ts` est
 * l'ancien nom du fichier proxy dans Next.js 16 (renommé `proxy.ts`,
 * fonctionnalité identique — voir node_modules/next/dist/docs/.../proxy.md).
 * Conservé sous ce nom car verrouillé ainsi dans docs/11-TASK_BOARD.md et
 * toujours pleinement supporté ; à renommer en `proxy.ts` lors d'une tâche
 * dédiée si le projet veut suivre la nouvelle convention.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { isPublicPath } from "@/lib/supabase/route-access";
import type { Database } from "@/lib/supabase/types";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // `getUser()` revalide le jeton auprès de Supabase Auth (contrairement à
  // `getSession()`, qui ne fait que lire le cookie local) : nécessaire pour
  // décider d'un accès côté serveur de confiance.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/connexion";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les ressources statiques internes et les
     * fichiers PWA (manifeste, service worker, icônes), qui doivent rester
     * joignables sans authentification.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js).*)",
  ],
};
