import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tâche B5 : vérifications statiques légères du contenu texte de
 * `supabase/seed.sql` (regex/comptage de chaînes).
 *
 * IMPORTANT — limite connue : le CLI Supabase/Docker n'est pas fonctionnel
 * dans cet environnement (même limite que B3/B4). Ce test ne remplace donc
 * PAS une exécution réelle du fichier contre PostgreSQL (contraintes,
 * triggers, unicité des slugs, FK...) : il prouve seulement que les libellés
 * et statuts exigés par la tâche sont bien présents dans le fichier.
 */

const seedSql = readFileSync(
  path.resolve(__dirname, "../../../supabase/seed.sql"),
  "utf-8",
);

/** Isole le contenu entre un `insert into <table>` et le prochain `insert into`
 * ou séparateur de section, pour vérifier des statuts dans le bon bloc plutôt
 * que dans le fichier entier. */
function sliceInsertBlock(sql: string, table: string): string {
  const start = sql.indexOf(`insert into ${table} `);
  if (start === -1) {
    throw new Error(`Bloc "insert into ${table}" introuvable dans seed.sql`);
  }
  const rest = sql.slice(start + table.length);
  const nextInsert = rest.search(/\ninsert into \w+/);
  const nextDivider = rest.indexOf("\n-- ====");
  const candidates = [nextInsert, nextDivider].filter((i) => i !== -1);
  const end = candidates.length > 0 ? Math.min(...candidates) : rest.length;
  return rest.slice(0, end);
}

