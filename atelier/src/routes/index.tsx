import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mark } from "@/components/Mark";
import { Nav } from "@/components/Nav";
import { Atelier } from "@/components/Atelier";
import { Cles } from "@/components/Cles";
import { Envoi } from "@/components/Envoi";
import { Genese } from "@/components/Genese";
import { Sorties } from "@/components/Sorties";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { POUSSIERE_ATOMES } from "@/lib/eidos/constantes.ts";
import { useCoffre } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[560px] px-[18px] pt-[max(20px,env(safe-area-inset-top))] pb-[calc(32px+env(safe-area-inset-bottom))]">
      <header className="relative px-1 pb-7 pt-5 text-center">
        <div className="mb-3 flex justify-center">
          <Mark size={36} />
        </div>
        <h1 className="font-display text-[30px] font-light tracking-[0.42em] text-encre uppercase">
          Eidos
        </h1>
        <p className="mt-2 font-mono text-xs text-sourd">
          Réseau d'essai — sans valeur monétaire
        </p>
        <div className="mt-4">
          <Nav actuel="coffre" />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <section className="rounded-lg bg-carte px-5 py-6 text-center shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
          <p className="font-display text-[26px] font-light tabular-nums leading-none text-or">
            {formaterAtomes(solde)}
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-sourd">
            eidôlon en coffre
          </p>
          <p className="mt-3 font-mono text-[12px] text-sourd">
            {coffre.sorties.length} sortie{coffre.sorties.length === 1 ? "" : "s"} ·
            poussière {POUSSIERE_ATOMES.toLocaleString("fr-FR")} atomes
          </p>
        </section>

        <Genese />
        <Atelier />
        <Envoi />
        <Cles />
        <Sorties />

        <footer className="px-2 pt-4 pb-2 text-center font-mono text-[11px] leading-relaxed text-sourd">
          <p>
            La récompense ne se divise jamais. Une adresse se lit. Rien ne se croit,
            tout se rejoue.
          </p>
          <p className="mt-2">Sélection des sorties — portefeuille, pas validateur.</p>
        </footer>
      </div>
    </main>
  );
}
