import { Button } from "@/components/ui/button";
import { SCENARIOS } from "@/lib/eidos/wallet.ts";
import type { ScenarioId } from "@/lib/eidos/types.ts";
import { useCoffre } from "@/lib/store.ts";
import { Droplets } from "lucide-react";

const ORDRE: ScenarioId[] = ["mixte", "poussiere", "fragmente", "une-piece", "vide"];

export function Atelier() {
  const scenario = useCoffre((s) => s.coffre?.scenario);
  const charger = useCoffre((s) => s.charger);
  const robinet = useCoffre((s) => s.robinet);

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">Atelier</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Les deux trous de ARBRES.md : plusieurs entrées, et la poussière. Le
        validateur n'y touche pas.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ORDRE.map((id) => (
          <Button
            key={id}
            type="button"
            variant={scenario === id ? "or" : "discret"}
            size="chip"
            className="w-auto"
            onClick={() => void charger(id)}
          >
            {SCENARIOS[id].nom}
          </Button>
        ))}
      </div>
      {scenario ? (
        <p className="mt-4 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {SCENARIOS[scenario].aide}
        </p>
      ) : null}
      <Button
        type="button"
        variant="discret"
        className="mt-4"
        onClick={() => void robinet()}
      >
        <Droplets className="size-4" strokeWidth={1.75} />
        Robinet · +1 eidôlon
      </Button>
    </section>
  );
}
