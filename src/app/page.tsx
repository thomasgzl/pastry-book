import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-12 text-center sm:px-8 sm:py-16">
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-cacao sm:text-4xl">
          Le Grand Livre de Pâtisserie
        </h1>
        <p className="mx-auto max-w-md text-base text-cacao/80">
          Fondations techniques en place. Design system et navigation à
          venir.
        </p>
      </div>

      {/* Démonstration des tokens B6 et des composants B7 — carte de
          recette fictive, clairement marquée « démo », en attendant les
          pages métier du lot C. */}
      <Card className="w-full max-w-sm text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-serif text-lg font-semibold text-cacao">
              Tarte au citron (démo)
            </p>
            <p className="text-sm text-cacao/70">CAP Pâtissier</p>
          </div>
          <Badge />
        </div>
        <p className="mt-3 text-sm text-cacao/80">
          Aperçu du thème ivoire, cacao et olive sur une carte de recette
          fictive.
        </p>
        <Button className="mt-4">Voir la recette</Button>
      </Card>
    </div>
  );
}
