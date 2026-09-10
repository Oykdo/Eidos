import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { Caracteres } from "@/components/chymie/Caracteres.tsx";
import { Papier } from "@/components/papier/Papier.tsx";
import { FondOrbital } from "@/components/accueil/FondOrbital";
import { REPLIQUES_VEILLEE } from "@/lib/eidos/veillee-lexique.ts";
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
  const { t, locale } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);
  const reseauHauteur = useCoffre((s) => s.reseauHauteur);
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState<OngletAccueil>("coffre");
  // le fond orbital lit la tête suivie, sinon le dernier bloc local du coffre, sinon 0 : une lecture
  const hauteurFond = reseauHauteur ?? coffre.chaine.at(-1)?.hauteur ?? 0;

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const personnel = coffre.nature === "personnel";

  return (
    <Shell actuel="coffre">
      <FondOrbital
        hauteur={hauteurFond}
        langue={locale}
        repliques={REPLIQUES_VEILLEE}
        onAstre={(to) => void navigate({ to })}
      />
      {/* les cartes passent au-dessus du canevas fixe ; les gaps laissent passer survol et clic */}
      <div className="relative z-10 flex flex-col gap-4 pointer-events-none [&>*]:pointer-events-auto">
        <Onglets
          items={ONGLET_ACCUEIL}
          actuel={onglet}
          onChange={setOnglet}
          label={t("accueil.onglets")}
        />

        {onglet === "coffre" ? (
          <>
            <section className="rounded-lg bg-carte px-5 py-6 text-center shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] print:hidden">
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
            <Caracteres />
            <Papier />
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
          </>
        ) : null}
      </div>
    </Shell>
  );
}
