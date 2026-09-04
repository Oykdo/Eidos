import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { qDeMot, paireDe } from "@/lib/eidos/resonance.ts";
import { produit, conjugue } from "@/lib/eidos/cosmos.ts";
import { memeOrbite, memeRayon } from "@/lib/eidos/groupe.ts";
import { agesScelles, porteDe, sceauxDuCoffre } from "@/lib/eidos/sceaux.ts";
import {
  ETAGES,
  TEINTE_BIOME,
  biomeDe,
  coupeDe,
  occupantsDe,
  resonanceEtage,
} from "@/lib/eidos/tour.ts";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";

const TourCanvas = lazy(() => import("./TourCanvas"));

export function TourView() {
  const { t } = useI18n();
  const hydrater = useCoffre((s) => s.hydrater);
  const objets = useCoffre((s) => s.coffre.objets) ?? [];
  const coffre = useCoffre((s) => s.coffre);
  const monde = useCoffre((s) => s.monde);
  const chargerMonde = useCoffre((s) => s.chargerMonde);
  const [etage, setEtage] = useState(0);
  const [k, setK] = useState(0);
  const [gl, setGl] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    hydrater();
  }, [hydrater]);
  useEffect(() => {
    setGl(webglDisponible() && !reduced);
  }, [reduced]);
  useEffect(() => {
    setK(0);
  }, [etage]);

  useEffect(() => {
    if (monde === null) void chargerMonde();
  }, [monde, chargerMonde]);

  const porteSuivante = porteDe(etage + 1, agesScelles(sceauxDuCoffre(monde, coffre), coffre), coffre);
  const biome = biomeDe(etage);
  const coupe = useMemo(() => coupeDe(etage), [etage]);
  const occupants = useMemo(() => occupantsDe(etage), [etage]);
  const lec = useMemo(() => resonanceEtage(etage), [etage]);
  const occ = occupants[k] ?? occupants[0]!;
  const porteur = objets[objets.length - 1] ?? null;

  const paire = useMemo(() => {
    if (!porteur || !occ) return null;
    const a = { q: qDeMot(porteur.mot), classe: porteur.archetype };
    const b = { q: occ.q, classe: occ.classe };
    const lecture = paireDe(a, b, 0, 1);
    const ab = produit(a.q, b.q);
    const ba = produit(b.q, a.q);
    const rendu = produit(conjugue(a.q), ab);
    return {
      lecture,
      orbite: memeOrbite(ab, ba),
      pare: memeRayon(rendu, b.q),
    };
  }, [porteur, occ]);

  return (
    <Shell actuel="tour">
      <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
        <h2 className="font-mono text-base font-normal text-encre">{t("tour.titre")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("tour.lede")}
        </p>
        <p className="mt-3 font-mono text-[13px] text-encre">
          {t("tour.etage", { n: etage, max: ETAGES - 1 })} · {biome.astre} {biome.muse}
        </p>
        <p className="mt-1 font-mono text-[11px] text-sourd">{t("tour.coupe")}</p>
        <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-sourd">
          {coupe.map((x) => x.toString()).join("  ")}
        </pre>

        <div className="relative mt-4 h-56 overflow-hidden rounded-md bg-fond">
          {gl ? (
            <Suspense fallback={<div className="h-full bg-fond" />}>
              <TourCanvas etage={etage} k={k} />
            </Suspense>
          ) : (
            <div
              className="flex h-full items-center justify-center font-mono text-[11px] text-sourd"
              style={{ color: TEINTE_BIOME[biome.id] }}
            >
              {biome.muse}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="discret"
            disabled={etage <= 0}
            onClick={() => setEtage((e) => Math.max(0, e - 1))}
          >
            {t("tour.descendre")}
          </Button>
          <Button
            type="button"
            variant="or"
            disabled={etage >= ETAGES - 1 || !porteSuivante.ouverte}
            onClick={() => setEtage((e) => Math.min(ETAGES - 1, e + 1))}
          >
            {t("tour.monter")}
          </Button>
          <Button asChild variant="discret">
            <Link to="/">{t("tour.ville")}</Link>
          </Button>
        </div>
        {porteSuivante.age ? (
          <p className={"mt-2 font-mono text-[12px] " + (porteSuivante.ouverte ? "text-cuivre" : "text-fer")}>
            {porteSuivante.ouverte
              ? t("tour.porte.ouverte", { n: etage + 1, age: porteSuivante.age })
              : t("tour.porte.fermee", { n: etage + 1, age: porteSuivante.age })}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {occupants.map((o) => (
            <button
              key={o.k}
              type="button"
              onClick={() => setK(o.k)}
              className="min-h-11 rounded-sm px-3 font-mono text-[11px] text-encre"
              style={{
                boxShadow:
                  k === o.k ? "0 0 0 2px #c9a227" : "0 0 0 1px rgb(198 203 209 / 0.24)",
              }}
            >
              {t("tour.occupant", { k: o.k })}
            </button>
          ))}
        </div>

        <p className="mt-3 font-mono text-[11px] text-sourd">
          {t("inv.res.tenue", { n: lec.tenue.toString() })} · {lec.nDestructif}{" "}
          {t("inv.res.destructif")}
        </p>

        {paire ? (
          <p className="mt-2 font-mono text-[11px] text-sourd">
            {t("tour.contre")} · {t(`inv.res.${paire.lecture.polarite}` as "inv.res.constructif")}
            {" · "}
            {t("inv.res.orbite")} {t(paire.orbite ? "inv.res.oui" : "inv.res.non")}
            {" · "}
            {t("inv.res.parer")} {t(paire.pare ? "inv.res.oui" : "inv.res.non")}
          </p>
        ) : (
          <p className="mt-2 font-mono text-[11px] text-sourd">{t("tour.sansObjet")}</p>
        )}
      </section>
    </Shell>
  );
}
