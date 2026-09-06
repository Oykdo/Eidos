import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Onglets } from "@/components/Onglets";
import { Atelier } from "@/components/Atelier";
import { Genese } from "@/components/Genese";
import { Cles } from "@/components/Cles";
import { Chaine } from "@/components/Chaine";
import { Merkle } from "@/components/Merkle";
import { useCoffre } from "@/lib/store";
import { useI18n, type Msg } from "@/lib/i18n.ts";

export const Route = createFileRoute("/journal")({ component: JournalPage });

type OngletJournal = "atelier" | "genese" | "cles" | "chaine" | "preuve";

const ONGLET_JOURNAL: { id: OngletJournal; label: Msg }[] = [
  { id: "atelier", label: "atelier.titre" },
  { id: "genese", label: "genese.titre" },
  { id: "cles", label: "cles.titre" },
  { id: "chaine", label: "chaine.titre" },
  { id: "preuve", label: "onglet.preuve" },
];

function JournalPage() {
  const { t } = useI18n();
  const hydrater = useCoffre((s) => s.hydrater);
  const [onglet, setOnglet] = useState<OngletJournal>("atelier");

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  return (
    <Shell actuel="journal">
      <Onglets items={ONGLET_JOURNAL} actuel={onglet} onChange={setOnglet} label={t("accueil.onglets")} />
      {onglet === "atelier" ? <Atelier /> : null}
      {onglet === "genese" ? <Genese /> : null}
      {onglet === "cles" ? <Cles /> : null}
      {onglet === "chaine" ? <Chaine /> : null}
      {onglet === "preuve" ? <Merkle /> : null}
    </Shell>
  );
}
