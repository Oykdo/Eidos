import { Button } from "@/components/ui/button";
import { SCENARIOS } from "@/lib/eidos/wallet.ts";
import type { ScenarioId } from "@/lib/eidos/types.ts";
import { useCoffre } from "@/lib/store.ts";
import { Droplets, Github } from "lucide-react";
import { GlyphAddress } from "@/components/GlyphAddress.tsx";

const ORDRE: ScenarioId[] = ["mixte", "poussiere", "fragmente", "une-piece", "vide"];

export function Atelier() {
  const scenario = useCoffre((s) => s.coffre?.scenario);
  const nature = useCoffre((s) => s.coffre?.nature);
  const charger = useCoffre((s) => s.charger);
  const robinet = useCoffre((s) => s.robinet);
  const robinetReseau = useCoffre((s) => s.robinetReseau);
  const demande = useCoffre((s) => s.demandeReseau);

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
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="discret" onClick={() => void robinet()}>
          <Droplets className="size-4" strokeWidth={1.75} />
          Atelier · +1 ici
        </Button>
        <Button type="button" variant="etain" onClick={() => void robinetReseau()}>
          <Github className="size-4" strokeWidth={1.75} />
          Réseau · 1 eidôlon
        </Button>
      </div>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {nature === "atelier"
          ? "Le réseau refuse la graine d'atelier (publique). Coffre personnel, puis Réseau."
          : "Réseau : une issue GitHub, le nœud verse au bloc suivant. Compte GitHub requis."}
      </p>
      {demande ? (
        <div className="mt-3 rounded-md bg-creux px-3 py-3">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
            Adresse à coller dans l'issue
          </p>
          <GlyphAddress hexa={demande.hexa} />
          <a
            href={demande.url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-mono text-[12.5px] text-etain underline-offset-2 hover:underline"
          >
            Ouvrir l'issue si le popup est bloqué
          </a>
        </div>
      ) : null}
    </section>
  );
}
