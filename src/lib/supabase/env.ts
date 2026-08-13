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

export function getSupabaseAnonKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/** Serveur uniquement — ne jamais importer depuis un composant client. */
export function getSupabaseServiceRoleKey(): string {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}
