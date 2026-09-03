import { createFileRoute } from "@tanstack/react-router";
import { ArbreView } from "@/components/arbre/ArbreView";

export type ArbreSearch = {
  noeud?: number;
};

export const Route = createFileRoute("/arbre")({
  validateSearch: (raw: Record<string, unknown>): ArbreSearch => {
    const n = Number(raw.noeud);
    return {
      noeud: Number.isInteger(n) && n >= 0 ? n : undefined,
    };
  },
  component: ArbrePage,
});

function ArbrePage() {
  const { noeud } = Route.useSearch();
  return <ArbreView noeudCible={noeud} />;
}
