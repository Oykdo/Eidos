/**
 * Bataille — la page. Elle tient une `Partie` (partie.ts) en état local :
 * une bataille est une jauge, elle ne s'écrit ni dans le coffre ni ailleurs,
 * et se perd quand on quitte la page — c'est voulu tant que rien n'est ancré
 * (feuille de route, C4 : ne pas exporter avant C2 bis).
 *
 * Deux surfaces de jeu, la même lecture : la scène 3D (BatailleCanvas) et la
 * grille de boutons sous elle, qui joue sans WebGL et au clavier. Un clic sur
 * une case = ce que `acteDeCase` en dit : un pas, une frappe, ou rien ; un
 * clic sur une unité du coffre la désigne. Chaque refus du moteur s'affiche
 * tel quel, quoi au lieu de quoi.
 */
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { occupantsRestants } from "@/lib/eidos/capsules.ts";
import { combatDe } from "@/lib/eidos/combat.ts";
import { objetDePorte, signatureDe } from "@/lib/eidos/inventaire.ts";
import { quartierDe } from "@/lib/eidos/sceaux.ts";
import { ETAGES, TEINTE_BIOME, biomeDe } from "@/lib/eidos/tour.ts";
import { feuillesRestantes, parcoursDe } from "@/lib/eidos/veillee.ts";
import { batailleDansCoffre, batailleEnlisee, mainsDe, salleTenue, veilleeDe } from "@/lib/eidos/veillee-tour.ts";
import {
  FEUILLES_LIBRES,
  MAX_COFFRE,
  acteDeCase,
  choisir,
  combattants,
  jouerActe,
  lire,
  ouvrirPartie,
  passerLaMain,
  type Lecture,
  type LectureUnite,
  type Partie,
} from "@/lib/eidos/tactique/partie.ts";
import {
  RejetTactique,
  type Acte,
  type Case,
  type Coup,
  type Issue,
} from "@/lib/eidos/tactique/types.ts";

const BatailleCanvas = lazy(() => import("./BatailleCanvas"));

/** Le texte de chaque issue : les mêmes clés que le moteur. */
const FIN: Record<Issue, Msg> = {
  victoire: "bataille.fin.victoire",
  defaite: "bataille.fin.defaite",
  epuise: "bataille.fin.epuise",
};

function Bloc({
  titre,
  children,
  className,
}: {
  titre: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-4 rounded-md bg-fond p-3", className)}>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">{titre}</p>
      {children}
    </div>
  );
}

function Puce({
  on,
  children,
  onClick,
  disabled,
}: {
  on: boolean;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        "rounded-sm px-2 py-1 font-mono text-[11px] transition-colors disabled:opacity-45",
        on ? "bg-or text-or-fg" : "bg-carte text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.18)]",
      )}
    >
      {children}
    </button>
  );
}

/** Ce qu'un acte annoncé dit, en un mot et une case. */
function libelleActe(a: Acte, t: ReturnType<typeof useI18n>["t"]): string {
  if (a.geste === "deplacer") return t("bataille.intention.deplacer", { x: a.vers.x, y: a.vers.y });
  if (a.geste === "frapper") return t("bataille.intention.frapper", { id: a.cible });
  return t("bataille.intention.passer");
}

function libelleCoup(c: Coup, t: ReturnType<typeof useI18n>["t"]): string {
  const termes = [
    `${c.base}`,
    c.accord !== 0 ? (c.accord > 0 ? `+${c.accord}` : `${c.accord}`) : null,
    c.dos ? `+${c.dos}` : null,
    c.allonge ? `+${c.allonge}` : null,
    c.charge ? `+${c.charge}` : null,
  ].filter((x): x is string => x !== null);
  return t(c.riposte ? "bataille.journal.riposte" : "bataille.journal.coup", {
    a: c.attaquant,
    c: c.cible,
    porte: c.porte,
    detail: termes.join(" "),
    tenue: c.tenueApres,
  });
}

