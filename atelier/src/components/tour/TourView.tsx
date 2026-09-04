import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { GlypheSvg } from "@/components/Mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { paireDe, qDeMot } from "@/lib/eidos/resonance.ts";
import { agesScelles, porteDe, quartierDe, sceauxDuCoffre } from "@/lib/eidos/sceaux.ts";
import { ETAGES, TEINTE_BIOME, biomeDe, coupeDe, dalleDe } from "@/lib/eidos/tour.ts";
import { demandeSatisfaite, hoteDe } from "@/lib/eidos/hotes.ts";
import { FIOLES, especeActive, especeDePorte } from "@/lib/eidos/elixirs.ts";
import {
  lirePrise,
  libereeDe,
  occupantsRestants,
  porteurDe,
  resonanceEtageDuCoffre,
} from "@/lib/eidos/capsules.ts";
import {
  echosDuQuartier,
  estObservatoire,
  lectureObservatoire,
  lireDuel,
  ticketPour,
} from "@/lib/eidos/secrets.ts";
import { bestiaireDe, lectureUranie } from "@/lib/eidos/bestiaire.ts";
import { alignementCentiemes, figureOrbite } from "@/lib/eidos/lecture.ts";
import { FIGURES } from "@/lib/eidos/constantes.ts";
import { signatureDe } from "@/lib/eidos/inventaire.ts";
import { PORTES } from "@/lib/eidos/sceaux.ts";
import { enCours } from "@/lib/eidos/ascension.ts";
import {
  aUneTrouvaille,
  bechesRestantes,
  caseOccupant,
  fouillesFaites,
  spawnIci,
} from "@/lib/eidos/fouilles.ts";
import { tourDe } from "@/lib/eidos/jauge.ts";
import { Pendule } from "@/components/tour/Pendule";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

const TourCanvas = lazy(() => import("./TourCanvas"));

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
  teinte,
}: {
  on: boolean;
  children: ReactNode;
  onClick: () => void;
  teinte?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-sm px-2.5 font-mono text-[11px] text-encre"
      style={{
        boxShadow: on ? `0 0 0 2px ${teinte ?? "#c9a227"}` : "0 0 0 1px rgb(198 203 209 / 0.24)",
      }}
    >
      {children}
    </button>
  );
}

