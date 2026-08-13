/**
 * Service worker (B8), écrit à la main — pas de next-pwa/workbox, dépendance
 * non justifiée pour ce besoin (aucun choix technique du projet n'en
 * mentionne). Exclu de l'authentification par `middleware.ts`
 * (`manifest.webmanifest`/`sw.js`), servi tel quel à la racine du site pour
 * pouvoir contrôler `/` (portée par défaut d'un service worker).
 *
 * Stratégie réseau-d'abord / repli-cache pour toutes les requêtes GET
 * même origine : une page de contenu (ex. une recette) déjà consultée avec
 * succès reste lisible hors connexion, mise en cache à la volée au moment de
 * la navigation réussie. Pas de précache exhaustif du site (600+ recettes) :
 * seul le shell minimal (accueil, page hors connexion) est pré-mis en cache
 * à l'installation, le reste se remplit progressivement à l'usage.
 *
 * Jamais de mise en cache :
 * - des requêtes non-GET (mutations, jamais rejouables depuis un cache) ;
 * - de toute requête vers une autre origine — couvre à la fois l'API
 *   Supabase Auth et les appels de données Supabase, qui vivent sur le
 *   domaine *.supabase.co et ne passent donc jamais par ce filtre ;
 * - des routes internes `/api/*` (aucune aujourd'hui, garde défensive pour
 *   une future route serveur qui renverrait une donnée privée).
 *
 * Mise à jour de version : `skipWaiting()` à l'installation et
 * `clients.claim()` à l'activation, sans rechargement forcé des onglets
 * ouverts (pas de `controllerchange` -> `location.reload()`). Le nouveau
 * service worker prend donc le contrôle dès la prochaine navigation/
 * ouverture d'onglet, sans interrompre une session en cours (ex. une saisie
 * en cours sur /connexion) — le compromis le plus simple qui reste correct.
 * L'activation purge aussi tout cache d'une version précédente, pour ne
 * jamais accumuler indéfiniment d'anciennes versions.
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `pastry-book-${CACHE_VERSION}`;
const SHELL_URLS = ["/", "/offline"];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Pas de connexion — Le Grand Livre de Pâtisserie</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#F7F3EA; color:#3B291F; font-family:system-ui,sans-serif; text-align:center; padding:24px; }
  a { display:inline-block; margin-top:16px; min-height:44px; padding:10px 20px; border-radius:8px;
    background:#556043; color:#FFFCF6; text-decoration:none; }
</style></head>
<body><div>
  <h1>Pas de connexion</h1>
  <p>Cette page n'a pas encore été consultée avec une connexion active.</p>
  <a href="/">Retour à l'accueil</a>
</div></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // `Promise.allSettled` : l'échec d'une URL (ex. hors ligne pendant
      // l'installation) ne doit jamais empêcher l'installation du reste.
      Promise.allSettled(SHELL_URLS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(networkFirstWithCacheFallback(request));
});

async function networkFirstWithCacheFallback(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const offline = await cache.match("/offline");
      if (offline) return offline;
      return new Response(OFFLINE_FALLBACK_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return Response.error();
  }
}
