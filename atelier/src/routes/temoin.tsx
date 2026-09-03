import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Temoin } from "@/components/Temoin";
import { parserPreuveLien, parserTeteLien } from "@/lib/eidos/temoin.ts";
import { useCoffre } from "@/lib/store";

export type TemoinSearch = {
  tete?: string;
  preuve?: string;
};

export const Route = createFileRoute("/temoin")({
  validateSearch: (raw: Record<string, unknown>): TemoinSearch => ({
    tete: typeof raw.tete === "string" ? raw.tete : undefined,
    preuve: typeof raw.preuve === "string" ? raw.preuve : undefined,
  }),
  component: TemoinPage,
});

function TemoinPage() {
  const { tete, preuve } = Route.useSearch();
  const hydrater = useCoffre((s) => s.hydrater);
  const importerTete = useCoffre((s) => s.importerTete);
  const soumettrePreuve = useCoffre((s) => s.soumettrePreuve);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  useEffect(() => {
    if (!tete) return;
    const lu = parserTeteLien(tete);
    if ("erreur" in lu) return;
    importerTete(JSON.stringify(lu));
  }, [tete, importerTete]);

  useEffect(() => {
    if (!preuve) return;
    const lu = parserPreuveLien(preuve);
    if ("erreur" in lu) return;
    soumettrePreuve(lu);
  }, [preuve, soumettrePreuve]);

  return (
    <Shell actuel="temoin" sous="Seconde mémoire — sans les clés">
      <Temoin />
    </Shell>
  );
}