describe("supabase/seed.sql — jeu de données de démonstration", () => {
  it("marque le fichier comme jeu de démonstration fictif en tête de fichier", () => {
    expect(seedSql.slice(0, 400)).toMatch(/DÉMONSTRATION/);
    expect(seedSql.slice(0, 800)).toMatch(/FICTIF/);
  });

  it("fournit un bloc truncate commenté (non exécuté) pour vider le jeu de démo", () => {
    expect(seedSql).toMatch(/^-- truncate table$/m);
  });

  it("crée au moins 4 sources dont Hennessy, CAP Pâtissier et Personnel", () => {
    const block = sliceInsertBlock(seedSql, "sources");
    expect(block).toMatch(/'Hennessy', 'hennessy'/);
    expect(block).toMatch(/'CAP Pâtissier', 'cap-patissier'/);
    expect(block).toMatch(/'Personnel', 'personnel'/);
    // Quatrième source, clairement démo.
    expect(block).toMatch(/Boulangerie Démo/);
    expect(block).toMatch(/démo/i);
    const sourceRows = block.match(/\(\s*'[^']+',\s*'[^']+',/g) ?? [];
    expect(sourceRows.length).toBeGreaterThanOrEqual(4);
  });

  it("crée exactement les 4 catégories propres à Hennessy, et aucune ailleurs", () => {
    const block = sliceInsertBlock(seedSql, "source_categories");
    const expectedCategories = [
      "Desserts à l''assiette",
      "Desserts boutique",
      "Recettes de base",
      "Petit-déjeuner",
    ];
    for (const category of expectedCategories) {
      expect(block).toContain(category);
    }
    // Toutes les lignes de ce bloc référencent la source Hennessy (aucune
    // catégorie créée pour une autre source).
    const rows = block.split("\n").filter((line) => line.includes("(select id from sources"));
    expect(rows).toHaveLength(expectedCategories.length);
    for (const row of rows) {
      expect(row).toContain("slug = 'hennessy'");
    }
  });

  it("crée les 6 matières premières canoniques exigées", () => {
    const block = sliceInsertBlock(seedSql, "canonical_ingredients");
    for (const name of ["Citron", "Pistache", "Chocolat", "Vanille", "Noisette", "Poire"]) {
      expect(block).toContain(`'${name}'`);
    }
  });

  it("relie les 3 alias exacts du citron au canonique Citron", () => {
    const block = sliceInsertBlock(seedSql, "ingredient_aliases");
    for (const alias of ["jus de citron", "zeste de citron", "purée de citron"]) {
      expect(block).toContain(`'${alias}'`);
    }
    // Les 3 lignes de ce bloc référencent bien le canonique 'citron'.
    const rows = block.split("\n").filter((line) => line.includes("(select id from canonical_ingredients"));
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toContain("slug = 'citron'");
    }
  });

  it("réutilise les libellés d'alias exacts comme original_name dans recipe_ingredients", () => {
    const block = sliceInsertBlock(seedSql, "recipe_ingredients");
    // Les libellés apparaissent en original_name, texte source intact malgré
    // la liaison au canonique (colonne suivante non nulle sur ces lignes).
    expect(block).toMatch(/'jus de citron', \(select id from canonical_ingredients where slug = 'citron'\)/);
    expect(block).toMatch(/'zeste de citron', \(select id from canonical_ingredients where slug = 'citron'\)/);
    expect(block).toMatch(/'purée de citron', \(select id from canonical_ingredients where slug = 'citron'\)/);
  });

  it("contient au moins une quantité 'QS' sur recipe_ingredients", () => {
    const block = sliceInsertBlock(seedSql, "recipe_ingredients");
    expect(block).toMatch(/'QS'/);
  });

  it("contient au moins une quantité entière, une décimale et une absente/à vérifier", () => {
    const block = sliceInsertBlock(seedSql, "recipe_ingredients");
    // Entière : original_quantity_text '200' avec quantity_decimal 200 numérique.
    expect(block).toMatch(/'200', 200,/);
    // Décimale : '62,5' (texte source, virgule française) -> 62.5 (décimal dérivé).
    expect(block).toMatch(/'62,5', 62\.5,/);
    // Absente/à vérifier : original_quantity_text null, verification_status needs_review.
    expect(block).toMatch(/'Beurre', null, null, null, null, 1, 'needs_review'/);
  });

  it("distingue un exemple 'confirmed' et un exemple 'proposed' sur recipe_specificities", () => {
    const block = sliceInsertBlock(seedSql, "recipe_specificities");
    expect(block).toMatch(/'confirmed'/);
    expect(block).toMatch(/'proposed'/);
  });

  it("distingue un exemple 'confirmed' et un exemple 'proposed' sur recipe_allergens", () => {
    const block = sliceInsertBlock(seedSql, "recipe_allergens");
    expect(block).toMatch(/'confirmed'/);
    expect(block).toMatch(/'proposed'/);
  });

  it("prévoit une recette sans photo_url et une recette avec photo_url fictive", () => {
    const block = sliceInsertBlock(seedSql, "recipes");
    expect(block).toMatch(/'pate-sablee-cap',\s*\n\s*null, null,/);
    expect(block).toMatch(/https:\/\/picsum\.photos\//);
  });

  it("prévoit une recette Hennessy détaillée avec additional_information renseigné", () => {
    const block = sliceInsertBlock(seedSql, "recipes");
    expect(block).toMatch(/'tarte-au-citron-hennessy'/);
    expect(block).toMatch(/Cuisson à blanc/);
  });

  it("prévoit deux recettes de même nom sur des sources différentes (préparations non globalisées)", () => {
    const block = sliceInsertBlock(seedSql, "recipes");
    expect(block).toContain("'Crème pâtissière (CAP)', 'creme-patissiere-cap'");
    expect(block).toContain("'Crème pâtissière (Hennessy)', 'creme-patissiere-hennessy'");
  });

  it("réserve la recette CAP « Pâte sablée » aux seuls ingrédients (aucune info complémentaire)", () => {
    const block = sliceInsertBlock(seedSql, "recipes");
    const row = block.split("\n").find((line) => line.includes("'pate-sablee-cap'"));
    // La ligne de titre/slug ne porte aucune donnée complémentaire elle-même ;
    // on vérifie la ligne additional_information/photo_url qui suit.
    const rowIndex = block.indexOf("'pate-sablee-cap'");
    const followingLine = block.slice(rowIndex, rowIndex + 120);
    expect(followingLine).toMatch(/null, null,/);
    expect(row).toBeDefined();
  });
});
