"use client";

/**
 * Page de connexion (B10). Seule route publique de l'application
 * (`src/lib/supabase/route-access.ts`) : le middleware y redirige tout accès
 * non authentifié. Pas d'inscription publique — un seul formulaire
 * email/mot de passe, aucun lien de création de compte.
 */

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EditorialTitle } from "@/components/ui/EditorialTitle";

const inputClassName =
  "min-h-11 rounded-lg border border-grise bg-coquille px-3 py-2 text-base text-cacao placeholder:text-cacao/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive";

/**
 * N'autorise qu'une redirection interne relative (`/chemin`). Rejette toute
 * URL absolue ou protocole-relative (`//hôte-externe/...`) pour éviter une
 * redirection ouverte vers un site tiers après connexion.
 */
export function isSafeInternalRedirect(target: string | null): target is string {
  return !!target && target.startsWith("/") && !target.startsWith("//");
}

type Status = "idle" | "loading" | "error";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      return;
    }

    const requested = searchParams.get("redirect");
    router.replace(isSafeInternalRedirect(requested) ? requested : "/");
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-cacao">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-cacao">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClassName}
          />
        </div>

        {status === "error" && (
          <p
            role="alert"
            className="rounded-lg border border-brunrouge/40 bg-brunrouge/10 px-3 py-2 text-sm text-brunrouge"
          >
            Adresse e-mail ou mot de passe incorrect.
          </p>
        )}

        <Button type="submit" disabled={status === "loading"} className="w-full">
          {status === "loading" ? "Connexion en cours…" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}

export default function ConnexionPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- emblème SVG statique, taille fixe (contrat CBV1). */}
        <img src="/visuals/placeholders/emblem.svg" alt="" className="h-14 w-14" />
        <EditorialTitle>Le Grand Livre de Pâtisserie</EditorialTitle>
        <p className="text-sm text-cacao/70">Archive privée de recettes professionnelles</p>
      </div>
      {/* useSearchParams impose une frontière Suspense (App Router). */}
      <Suspense fallback={null}>
        <ConnexionForm />
      </Suspense>
    </div>
  );
}
