import type {
  GeneratedImage,
  ImageGenerationProvider,
  ImageGenerationRequest,
} from "@/lib/visuals/provider";
import type { VisualRatio } from "@/lib/visuals/preset";

const PALETTE = {
  olive: "#556043",
  sauge: "#828c6c",
  laiton: "#a68040",
  ivoire: "#f7f3ea",
} as const;

const DIMENSIONS_BY_RATIO: Record<VisualRatio, [number, number]> = {
  "1:1": [200, 200],
  "4:3": [240, 180],
  "16:9": [320, 180],
};

/** Hash déterministe (pas de dépendance, pas d'aléatoire réel) — seul le prompt fait varier le résultat. */
function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * ponytail: mock purement abstrait et déterministe (aucun contenu réel
 * généré par IA, aucun réseau) — traits/rotation/couleur dérivés d'un hash du
 * prompt exact, jamais de texte intégré (contrainte graphique CLAUDE.md,
 * respectée même en démo car ce rendu peut être approuvé et affiché comme
 * principal en mode démonstration). Plafond assumé : rendu schématique, pas
 * une vraie illustration culinaire. À remplacer par un vrai appel fournisseur
 * (OpenAI Images) derrière `ImageGenerationProvider` quand une clé et une
 * autorisation explicite existeront — voir `registry.ts`.
 */
export function renderDemoIllustrationSvg(prompt: string, ratio: VisualRatio): string {
  const seed = hashSeed(prompt);
  const [width, height] = DIMENSIONS_BY_RATIO[ratio];
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;
  const rotation = seed % 360;
  const strands = 3 + (seed % 4);
  const accent = [PALETTE.olive, PALETTE.sauge, PALETTE.laiton][seed % 3];

  const strokes = Array.from({ length: strands }, (_, i) => {
    const angle = ((rotation + (360 / strands) * i) * Math.PI) / 180;
    const x = (cx + radius * Math.cos(angle)).toFixed(1);
    const y = (cy + radius * Math.sin(angle)).toFixed(1);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${PALETTE.olive}" stroke-width="1.4" stroke-linecap="round" />`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>Illustration de démonstration — aucun appel IA réel, aucun contenu publié sans validation</title>
<rect width="${width}" height="${height}" fill="${PALETTE.ivoire}" />
<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.6" />
${strokes}
</svg>`;
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export const DEMO_PROVIDER_NAME = "Démonstration (sans clé)";
export const DEMO_PROVIDER_MODEL = "demo-botanique-mock-v1";

/** Seul adaptateur implémenté dans ce lot — aucun appel réseau, aucune clé, résultat déterministe. */
export const demoImageProvider: ImageGenerationProvider = {
  name: DEMO_PROVIDER_NAME,
  model: DEMO_PROVIDER_MODEL,
  costPerImageEstimateEur: 0,
  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const svg = renderDemoIllustrationSvg(request.prompt, request.ratio);
    return {
      imageUrl: toDataUri(svg),
      providerName: DEMO_PROVIDER_NAME,
      model: DEMO_PROVIDER_MODEL,
    };
  },
};