export function BatailleView() {
  const { t } = useI18n();
  const hydrater = useCoffre((s) => s.hydrater);
  const coffre = useCoffre((s) => s.coffre);
  const batailleOuvrir = useCoffre((s) => s.batailleOuvrir);
  const batailleJouer = useCoffre((s) => s.batailleJouer);
  const bataillePasser = useCoffre((s) => s.bataillePasser);
  const erreurStore = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);
  const [partieLibre, setPartieLibre] = useState<Partie | null>(null);
  const [selectionVeillee, setSelectionVeillee] = useState<number | null>(null);
  const [choix, setChoix] = useState<number[]>([]);
  const [survol, setSurvol] = useState<Case | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [gl, setGl] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    hydrater();
  }, [hydrater]);
  useEffect(() => {
    setGl(webglDisponible() && !reduced);
  }, [reduced]);

  const etage = coffre.tour.etage;
  const biome = biomeDe(etage);
  const teinte = TEINTE_BIOME[biome.id];
  const lisibles = useMemo(() => combattants(coffre), [coffre]);
  const occupants = useMemo(() => occupantsRestants(coffre, etage), [coffre, etage]);
  // La veillée : sa bataille vit dans la jauge et se rejoue à chaque lecture ; la sélection, elle, est à la page.
  const w = veilleeDe(coffre);
  const enVeillee = w !== null && w.v.fin === null;
  const rejouee = useMemo(() => (enVeillee ? batailleDansCoffre(coffre) : null), [coffre, enVeillee]);
  const partie: Partie | null = useMemo(() => {
    if (!enVeillee) return partieLibre;
    if (!rejouee) return null;
    return selectionVeillee === null ? rejouee.partie : choisir(rejouee.partie, selectionVeillee);
  }, [enVeillee, partieLibre, rejouee, selectionVeillee]);
  const tenue = enVeillee && salleTenue(coffre);
  const enlisee = enVeillee && batailleEnlisee(coffre);
  const finie = enVeillee ? (w.bataille?.fin ?? null) : null;
  const lecture: Lecture | null = useMemo(
    () => (partie ? lire(partie, survol) : null),
    [partie, survol],
  );

  // Le coffre change d'étage ou d'objets : la partie libre en cours ne vaut plus, on la ferme.
  useEffect(() => {
    setPartieLibre(null);
    setChoix([]);
    setSelectionVeillee(null);
  }, [etage, coffre.objets]);

  const tenter = (f: () => Partie) => {
    try {
      setPartieLibre(f());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof RejetTactique ? e.message : String(e));
    }
  };

  const ouvrir = () => {
    if (enVeillee) {
      batailleOuvrir(choix);
      setSelectionVeillee(null);
      return;
    }
    tenter(() => ouvrirPartie(coffre, etage, choix, FEUILLES_LIBRES));
  };

  const jouer = (acte: Acte) => {
    if (enVeillee) {
      batailleJouer(acte);
      return;
    }
    if (!partie) return;
    tenter(() => jouerActe(partie, acte));
  };

  const surCase = (c: Case) => {
    if (!partie || !lecture) return;
    const unite = lecture.unites.find((u) => u.vivante && u.pos.x === c.x && u.pos.y === c.y);
    if (
      unite !== undefined &&
      unite.camp === "coffre" &&
      lecture.phase === "coffre" &&
      unite.id !== lecture.selection
    ) {
      if (enVeillee) setSelectionVeillee(unite.id);
      else setPartieLibre(choisir(partie, unite.id));
      setErreur(null);
      return;
    }
    const acte = acteDeCase(lecture, c);
    if (acte === null) return;
    jouer(acte);
  };

  const passerUnite = () => {
    if (!partie || !lecture || lecture.selection === null) return;
    jouer({ geste: "passer", unite: lecture.selection });
  };

  const passer = () => {
    if (enVeillee) {
      bataillePasser();
      return;
    }
    if (!partie) return;
    tenter(() => passerLaMain(partie));
  };

  const basculer = (indice: number) =>
    setChoix((prev) =>
      prev.includes(indice)
        ? prev.filter((i) => i !== indice)
        : prev.length < MAX_COFFRE
          ? [...prev, indice]
          : prev,
    );

  const elue: LectureUnite | null = lecture?.unites.find((u) => u.elue) ?? null;
  const muse = (archetype: string) => signatureDe(archetype).muse;

  return (
    <Shell actuel="bataille">
      <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
        <h2 className="font-mono text-base font-normal text-encre">{t("bataille.titre")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("bataille.lede")}
        </p>
        <p className="mt-3 font-mono text-[13px] text-encre">
          {t("tour.etage", { n: etage, max: ETAGES - 1 })} · {biome.astre} {biome.muse} ·{" "}
          {quartierDe(etage)}
        </p>
        <p className="mt-1 font-mono text-[11px] text-sourd">
          {enVeillee
            ? t("bataille.veillee", { i: parcoursDe(w.v).etape + 1, n: feuillesRestantes(w.v) })
            : t("bataille.libre", { n: FEUILLES_LIBRES })}
        </p>
        {enVeillee ? (
          <p className="mt-1 font-mono text-[12px] text-cuivre">
            {finie
              ? t(`veillee.bataille.finie.${finie}` as Msg, { t: w.bataille?.tour ?? 0 })
              : enlisee
                ? t("veillee.bataille.enlisee", { t: mainsDe(w.bataille!) })
                : tenue
                  ? t("veillee.salle.tenue", { n: occupants.length })
                  : t("veillee.salle.libre")}
            {flash && !finie ? ` · ${flash}` : ""}
          </p>
        ) : null}

        {!partie || !lecture ? (
          <>
            <Bloc titre={t("bataille.roster")}>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-sourd text-pretty">
                {t("bataille.roster.lede", { n: MAX_COFFRE })}
              </p>
              {lisibles.length === 0 ? (
                <p className="mt-2 font-mono text-[12px] text-fer">{t("bataille.roster.vide")}</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {lisibles.map(({ indice, objet }) => {
                    const axes = combatDe(objetDePorte(objet));
                    return (
                      <Puce
                        key={indice}
                        on={choix.includes(indice)}
                        onClick={() => basculer(indice)}
                        disabled={!choix.includes(indice) && choix.length >= MAX_COFFRE}
                      >
                        {objet.nom || muse(objet.archetype)} · {t("inv.lame")} {axes.lame} ·{" "}
                        {t("inv.ecu")} {axes.ecu} · {t("inv.eperon")} {axes.eperon} · {t("inv.arc")}{" "}
                        {axes.arc}
                      </Puce>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 font-mono text-[11px] text-sourd">
                {occupants.length === 0
                  ? t("bataille.sansOccupant")
                  : t("bataille.occupants", { n: occupants.length })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="or"
                  disabled={choix.length === 0 || occupants.length === 0}
                  onClick={ouvrir}
                >
                  {t("bataille.ouvrir")}
                </Button>
                <Button asChild variant="discret">
                  <Link to="/tour">{t("bataille.versTour")}</Link>
                </Button>
              </div>
            </Bloc>
          </>
        ) : (
          <>
            <p className="mt-3 font-mono text-[12px] text-encre">
              {t("bataille.tour", { n: lecture.tour })} ·{" "}
              {t(
                lecture.phase === "coffre" ? "bataille.phase.coffre" : "bataille.phase.indechiffre",
              )}{" "}
              · {t("bataille.feuilles", { n: lecture.feuilles })}
            </p>
            <p className="mt-1 font-mono text-[10px] text-sourd" title={partie.trace}>
              {t("bataille.trace")} {partie.trace.slice(0, 16)}…
            </p>

            <div className="relative mt-3 h-72 overflow-hidden rounded-md bg-fond">
              {gl ? (
                <Suspense fallback={<div className="h-full bg-fond" />}>
                  <BatailleCanvas
                    lecture={lecture}
                    avant={partie.avant}
                    derniers={partie.derniers}
                    teinte={teinte}
                    onCase={surCase}
                    onSurvol={setSurvol}
                  />
                </Suspense>
              ) : (
                <div
                  className="flex h-full items-center justify-center font-mono text-[11px] text-sourd"
                  style={{ color: teinte }}
                >
                  {biome.muse}
                </div>
              )}
              {lecture.fin !== null ? (
                <div className="absolute inset-x-0 bottom-0 bg-carte/85 px-3 py-2 font-mono text-[12px] text-encre">
                  {t(FIN[lecture.fin.issue], { n: lecture.fin.tour })}
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex items-start gap-3">
              <div
                className="grid w-44 shrink-0 gap-[2px]"
                style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}
                aria-label={t("bataille.dalle")}
              >
                {lecture.cases.flatMap((ligne) =>
                  ligne.map((c) => {
                    const u = lecture.unites.find(
                      (v) => v.vivante && v.pos.x === c.x && v.pos.y === c.y,
                    );
                    const acte = acteDeCase(lecture, c);
                    const designable =
                      u !== undefined && u.camp === "coffre" && lecture.phase === "coffre";
                    const signe = u
                      ? u.camp === "coffre"
                        ? u.elue
                          ? "◆"
                          : "◇"
                        : "✕"
                      : c.chemin
                        ? "·"
                        : c.cout !== null
                          ? String(c.cout)
                          : "";
                    const fond = c.pleine
                      ? teinte
                      : c.chemin
                        ? "#c9a227"
                        : c.cout !== null
                          ? "#2b3340"
                          : "#0e1116";
                    return (
                      <button
                        key={`${c.x}-${c.y}`}
                        type="button"
                        disabled={acte === null && !designable}
                        onClick={() => surCase(c)}
                        onMouseEnter={() => setSurvol(c)}
                        onMouseLeave={() => setSurvol(null)}
                        title={
                          u
                            ? `(${c.x}, ${c.y}) · ${t("bataille.unite", { id: u.id })} · ${t("bataille.tenue", { n: u.tenue, max: u.tenueMax })}`
                            : `(${c.x}, ${c.y})`
                        }
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-[1px] font-mono text-[9px] leading-none disabled:cursor-default",
                          u?.coup ? "text-fer" : c.menace ? "text-fer" : "text-encre",
                          c.controle && !c.pleine ? "opacity-70" : "",
                        )}
                        style={{
                          background: fond,
                          boxShadow: c.menace && !c.pleine ? "inset 0 0 0 1px #a8332a" : undefined,
                        }}
                      >
                        {signe}
                      </button>
                    );
                  }),
                )}
              </div>
              <div className="min-w-0 font-mono text-[11px] text-sourd">
                <p>{t("bataille.dalle")}</p>
                <p className="mt-1 leading-relaxed text-pretty">{t("bataille.legende")}</p>
              </div>
            </div>

            {erreur ? <p className="mt-2 font-mono text-[12px] text-fer">{erreur}</p> : null}

            <Bloc titre={t("bataille.unite.titre")}>
              {elue ? (
                <div className="mt-1 font-mono text-[12px] text-encre">
                  <p>
                    {t("bataille.unite", { id: elue.id })} · {muse(elue.archetype)} ·{" "}
                    {t("bataille.tenue", { n: elue.tenue, max: elue.tenueMax })} ·{" "}
                    {t("bataille.pa", { n: elue.pa })}
                  </p>
                  <p className="mt-1 text-sourd">
                    {t("inv.lame")} {elue.axes.lame} · {t("inv.ecu")} {elue.axes.ecu} ·{" "}
                    {t("inv.eperon")} {elue.axes.eperon} · {t("inv.arc")} {elue.axes.arc} ·{" "}
                    {t("bataille.pas", { n: elue.pas })} ·{" "}
                    {t("bataille.portee", { n: elue.portee })}
                  </p>
                  {lecture.unites.filter((u) => u.coup !== null).length > 0 ? (
                    <ul className="mt-2 space-y-0.5 text-sourd">
                      {lecture.unites
                        .filter((u) => u.coup !== null)
                        .map((u) => (
                          <li key={u.id}>
                            {t("bataille.cible", {
                              id: u.id,
                              porte: u.coup!.porte,
                              tenue: u.coup!.tenueApres,
                            })}
                            {u.riposte
                              ? ` · ${t("bataille.ripostePrevue", { porte: u.riposte.porte })}`
                              : ""}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 font-mono text-[12px] text-sourd">
                  {lecture.phase === "coffre"
                    ? t("bataille.unite.aucune")
                    : t("bataille.phase.indechiffre")}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="discret"
                  size="sm"
                  disabled={!elue || lecture.fin !== null}
                  onClick={passerUnite}
                >
                  {t("bataille.passer")}
                </Button>
                <Button
                  type="button"
                  variant={lecture.aJoue ? "or" : "discret"}
                  size="sm"
                  disabled={lecture.fin !== null || lecture.phase !== "coffre"}
                  onClick={passer}
                >
                  {t("bataille.passerLaMain")}
                </Button>
                {enVeillee ? null : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPartieLibre(null)}>
                    {t("bataille.recommencer")}
                  </Button>
                )}
              </div>
            </Bloc>

            <Bloc titre={t("bataille.telegraphie")}>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-sourd text-pretty">
                {t("bataille.telegraphie.lede")}
              </p>
              {lecture.intentions.length === 0 ? (
                <p className="mt-1 font-mono text-[12px] text-sourd">
                  {t("bataille.telegraphie.aucune")}
                </p>
              ) : (
                <ul className="mt-2 space-y-0.5 font-mono text-[12px] text-encre">
                  {lecture.intentions.map((i) => (
                    <li key={i.unite}>
                      {t("bataille.unite", { id: i.unite })} —{" "}
                      {i.actes.length === 0
                        ? t("bataille.intention.rien")
                        : i.actes.map((a) => libelleActe(a, t)).join(", ")}
                      {i.menace.length > 0
                        ? ` · ${t("bataille.menace", { n: i.menace.length })}`
                        : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Bloc>

            <Bloc titre={t("bataille.journal")}>
              {lecture.journal.length === 0 ? (
                <p className="mt-1 font-mono text-[12px] text-sourd">
                  {t("bataille.journal.vide")}
                </p>
              ) : (
                <ul className="mt-2 space-y-0.5 font-mono text-[12px] text-encre">
                  {lecture.journal.map((c, i) => (
                    <li key={i} className={c.riposte ? "text-sourd" : ""}>
                      {libelleCoup(c, t)}
                      {c.retiree ? ` · ${t("bataille.journal.retiree")}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </Bloc>
          </>
        )}
        {!partie && erreur ? <p className="mt-2 font-mono text-[12px] text-fer">{erreur}</p> : null}
        {enVeillee && erreurStore ? <p className="mt-2 font-mono text-[12px] text-fer">{erreurStore}</p> : null}
      </section>
    </Shell>
  );
}
