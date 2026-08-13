import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefacts imbriqués (build/scaffolding d'agents) non couverts par les
    // motifs ci-dessus faute de préfixe "**/".
    "**/.next/**",
    "**/node_modules/**",
    ".claude/worktrees/**",
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
