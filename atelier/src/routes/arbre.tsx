import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { CarteReliques } from "@/components/carte/CarteReliques";

/** /arbre garde son chemin (liens existants) ; la page est la carte des reliques du monde. */
export const Route = createFileRoute("/arbre")({
  component: CartePage,
});

function CartePage() {
  return (
    <Shell actuel="arbre">
      <CarteReliques />
    </Shell>
  );
}
