import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Indicateur de dev Next.js (rond noir « N » en bas d'écran) : jamais
  // documenté comme faisant partie du produit (CBF3), retiré.
  devIndicators: false,
  experimental: {
    // Limite par défaut (1 Mo) trop basse pour un fichier base64 (lot G,
    // pilote IA réel) — 10 Mo couvre la limite applicative de 8 Mo + le
    // surcoût d'encodage base64 (~33 %). Contrôle réel côté client/serveur
    // dans PilotExtractionPanel.tsx / pilotActions.ts (8 Mo), pas ici.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
