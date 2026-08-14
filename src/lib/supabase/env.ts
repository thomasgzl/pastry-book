/**
 * Lecture validée des variables d'environnement Supabase (B4).
 * Frontière système : une variable manquante échoue tôt et lisiblement
 * plutôt que de laisser le client Supabase produire une erreur réseau opaque.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
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

export function getSupabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Serveur uniquement — ne jamais importer depuis un composant client. */
export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
