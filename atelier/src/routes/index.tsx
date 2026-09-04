import { useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Creer } from "@/components/Creer";
import { Envoi } from "@/components/Envoi";
import { Sorties } from "@/components/Sorties";
import { Inventaire } from "@/components/inventaire/Inventaire";
import { Bestiaire } from "@/components/inventaire/Bestiaire";
import { CoffreVue } from "@/components/coffre/CoffreVue";
import { Sauvegarde } from "@/components/Sauvegarde";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { useCoffre } from "@/lib/store";
import { useI18n } from "@/lib/i18n.ts";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);

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

      <p className="text-center">
        <Link
          to="/tour"
          className="inline-flex h-8 items-center rounded-sm px-2.5 font-mono text-[11px] tracking-wide text-sourd shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)] hover:text-encre"
        >
          {t("tour.titre")}
        </Link>
      </p>

      <Inventaire />
      <Bestiaire />

      <Creer />
      {coffre.nature === "personnel" ? <Envoi /> : null}
      <Sorties />
      <Sauvegarde />
    </Shell>
  );
}
