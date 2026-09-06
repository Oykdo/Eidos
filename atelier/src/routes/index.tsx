import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Onglets } from "@/components/Onglets";
import { Creer } from "@/components/Creer";
import { Envoi } from "@/components/Envoi";
import { Sorties } from "@/components/Sorties";
import { Robinet } from "@/components/Robinet";
import { Ecosysteme } from "@/components/Ecosysteme";
import { Inventaire } from "@/components/inventaire/Inventaire";
import { Bestiaire } from "@/components/inventaire/Bestiaire";
import { CoffreVue } from "@/components/coffre/CoffreVue";
import { Sauvegarde } from "@/components/Sauvegarde";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { useCoffre } from "@/lib/store";
import { useI18n, type Msg } from "@/lib/i18n.ts";

export const Route = createFileRoute("/")({ component: Home });

type OngletAccueil = "coffre" | "robinet" | "eco" | "contenu";

const ONGLET_ACCUEIL: { id: OngletAccueil; label: Msg }[] = [
  { id: "coffre", label: "nav.coffre" },
  { id: "robinet", label: "accueil.robinet" },
  { id: "eco", label: "accueil.ecosysteme" },
  { id: "contenu", label: "accueil.contenu" },
];

function Home() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);
  const [onglet, setOnglet] = useState<OngletAccueil>("coffre");

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const personnel = coffre.nature === "personnel";

  return (
    <Shell actuel="coffre">
      <Onglets items={ONGLET_ACCUEIL} actuel={onglet} onChange={setOnglet} label={t("accueil.onglets")} />

      {onglet === "coffre" ? (
        <>
          <section className="rounded-lg bg-carte px-5 py-6 text-center shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
            <p className="font-display text-[26px] font-light tabular-nums leading-none text-or">
              {formaterAtomes(solde)}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-sourd">
              {t("coffre.eidolon")}
            </p>
          </section>
          <CoffreVue />
          {!personnel ? <Creer /> : null}
          <Sauvegarde />
        </>
      ) : null}

      {onglet === "robinet" ? <Robinet /> : null}

      {onglet === "eco" ? <Ecosysteme actuel="coffre" /> : null}

      {onglet === "contenu" ? (
        <>
          <Inventaire />
          <Bestiaire />
          {personnel ? <Envoi /> : null}
          <Sorties />
          {personnel ? <Sauvegarde /> : null}
        </>
      ) : null}
    </Shell>
  );
}