export function TourView() {
  const { t, locale } = useI18n();
  const hydrater = useCoffre((s) => s.hydrater);
  const coffre = useCoffre((s) => s.coffre);
  const monde = useCoffre((s) => s.monde);
  const reseau = useCoffre((s) => s.reseau);
  const chargerMonde = useCoffre((s) => s.chargerMonde);
  const allerEtage = useCoffre((s) => s.allerEtage);
  const honorer = useCoffre((s) => s.honorer);
  const boire = useCoffre((s) => s.boire);
  const porter = useCoffre((s) => s.porter);
  const liberer = useCoffre((s) => s.liberer);
  const prendre = useCoffre((s) => s.prendre);
  const franchir = useCoffre((s) => s.franchir);
  const fouiller = useCoffre((s) => s.fouiller);
  const fouillerCase = useCoffre((s) => s.fouillerCase);
  const capsuleThalie = useCoffre((s) => s.capsuleThalie);
  const forgerCapsule = useCoffre((s) => s.forgerCapsule);
  const tournerTour = useCoffre((s) => s.tournerTour);
  const accorder = useCoffre((s) => s.accorder);
  const offrir = useCoffre((s) => s.offrir);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);

  const objets = coffre.objets ?? [];
  const tour = coffre.tour;
  const etage = tour.etage;
  const [k, setK] = useState(0);
  const [capsule, setCapsule] = useState<number | null>(null);
  const [outil, setOutil] = useState<number | null>(null);
  const [piece, setPiece] = useState<number | null>(null);
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
    setOutil(null);
    setPiece(null);
  }, [etage]);
  useEffect(() => {
    if (monde === null) void chargerMonde();
  }, [monde, chargerMonde]);

  const ages = useMemo(() => agesScelles(sceauxDuCoffre(monde, coffre), coffre), [monde, coffre]);
  const porteSuivante = porteDe(etage + 1, ages, coffre);
  const ascensionActive = enCours(coffre);
  const biome = biomeDe(etage);
  const coupe = useMemo(() => coupeDe(etage), [etage]);
  const dalle = useMemo(() => dalleDe(etage), [etage]);
  const occupants = useMemo(() => occupantsRestants(coffre, etage), [coffre, etage]);
  const jauge = useMemo(() => tourDe(coffre), [coffre]);
  const faites = useMemo(() => fouillesFaites(jauge, etage), [jauge, etage]);
  const arrivee = spawnIci(coffre, etage);
  const beches = bechesRestantes(jauge, etage);
  const lec = useMemo(() => resonanceEtageDuCoffre(coffre, etage), [coffre, etage]);
  const occ = occupants.find((o) => o.k === k) ?? occupants[0] ?? null;
  const porteur = porteurDe(coffre);
  const liberee = libereeDe(coffre);
  const hote = useMemo(() => hoteDe(etage), [etage]);
  const honore = tour.dons.includes(etage);
  const demandeOk = hote ? demandeSatisfaite(hote, coffre, { ages }) : false;
  const sel = especeActive(coffre, etage, "sel");
  const mercure = especeActive(coffre, etage, "mercure");
  const soufre = especeActive(coffre, etage, "soufre");
  const ticket = ticketPour(coffre, etage);
  const antreFranchi = tour.antres.includes(etage);
  const duel = useMemo(
    () => (ticket >= 0 && !antreFranchi ? lireDuel(coffre, etage) : null),
    [coffre, etage, ticket, antreFranchi],
  );
  const elixirs = objets.map((o, i) => [o, i] as const).filter(([o]) => o.genre === "elixir");
  const capsules = objets.map((o, i) => [o, i] as const).filter(([o]) => o.genre === "capsule");
  const captures = objets.map((o, i) => [o, i] as const).filter(([o]) => o.genre === "capture");
  const portables = objets
    .map((o, i) => [o, i] as const)
    .filter(([o]) => o.genre !== "elixir" && o.genre !== "capsule" && o.genre !== "capture");
  const cap =
    capsule !== null && objets[capsule]?.genre === "capsule"
      ? objets[capsule]!
      : (capsules[0]?.[0] ?? null);
  const capIndex =
    capsule !== null && objets[capsule]?.genre === "capsule" ? capsule : (capsules[0]?.[1] ?? null);

  const paire = useMemo(() => {
    if (!porteur || !occ) return null;
    const a = { q: qDeMot(porteur.mot), classe: porteur.archetype };
    const b = { q: occ.q, classe: occ.classe };
    return {
      lecture: paireDe(a, b, 0, 1),
      figures: [figureOrbite(a.q), figureOrbite(b.q)] as const,
      alignement: alignementCentiemes(a.q, b.q),
    };
  }, [porteur, occ]);

  const prise = useMemo(
    () => (cap && occ ? lirePrise(cap, porteur, occ, sel) : null),
    [cap, occ, porteur, sel],
  );
  const echos = useMemo(() => echosDuQuartier(quartierDe(etage)), [etage]);
  const fig = (n: number) => FIGURES[Math.max(0, Math.min(3, n))]!;
  const museDe = (o: ObjetPorte) => signatureDe(o.archetype).muse;

  return (
    <Shell actuel="tour">
      <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
        <h2 className="font-mono text-base font-normal text-encre">{t("tour.titre")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("tour.lede")}
        </p>
        <p className="mt-3 font-mono text-[13px] text-encre">
          {t("tour.etage", { n: etage, max: ETAGES - 1 })} · {biome.astre} {biome.muse} ·{" "}
          {quartierDe(etage)}
        </p>
        <p className="mt-1 font-mono text-[11px] text-sourd">{t("tour.coupe")}</p>
        <pre className="mt-1 overflow-x-auto font-mono text-[11px] text-sourd">
          {coupe.map((x) => x.toString()).join("  ")}
        </pre>

        <div
          className={cn(
            "relative mt-4 h-56 overflow-hidden rounded-md bg-fond",
            duel ? "brightness-50" : "",
          )}
        >
          {gl ? (
            <Suspense fallback={<div className="h-full bg-fond" />}>
              <TourCanvas etage={etage} k={occ?.k ?? 0} />
            </Suspense>
          ) : (
            <div
              className="flex h-full items-center justify-center font-mono text-[11px] text-sourd"
              style={{ color: TEINTE_BIOME[biome.id] }}
            >
              {biome.muse}
            </div>
          )}
          {hote ? (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-sm bg-carte/80 px-1.5 py-1">
              <GlypheSvg etages={hote.visage} className="h-9 w-4" />
            </div>
          ) : null}
        </div>
        <div className="mt-2 flex items-start gap-3">
          <div
            className="grid w-44 shrink-0 gap-[2px]"
            style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}
            aria-label={t("tour.dalle")}
          >
            {dalle.flatMap((row, y) =>
              row.map((b, x) => {
                const creusee = faites.some((f) => f.x === x && f.y === y);
                const ici = arrivee !== null && arrivee.x === x && arrivee.y === y;
                const occupant = occupants.find((o) => {
                  const k = caseOccupant(o.k);
                  return k.x === x && k.y === y;
                });
                // La case d'arrivée se creuse même sur un trou (fouilles.ts) ; un occupant
                // se désigne d'un premier clic, sa case se creuse au second.
                const creusable = (b || ici) && !creusee && beches > 0;
                const selectionnable = occupant !== undefined && occ?.k !== occupant.k;
                const signe = ici
                  ? "◆"
                  : occupant
                    ? "○"
                    : creusee
                      ? aUneTrouvaille(etage, x, y)
                        ? "✓"
                        : "·"
                      : "";
                return (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    disabled={!creusable && !selectionnable}
                    onClick={() => (selectionnable ? setK(occupant.k) : fouillerCase(x, y))}
                    title={
                      occupant
                        ? `(${x}, ${y}) · ${t("tour.occupant", { k: occupant.k })}`
                        : `(${x}, ${y})`
                    }
                    className="flex aspect-square items-center justify-center rounded-[1px] font-mono text-[9px] leading-none text-encre disabled:cursor-default"
                    style={{
                      background: b ? TEINTE_BIOME[biome.id] : "#0e1116",
                      opacity: b && creusee ? 0.55 : 1,
                    }}
                  >
                    {signe}
                  </button>
                );
              }),
            )}
          </div>
          <div className="min-w-0 font-mono text-[11px] text-sourd">
            <p>
              {t("tour.dalle")} · {t("tour.dalle.beches", { n: beches })}
            </p>
            <p className="mt-1 leading-relaxed text-pretty">{t("tour.dalle.lede")}</p>
          </div>
        </div>

        <Pendule />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="discret"
            disabled={etage <= 0 || ascensionActive}
            onClick={() => allerEtage(etage - 1)}
          >
            {t("tour.descendre")}
          </Button>
          <Button
            type="button"
            variant="or"
            disabled={etage >= ETAGES - 1 || !porteSuivante.ouverte || ascensionActive}
            onClick={() => allerEtage(etage + 1)}
          >
            {t("tour.monter")}
          </Button>
          <Button type="button" variant="discret" onClick={() => fouiller()}>
            {t("tour.fouiller")}
          </Button>
          <Button asChild variant="discret">
            <Link to="/">{t("tour.ville")}</Link>
          </Button>
        </div>
        {porteSuivante.age ? (
          <p
            className={
              "mt-2 font-mono text-[12px] " + (porteSuivante.ouverte ? "text-cuivre" : "text-fer")
            }
          >
            {porteSuivante.ouverte
              ? t("tour.porte.ouverte", { n: etage + 1, age: porteSuivante.age })
              : t("tour.porte.fermee", { n: etage + 1, age: porteSuivante.age })}
          </p>
        ) : null}
        <p className="mt-2 min-h-5 font-mono text-sm" role="status">
          {erreur ? <span className="text-fer">{erreur}</span> : null}
          {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
        </p>

        {hote ? (
          <Bloc titre={t("tour.hote")}>
            <div className="mt-2 flex items-start gap-3">
              <GlypheSvg etages={hote.visage} className="h-14 w-7 shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[13px] text-encre">
                  {hote.majeur
                    ? `${signatureDe(hote.muse).astre} ${signatureDe(hote.muse).muse}, ${hote.role[locale]}`
                    : t("tour.hote.familier", {
                        role: hote.role[locale],
                        muse: signatureDe(hote.muse).muse,
                      })}
                </p>
                {hote.repliques[locale].map((r, i) => (
                  <p key={i} className="mt-1 font-mono text-[12px] leading-relaxed text-sourd">
                    « {r} »
                  </p>
                ))}
              </div>
            </div>
            <p className="mt-2 font-mono text-[11px] text-sourd">
              {t(`tour.demande.${hote.demande}` as Msg, {
                muse: signatureDe(biome.id).muse,
                age: quartierDe(etage),
              })}
              {hote.demande !== "rien"
                ? ` · ${t(demandeOk ? "tour.demande.oui" : "tour.demande.non")}`
                : ""}
            </p>
            <p className="mt-1 font-mono text-[11px] text-sourd">
              {hote.don.genre === "elixir"
                ? t("tour.don.elixir", { espece: t(`tour.espece.${hote.don.espece}` as Msg) })
                : hote.don.genre === "service"
                  ? t(`tour.don.${hote.don.service}` as Msg)
                  : t(`tour.don.${hote.don.genre}` as Msg)}
              {honore ? ` · ${t("tour.honore")}` : ""}
            </p>
            {hote.don.genre !== "service" ? (
              <Button
                type="button"
                variant="or"
                size="sm"
                className="mt-2"
                disabled={honore || !demandeOk}
                onClick={() => honorer()}
              >
                {t("tour.honorer")}
              </Button>
            ) : null}

            {hote.majeur && hote.muse === "terre" ? (
              <Button
                type="button"
                variant="discret"
                size="sm"
                className="mt-2"
                onClick={() => capsuleThalie()}
              >
                {t("tour.thalie.capsule")}
              </Button>
            ) : null}

            {hote.majeur && hote.muse === "mars" ? (
              <Forge
                objets={objets}
                outil={outil}
                piece={piece}
                setOutil={setOutil}
                setPiece={setPiece}
                onTourner={() => outil !== null && piece !== null && tournerTour(outil, piece)}
                onForger={() => outil !== null && piece !== null && forgerCapsule(outil, piece)}
              />
            ) : null}

            {hote.majeur && hote.muse === "saturne" ? (
              <div className="mt-2">
                <p className="font-mono text-[11px] text-sourd">{t("tour.echos")}</p>
                {honore ? (
                  <p className="mt-1 font-mono text-[11px] text-encre">
                    {echos
                      .map(
                        ([a, b]) =>
                          `${a}·${b}${tour.echos.some((p) => p[0] === a && p[1] === b) ? " ✓" : ""}`,
                      )
                      .join("   ")}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-[11px] text-sourd">{t("tour.echos.fermes")}</p>
                )}
                <p className="mt-1 font-mono text-[11px] text-sourd">
                  {t("tour.hymnes", { n: bestiaireDe(coffre).remplies.length })}
                </p>
              </div>
            ) : null}

            {hote.majeur && hote.muse === "venus" ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {captures.map(([o, i]) => (
                  <Button
                    key={i}
                    type="button"
                    variant="discret"
                    size="chip"
                    onClick={() => offrir(i)}
                  >
                    {t("tour.offrir", { nom: o.nom })}
                  </Button>
                ))}
              </div>
            ) : null}
          </Bloc>
        ) : null}

        {estObservatoire(etage) ? <Observatoire coffre={coffre} reseau={reseau} /> : null}

        <Bloc titre={t("tour.porteur")}>
          <div className="mt-2 flex flex-wrap gap-1">
            {portables.map(([o, i]) => (
              <Puce key={i} on={porteur === o} onClick={() => porter(o.mot)}>
                {o.nom} · {museDe(o)} · {fig(figureOrbite(qDeMot(o.mot)))}
              </Puce>
            ))}
            {portables.length === 0 ? (
              <p className="font-mono text-[11px] text-sourd">{t("tour.sansObjet")}</p>
            ) : null}
          </div>
          {captures.length > 0 ? (
            <div className="mt-2">
              <p className="font-mono text-[11px] text-sourd">{t("tour.liberer")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Puce on={liberee === null} onClick={() => liberer(null)}>
                  {t("tour.liberee.aucune")}
                </Puce>
                {captures.map(([o, i]) => (
                  <Puce key={i} on={liberee === o} onClick={() => liberer(o.mot)} teinte="#3e8e6e">
                    {o.nom} · {museDe(o)}
                  </Puce>
                ))}
                {mercure
                  ? captures.map(([o, i]) => (
                      <Button
                        key={`a${i}`}
                        type="button"
                        variant="discret"
                        size="chip"
                        onClick={() => accorder(i)}
                      >
                        {t("tour.accorder", { nom: o.nom })}
                      </Button>
                    ))
                  : null}
              </div>
            </div>
          ) : null}
        </Bloc>

        <Bloc titre={t("tour.occupants")}>
          <div className="mt-2 flex flex-wrap gap-2">
            {occupants.map((o) => (
              <Puce key={o.k} on={occ?.k === o.k} onClick={() => setK(o.k)}>
                {t("tour.occupant", { k: o.k })} · {fig(figureOrbite(o.q))}
              </Puce>
            ))}
            {occupants.length === 0 ? (
              <p className="font-mono text-[11px] text-sourd">{t("tour.occupants.aucun")}</p>
            ) : null}
          </div>
          <p className="mt-3 font-mono text-[11px] text-sourd">
            {t("inv.res.tenue", { n: lec.tenue.toString() })} · {lec.nDestructif}{" "}
            {t("inv.res.destructif")}
            {sel ? ` · ${t("tour.actif.sel")}` : ""}
          </p>
          {paire && occ ? (
            <p className="mt-2 font-mono text-[11px] text-sourd">
              {t("tour.contre")} · {t(`inv.res.${paire.lecture.polarite}` as Msg)}
              {" · "}
              {t("tour.lecture.orbite", {
                a: fig(paire.figures[0]),
                b: fig(paire.figures[1]),
              })}{" "}
              {t(paire.figures[0] === paire.figures[1] ? "inv.res.oui" : "tour.lecture.non")}
              {" · "}
              {t("tour.lecture.axe", { n: paire.alignement })}
            </p>
          ) : (
            <p className="mt-2 font-mono text-[11px] text-sourd">{t("tour.sansObjet")}</p>
          )}
          {occ ? (
            <div className="mt-3">
              <p className="font-mono text-[11px] text-sourd">{t("tour.capsules")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {capsules.map(([o, i]) => (
                  <Puce key={i} on={capIndex === i} onClick={() => setCapsule(i)}>
                    {o.nom} · {fig(figureOrbite(qDeMot(o.mot)))}
                  </Puce>
                ))}
                {capsules.length === 0 ? (
                  <span className="font-mono text-[11px] text-sourd">
                    {t("tour.capsules.aucune")}
                  </span>
                ) : null}
              </div>
              {prise && cap ? (
                <p className="mt-2 font-mono text-[11px] text-sourd">
                  {t("tour.lecture.orbite", { a: fig(prise.figures[0]), b: fig(prise.figures[1]) })}{" "}
                  {t(prise.orbite ? "inv.res.oui" : "tour.lecture.non")}
                  {" · "}
                  {t("tour.lecture.parade")} {t(prise.parade ? "inv.res.oui" : "tour.lecture.non")}
                  {" · "}
                  <span
                    className={
                      prise.issue === "brisee"
                        ? "text-fer"
                        : prise.issue === "echappe"
                          ? "text-sourd"
                          : "text-cuivre"
                    }
                  >
                    {t(`tour.prise.${prise.issue}` as Msg)}
                  </span>
                </p>
              ) : null}
              <Button
                type="button"
                variant="or"
                size="sm"
                className="mt-2"
                disabled={capIndex === null}
                onClick={() => capIndex !== null && prendre(occ.k, capIndex)}
              >
                {t("tour.prendre", { k: occ.k })}
              </Button>
            </div>
          ) : null}
        </Bloc>

        <Bloc titre={t("tour.elixirs")}>
          <p className="mt-1 font-mono text-[11px] text-sourd">
            {[
              sel ? t("tour.actif.sel") : null,
              mercure ? t("tour.actif.mercure") : null,
              soufre ? t("tour.actif.soufre") : null,
            ]
              .filter(Boolean)
              .join(" · ") || t("tour.actif.aucun")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {elixirs.map(([o, i]) => {
              const e = especeDePorte(o);
              return (
                <Button
                  key={i}
                  type="button"
                  variant="discret"
                  size="chip"
                  onClick={() => boire(i)}
                >
                  {FIOLES[e]} {t(`tour.espece.${e}` as Msg)} · {t("tour.boire")}
                </Button>
              );
            })}
            {elixirs.length === 0 ? (
              <span className="font-mono text-[11px] text-sourd">{t("tour.elixirs.aucun")}</span>
            ) : null}
          </div>
          {soufre || (hote?.majeur && hote.muse === "mars") ? null : (
            <p className="mt-2 font-mono text-[11px] text-sourd">{t("tour.tourner.ou")}</p>
          )}
          {soufre && !(hote?.majeur && hote.muse === "mars") ? (
            <Forge
              objets={objets}
              outil={outil}
              piece={piece}
              setOutil={setOutil}
              setPiece={setPiece}
              onTourner={() => outil !== null && piece !== null && tournerTour(outil, piece)}
              onForger={null}
            />
          ) : null}
        </Bloc>

        <Bloc titre={t("tour.antre")}>
          {antreFranchi ? (
            <p className="mt-1 font-mono text-[11px] text-cuivre">{t("tour.antre.franchi")}</p>
          ) : ticket < 0 ? (
            <p className="mt-1 font-mono text-[11px] text-sourd">{t("tour.antre.sans")}</p>
          ) : duel ? (
            <div className="mt-1 font-mono text-[11px] text-sourd">
              <p>
                {t("tour.antre.gardien", {
                  seuil: duel.gardien.seuil,
                  fig: fig(figureOrbite(duel.gardien.q)),
                })}
              </p>
              <p className="mt-1">
                1 · {t("tour.antre.temps1")} {t(duel.orbite ? "inv.res.oui" : "tour.lecture.non")}
                {" · "}2 · {t("tour.antre.temps2")}{" "}
                {t(duel.parade ? "inv.res.oui" : "tour.lecture.non")}
                {duel.mercure ? ` (${t("tour.espece.mercure")})` : ""}
                {" · "}3 · {t("tour.antre.temps3")}{" "}
                {t("inv.res.tenue", { n: duel.tenue.toString() })}
              </p>
              <p className={cn("mt-1", duel.passage ? "text-cuivre" : "text-fer")}>
                {duel.passage
                  ? t("tour.antre.passage", { n: duel.temps ?? 0 })
                  : t("tour.antre.repousse")}
              </p>
              <Button
                type="button"
                variant={duel.passage ? "or" : "danger"}
                size="sm"
                className="mt-2"
                onClick={() => franchir()}
              >
                {t("tour.antre.franchir")}
              </Button>
            </div>
          ) : null}
        </Bloc>

        <Carte
          etage={etage}
          sommet={tour.sommet}
          dons={tour.dons}
          alcoves={tour.alcoves}
          antres={tour.antres}
          ouverte={(e) => porteDe(e, ages, coffre).ouverte}
          onAller={allerEtage}
        />
      </section>
    </Shell>
  );
}

function Forge({
  objets,
  outil,
  piece,
  setOutil,
  setPiece,
  onTourner,
  onForger,
}: {
  objets: ObjetPorte[];
  outil: number | null;
  piece: number | null;
  setOutil: (i: number | null) => void;
  setPiece: (i: number | null) => void;
  onTourner: () => void;
  onForger: (() => void) | null;
}) {
  const { t } = useI18n();
  const outils = objets
    .map((o, i) => [o, i] as const)
    .filter(([o]) => o.genre === "pierre" || (onForger && o.genre === "gemme"));
  const pieces = objets
    .map((o, i) => [o, i] as const)
    .filter(
      ([o]) =>
        o.genre === "arme" ||
        o.genre === "armure" ||
        o.genre === "trouve" ||
        (onForger && o.genre === "elixir" && especeDePorte(o) === "sel"),
    );
  const o = outil !== null ? objets[outil] : null;
  const p = piece !== null ? objets[piece] : null;
  const forge = !!onForger && o?.genre === "gemme" && p?.genre === "elixir";
  const tourne = o?.genre === "pierre" && !!p && p.genre !== "elixir";
  return (
    <div className="mt-2">
      <p className="font-mono text-[11px] text-sourd">
        {onForger ? t("tour.forge.lede") : t("tour.tourner.lede")}
      </p>
      <div className="mt-1 flex flex-wrap gap-1">
        {outils.map(([x, i]) => (
          <Puce key={i} on={outil === i} onClick={() => setOutil(outil === i ? null : i)}>
            {t(`inv.genre.${x.genre}` as Msg)} {x.affixe ?? ""}
          </Puce>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {pieces.map(([x, i]) => (
          <Puce
            key={i}
            on={piece === i}
            onClick={() => setPiece(piece === i ? null : i)}
            teinte="#8a6a32"
          >
            {x.genre === "elixir"
              ? `${FIOLES.sel} ${t("tour.espece.sel")}`
              : `${x.nom} · ${t(`inv.genre.${x.genre}` as Msg)}`}
          </Puce>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" variant="discret" size="sm" disabled={!tourne} onClick={onTourner}>
          {t("tour.tourner")}
        </Button>
        {onForger ? (
          <Button type="button" variant="discret" size="sm" disabled={!forge} onClick={onForger}>
            {t("tour.forge")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Observatoire({
  coffre,
  reseau,
}: {
  coffre: ReturnType<typeof useCoffre.getState>["coffre"];
  reseau: ReturnType<typeof useCoffre.getState>["reseau"];
}) {
  const { t } = useI18n();
  const l = lectureObservatoire(coffre);
  const u = lectureUranie(coffre);
  return (
    <Bloc titre={t("tour.observatoire")}>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-sourd">
        {reseau
          ? t("tour.obs.tete", {
              h: reseau.tete.hauteur,
              v: reseau.tete.validateur,
              r: reseau.tete.utxoRoot.slice(0, 12),
              ok: t(reseau.verdict.ok ? "inv.res.oui" : "tour.lecture.non"),
            })
          : t("tour.obs.sansReseau")}
      </p>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-sourd">
        {t("tour.obs.jauge", {
          h: l.honores,
          e: l.echos,
          a: l.antres,
          c: l.captures,
          p: l.portes.length,
        })}
      </p>
      <p className="mt-1 font-mono text-[11px] leading-relaxed text-sourd">
        {u.ouverte
          ? t("tour.obs.formes", { n: u.rencontrees.length, max: u.total })
          : t("tour.obs.fermee", { n: bestiaireDe(coffre).remplies.length })}
      </p>
      {u.ouverte ? (
        <p className="mt-1 break-words font-mono text-[10px] text-encre">
          {Array.from({ length: u.total }, (_, r) =>
            u.rencontrees.includes(r) ? `[${r}]` : `${r}`,
          ).join(" ")}
        </p>
      ) : null}
    </Bloc>
  );
}

function Carte({
  etage,
  sommet,
  dons,
  alcoves,
  antres,
  ouverte,
  onAller,
}: {
  etage: number;
  sommet: number;
  dons: number[];
  alcoves: number[];
  antres: number[];
  ouverte: (e: number) => boolean;
  onAller: (e: number) => void;
}) {
  const { t } = useI18n();
  const cells = Array.from({ length: ETAGES }, (_, e) => e);
  return (
    <Bloc titre={t("tour.carte")}>
      <p className="mt-1 font-mono text-[11px] text-sourd">{t("tour.carte.lede")}</p>
      <div
        className="mt-2 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}
      >
        {cells.map((e) => {
          const atteint = e <= sommet;
          const porte = PORTES.includes(e);
          const passe = porte && ouverte(e);
          const fond =
            e === etage
              ? "#c9a227"
              : antres.includes(e)
                ? "#a8332a"
                : dons.includes(e)
                  ? "#3e8e6e"
                  : alcoves.includes(e)
                    ? "#3a6ea5"
                    : atteint
                      ? "#6e7581"
                      : "#0e1116";
          return (
            <button
              key={e}
              type="button"
              disabled={!atteint}
              onClick={() => onAller(e)}
              title={`${e}`}
              className="aspect-square rounded-[2px] disabled:cursor-default"
              style={{
                background: fond,
                boxShadow: porte ? `0 0 0 1px ${passe ? "#3e8e6e" : "#a8332a"}` : undefined,
                gridRow: 17 - Math.floor(e / 15),
              }}
            />
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] text-sourd">{t("tour.carte.legende")}</p>
    </Bloc>
  );
}
