import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
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

function Titre({ id }: { id: Msg }) {
  const { t } = useI18n();
  return (
    <p className="mt-2 px-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-sourd/70">{t(id)}</p>
  );
}

/**
 * L'accueil, en quatre blocs : le coffre (solde, scène, entrer ou ouvrir),
 * le robinet (local ou réseau, suivi de la demande, pièces servies),
 * l'écosystème (les pages, par registre), puis ce que le coffre contient
 * (inventaire, bestiaire, envoi, pièces, sauvegarde).
 */
function Home() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const personnel = coffre.nature === "personnel";

  return (
    <Shell actuel="coffre">
      <section className="rounded-lg bg-carte px-5 py-6 text-center shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]">
        <p className="font-display text-[26px] font-light tabular-nums leading-none text-or">
          {formaterAtomes(solde)}
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-sourd">
          {t("coffre.eidolon")}
        </p>
      </section>

      <CoffreVue />

      {!personnel ? (
        <>
          <Titre id="accueil.entrer" />
          <Creer />
          <Sauvegarde />
        </>
      ) : null}

      <Titre id="accueil.robinet" />
      <Robinet />

      <Titre id="accueil.ecosysteme" />
      <Ecosysteme actuel="coffre" />

      <Titre id="accueil.contenu" />
      <Inventaire />
      <Bestiaire />
      {personnel ? <Envoi /> : null}
      <Sorties />
      {personnel ? <Sauvegarde /> : null}
    </Shell>
  );
}
