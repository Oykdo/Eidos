import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Genese } from "@/components/Genese";
import { Cles } from "@/components/Cles";
import { Chaine } from "@/components/Chaine";
import { Merkle } from "@/components/Merkle";
import { useCoffre } from "@/lib/store";

export const Route = createFileRoute("/journal")({ component: JournalPage });

function JournalPage() {
  const hydrater = useCoffre((s) => s.hydrater);
  useEffect(() => {
    hydrater();
  }, [hydrater]);

  return (
    <Shell actuel="journal" sous="Genèse, clés, chaîne, preuve">
      <Genese />
      <Cles />
      <Chaine />
      <Merkle />
    </Shell>
  );
}
