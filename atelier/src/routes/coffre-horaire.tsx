import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { CoffreHoraire } from "@/components/CoffreHoraire";

export const Route = createFileRoute("/coffre-horaire")({ component: CoffreHorairePage });

function CoffreHorairePage() {
  return (
    <Shell actuel="coffreHoraire">
      <CoffreHoraire />
    </Shell>
  );
}
