import { useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Atelier } from "@/components/Atelier";
import { Envoi } from "@/components/Envoi";
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
    <Shell actuel="coffre" sous="Réseau d'essai — sans valeur monétaire">
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

      <Atelier />
      <Envoi />
      <Sorties />

      <p className="px-2 text-center font-mono text-[12px] text-sourd">
        <Link to="/journal" className="text-or hover:text-encre">
          Journal
        </Link>
        {" · "}
        <Link to="/temoin" className="text-or hover:text-encre">
          Témoin
        </Link>
        {" — la preuve vit ailleurs."}
      </p>
    </Shell>
  );
}
