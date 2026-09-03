import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { VoxelIcon } from "@/components/inventaire/VoxelIcon";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";
import { objetDePorte, racineDuCoffre, signatureDe } from "@/lib/eidos/inventaire.ts";
import { sceauObjet } from "@/lib/eidos/objets.ts";
import { combatDe, COMBAT_AXES, COMBAT_BUDGET } from "@/lib/eidos/combat.ts";
import { conjugue, produit, type Q } from "@/lib/eidos/cosmos.ts";
import { memeOrbite, memeRayon } from "@/lib/eidos/groupe.ts";
import { paireDe, qDeMot, resonanceDe, type Polarite } from "@/lib/eidos/resonance.ts";
import { ageOf, rewardAt } from "@/lib/eidos/eonis.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { posteDe, POSTE_JOUR } from "@/lib/eidos/poste.ts";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";

const VoxelCanvas = lazy(() => import("./VoxelCanvas"));

export function Inventaire() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const tirer = useCoffre((s) => s.tirer);
  const miner = useCoffre((s) => s.miner);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);
  const objets = coffre.objets ?? [];
  const tip = coffre.chaine[coffre.chaine.length - 1];
  const h = tip?.hauteur ?? 0;
  const suivant = rewardAt(h + 1);
  const deja = objets.some((o) => o.hauteur === h);
  const age = ageOf(h + 1);
  const poste = posteDe(coffre);
  const epuise = poste.restant <= 0;
  const [sel, setSel] = useState<number | null>(null);
  const [contre, setContre] = useState<number | null>(null);
  const [gl, setGl] = useState(false);
  const reduced = usePrefersReducedMotion();
  const choisi = sel != null ? (objets[sel] ?? null) : (objets[objets.length - 1] ?? null);
  const autre = contre != null ? (objets[contre] ?? null) : null;
  const racine = useMemo(() => racineDuCoffre(coffre), [coffre]);

  useEffect(() => {
    setGl(webglDisponible() && !reduced);
  }, [reduced]);

  return (
    <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-base font-normal text-encre">{t("inv.titre")}</h2>
        <p className="font-mono text-[11px] text-sourd">{t("inv.n", { n: objets.length })}</p>
      </div>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("inv.lede")}</p>
      <p className="mt-1 font-mono text-[11px] text-sourd">
        {t("inv.debit", {
          age: age?.nom ?? "Satya",
          r: formaterAtomes(suivant),
        })}
      </p>
      <p className="mt-1 font-mono text-[11px] text-sourd">
        {t("inv.poste", { n: poste.borne ? poste.restant : POSTE_JOUR, max: POSTE_JOUR })}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <Button type="button" variant="or" disabled={epuise} onClick={() => miner()}>
          {t("inv.miner", { r: formaterAtomes(suivant) })}
        </Button>
        <Button type="button" variant="discret" disabled={deja} onClick={() => tirer()}>
          {t("inv.tirer")}
        </Button>
      </div>
      <p className="mt-2 min-h-5 font-mono text-sm" role="status">
        {erreur ? <span className="text-fer">{erreur}</span> : null}
        {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
      </p>

      {objets.length === 0 ? (
        <p className="mt-3 font-mono text-[12px] text-sourd">{t("inv.vide")}</p>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {objets.map((o, i) => {
            const sig = signatureDe(o.archetype);
            const on = choisi === o;
            return (
              <button
                key={`${o.mot}-${o.hauteur}`}
                type="button"
                onClick={() => {
                  if (sel === i) {
                    if (contre != null) setContre(null);
                    else setSel(null);
                  } else if (contre === i) setContre(null);
                  else if (sel == null) setSel(i);
                  else setContre(i);
                }}
                className={cn(
                  "flex min-h-11 flex-col items-center rounded-sm bg-fond px-1 py-2",
                  on
                    ? "shadow-[0_0_0_2px_#c9a227]"
                    : contre === i
                      ? "shadow-[0_0_0_2px_#8a6a32]"
                      : "shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                <VoxelIcon objet={o} size={64} />
                <span className="mt-1 font-mono text-[10px] tracking-wide">
                  {sig.astre} {sig.muse}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {choisi ? (
        <div className="mt-4">
          <div className="relative mt-4 h-56 overflow-hidden rounded-md bg-fond">
            {gl ? (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <VoxelIcon objet={choisi} size={160} />
                  </div>
                }
              >
                <VoxelCanvas objet={choisi} />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center">
                <VoxelIcon objet={choisi} size={180} />
              </div>
            )}
          </div>
          <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-sourd">
            {t("inv.mot")} {choisi.mot.toString(16).padStart(8, "0")}
            {"\n"}
            {t("inv.sceau")} {sceauObjet(objetDePorte(choisi)).split(" ")[0]}
            {"\n"}
            {t("inv.racine")} {racine.slice(0, 8)}…{racine.slice(-8)}
            {"\n"}
            {choisi.age} · #{choisi.hauteur}
          </pre>
          <CombatBars porte={choisi} />
          <Resonance
            objets={objets}
            i={sel ?? objets.length - 1}
            j={contre}
            autre={autre}
          />
        </div>
      ) : null}
    </section>
  );
}

function CombatBars({ porte }: { porte: ObjetPorte }) {
  const { t } = useI18n();
  const c = combatDe(objetDePorte(porte));
  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {COMBAT_AXES.map((axe) => (
        <div key={axe} className="flex items-center gap-2">
          <span className="w-20 shrink-0 font-mono text-[11px] text-sourd">{t(`inv.${axe}` as Msg)}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-sm bg-creux">
            <div
              className={cn("h-full rounded-sm", axe === c.pointe ? "bg-or" : "bg-etain")}
              style={{ width: `${(c[axe] / COMBAT_BUDGET) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right font-mono text-[11px] tabular-nums text-encre">
            {c[axe]}
          </span>
        </div>
      ))}
      <p className="mt-1 font-mono text-[11px] text-sourd">{t("inv.budget")}</p>
    </div>
  );
}

function qStr(q: Q): string {
  return q.map((x) => x.toString()).join("  ");
}

function libellePolarite(p: Polarite): Msg {
  if (p === "constructif") return "inv.res.constructif";
  if (p === "destructif") return "inv.res.destructif";
  return "inv.res.neutre";
}

function Resonance({
  objets,
  i,
  j,
  autre,
}: {
  objets: ObjetPorte[];
  i: number;
  j: number | null;
  autre: ObjetPorte | null;
}) {
  const { t } = useI18n();
  const membres = useMemo(
    () => objets.map((o) => ({ q: qDeMot(o.mot), classe: o.archetype })),
    [objets],
  );
  const a = membres[i];
  const b = j != null ? membres[j] : null;

  if (objets.length < 2 || !a) {
    return <p className="mt-3 font-mono text-[11px] text-sourd">{t("inv.res.seul")}</p>;
  }

  if (autre && b) {
    const lec = paireDe(a, b, i, j!);
    const ab = produit(a.q, b.q);
    const ba = produit(b.q, a.q);
    const rendu = produit(conjugue(a.q), ab);
    const paré = memeRayon(rendu, b.q);
    const orbite = memeOrbite(ab, ba);
    return (
      <div className="mt-4 font-mono text-[11px] text-sourd">
        <p className="text-encre">{t("inv.res.paire")}</p>
        <p className={lec.polarite === "destructif" ? "text-fer" : "text-cuivre"}>
          {t(libellePolarite(lec.polarite))}
        </p>
        <pre className="mt-2 overflow-x-auto leading-relaxed">
          {t("inv.res.ab")}
          {"\n"}
          {qStr(ab)}
          {"\n"}
          {t("inv.res.ba")}
          {"\n"}
          {qStr(ba)}
        </pre>
        <p className="mt-2">
          {t("inv.res.orbite")} · {t(orbite ? "inv.res.oui" : "inv.res.non")}
        </p>
        <p>{t("inv.res.parer")} · {t(paré ? "inv.res.oui" : "inv.res.non")}</p>
      </div>
    );
  }

  const ens = resonanceDe(membres);
  return (
    <div className="mt-4 font-mono text-[11px] text-sourd">
      <p className="text-encre">{t("inv.res.titre")}</p>
      <p className="mt-1">{t("inv.res.hint")}</p>
      <p className="mt-1 text-cuivre">{t("inv.res.tenue", { n: ens.tenue.toString() })}</p>
      <p>
        {ens.nConstructif} {t("inv.res.constructif")} · {ens.nDestructif} {t("inv.res.destructif")}
      </p>
    </div>
  );
}


