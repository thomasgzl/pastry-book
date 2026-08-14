/**
 * Lecture validée des variables d'environnement Supabase (B4).
 * Frontière système : une variable manquante échoue tôt et lisiblement
 * plutôt que de laisser le client Supabase produire une erreur réseau opaque.
 */

/**
 * Réservé aux variables SERVEUR uniquement (jamais `NEXT_PUBLIC_*`) :
 * l'accès dynamique `process.env[name]` n'est jamais remplacé par Next.js
 * au moment du build pour un Client Component — seul un accès statique
 * littéral (`process.env.NEXT_PUBLIC_X` écrit tel quel) est inliné dans le
 * bundle navigateur. Utiliser cette fonction pour une variable
 * `NEXT_PUBLIC_*` produit un `undefined` silencieux côté client, quelle que
 * soit sa vraie valeur configurée sur l'hébergeur (bug réel constaté lot I :
 * connexion cassée en Preview malgré des variables correctement définies).
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`);
  }
  return value;
}

/** Accès statique littéral — seule forme que Next.js inline dans un bundle Client Component. Ne JAMAIS remplacer par `requireEnv("NEXT_PUBLIC_SUPABASE_URL")` (accès dynamique, casse silencieusement côté navigateur). */
export function getSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!value) {
    throw new Error("Variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_URL (voir .env.example)");
  }
  return value;
}

/**
 * Vérification non bloquante (jamais de throw) : vrai seulement si un vrai
 * projet Supabase est configuré. Sert à activer le mode démonstration
 * déterministe (proxy d'authentification, couche de lecture) sans exiger de
 * clé API — décision explicite : « l'application doit fonctionner même sans
 * Supabase live ».
 */
export function hasSupabaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Accès statique littéral — voir la note sur `getSupabaseUrl`. Ne JAMAIS remplacer par `requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")`. */
export function getSupabaseAnonKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!value) {
    throw new Error("Variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_ANON_KEY (voir .env.example)");
  }
  return value;
}

/** Serveur uniquement — ne jamais importer depuis un composant client. */
export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
