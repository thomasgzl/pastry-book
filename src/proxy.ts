/**
 * Proxy d'authentification privée (B4).
 *
 * Renommé depuis `middleware.ts` (correction lot C) : Next.js 16 a déprécié
 * la convention `middleware.ts`/`export function middleware` au profit de
 * `proxy.ts`/`export function proxy` — même fonctionnalité, mais l'ancien
 * fichier n'est plus exécuté du tout (silencieusement, sans erreur). Constaté
 * en testant le lot C : `/` répondait 200 sans redirection vers `/connexion`.
 * Voir node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md.
 *
 * Mode démonstration : si aucun projet Supabase réel n'est configuré
 * (`hasSupabaseConfig()` false — cas de cet environnement de développement),
 * l'accès n'est pas bloqué : la démonstration doit fonctionner sans clé API
 * (décision explicite du lot C). Dès qu'un vrai projet Supabase est
 * configuré, la vérification d'authentification reprend automatiquement.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl, hasSupabaseConfig } from "@/lib/supabase/env";
import { isPublicPath } from "@/lib/supabase/route-access";
import type { Database } from "@/lib/supabase/types";

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) {
    return NextResponse.next({ request });
  }

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
     *
     * `visuals/` et `icons/` sont exclus : ce sont des assets de design
     * statiques et non sensibles servis depuis `public/` (logos, icônes PWA,
     * illustrations d'entreprises/matières, placeholders). Ils doivent se
     * charger sans session — notamment le sceau de la page publique
     * `/connexion` et les icônes du manifeste PWA. Aucune donnée privée n'y
     * réside (les médias privés passent par le stockage signé Supabase).
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|visuals/|icons/).*)",
  ],
};
