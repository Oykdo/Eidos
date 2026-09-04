import { Component, lazy, Suspense, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { Langue } from "@/components/Langue";
import { Bandeau, GlypheSvg } from "@/components/Mark";
import { Sauvegarde } from "@/components/Sauvegarde";
import { ReliqueTrouvee } from "@/components/reliques/ReliqueTrouvee";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import { formaterPrix, lumens, type Lumen } from "@/lib/eidos/relique.ts";
import { asciiTrouvaille } from "@/lib/eidos/trouvaille.ts";
import { useCoffre } from "@/lib/store.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { FIGURES } from "@/lib/eidos/constantes.ts";
import { codeDuGroupe } from "@/lib/eidos/glyphs.ts";
import {
  parserPreuveArtefact,
  verifierPreuveArtefact,
  SIGNATURES,
  artefactDeGoutte,
  type Artefact,
} from "@/lib/eidos/signatures.ts";
import { chargerEtat } from "@/lib/arbre/etat.ts";
import { ARTEFACTS_CHAINES, fusionnerArtefacts } from "@/lib/reliques/catalogue.ts";
import { genomeAvecAge, genomeDeAge, genomeDeArtefact } from "@/lib/reliques/genome.ts";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";

const ReliqueCanvas = lazy(() => import("./ReliqueCanvas"));

const TOUS = lumens();

class RepliWebGL extends Component<{ fallback: ReactNode; children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError(): { err: boolean } {
    return { err: true };
  }
  componentDidCatch(_e: Error, _i: ErrorInfo) {
    /* repli ASCII */
  }
  render() {
    return this.state.err ? this.props.fallback : this.props.children;
  }
}

function lectureGlyphe(etages: [number, number, number]): string {
  return etages.map((k) => FIGURES[k] ?? "").join("");
}

export function ReliqueView() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const lumen: Lumen = TOUS[idx]!;
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);
  const acheter = useCoffre((s) => s.acheterRelique);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);

  const [artefacts, setArtefacts] = useState<Artefact[]>([...ARTEFACTS_CHAINES]);
  const [sel, setSel] = useState<string | "age">(ARTEFACTS_CHAINES[0]!.digest);
  const [colle, setColle] = useState("");
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const [client, setClient] = useState(false);
  const [glOk, setGlOk] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  useEffect(() => {
    setClient(true);
    setGlOk(webglDisponible());
  }, []);

  useEffect(() => {
    let cancel = false;
    chargerEtat().then((e) => {
      if (cancel || !e) return;
      const vus: Artefact[] = [];
      for (const a of e.artefacts) {
        const live = artefactDeGoutte(a.txid, a.adresse);
        if (live) vus.push(live);
      }
      setArtefacts(fusionnerArtefacts(vus));
    });
    return () => {
      cancel = true;
    };
  }, []);

  const choisi = artefacts.find((a) => a.digest === sel) ?? null;
  const genome = useMemo(() => {
    if (choisi) return genomeAvecAge(genomeDeArtefact(choisi), lumen.age.nom);
    return genomeDeAge(lumen.age.nom);
  }, [choisi, lumen.age.nom]);

  const museCourante = SIGNATURES.find((s) => s.id === genome.famille);
  const possedees = coffre.reliques ?? [];
  const aMoi = possedees.includes(lumen.age.nom);
  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const peut = !aMoi && solde >= lumen.prixAtomes;
  const use3d = client && glOk && !reduced;

  const ascii = (
    <pre className="overflow-x-auto font-mono text-[11px] leading-[1.08] text-etain">
      {asciiTrouvaille(lumen, 0)}
    </pre>
  );

  return (
    <div className="relative min-h-dvh w-full bg-fond">
      <header className="flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <Bandeau className="[&_img]:h-10" />
        <Nav actuel="reliques" />
        <Langue />
      </header>

      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-4 px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <p className="text-center font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("relique.lede")}
        </p>

        <p className="text-center font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
          {t("relique.possessions", { n: possedees.length })}
          {" · "}
          {formaterAtomes(solde)}
        </p>

        <div className="grid grid-cols-2 gap-2">
          {TOUS.map((l, i) => {
            const mine = possedees.includes(l.age.nom);
            return (
              <button
                key={l.age.nom}
                type="button"
                onClick={() => setIdx(i)}
                className={cn(
                  "min-h-11 rounded-sm px-3 py-2 text-left font-mono",
                  i === idx
                    ? "bg-or text-or-fg"
                    : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                <div className="text-[13px]">
                  {l.age.nomAffiche}
                  {mine ? " ·" : ""}
                </div>
                <div className={cn("text-[11px]", i === idx ? "opacity-80" : "text-sourd")}>
                  {formaterPrix(l.prix)}
                </div>
              </button>
            );
          })}
        </div>

        <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)]">
          <h2 className="font-display text-2xl font-light text-or">{lumen.age.nomAffiche}</h2>
          {museCourante ? (
            <p className="mt-1 font-mono text-[13px] text-encre">
              {museCourante.astre} {museCourante.muse}
              <span className="text-sourd"> · {t("relique.danse")} : {t(`danse.${genome.famille}`)}</span>
            </p>
          ) : null}
          <p className="mt-1 font-mono text-[26px] tabular-nums text-encre">
            {formaterPrix(lumen.prix)}
            <span className="ml-2 text-[12px] tracking-wide text-sourd uppercase">
              {t("relique.prixUnite")}
            </span>
          </p>
          <p className="mt-1 font-mono text-[12px] text-sourd">{t("relique.prixAide")}</p>

          <div className="relative mt-4 aspect-square overflow-hidden rounded-md bg-fond">
            {use3d ? (
              <RepliWebGL fallback={ascii}>
                <Suspense
                  fallback={
                    <div className="flex h-full items-center justify-center font-mono text-sm text-sourd">
                      {t("relique.ouv")}
                    </div>
                  }
                >
                  <ReliqueCanvas genome={genome} />
                </Suspense>
              </RepliWebGL>
            ) : (
              <div className="flex h-full items-center justify-center p-3">{ascii}</div>
            )}
          </div>

          <div className="mt-3 flex items-start gap-3">
            <GlypheSvg etages={genome.etages} className="h-14 w-7 shrink-0" />
            <pre className="min-w-0 flex-1 font-mono text-[11px] leading-relaxed text-sourd">
              {genome.graine.slice(0, 8)}…{genome.graine.slice(-8)}
              {"\n"}
              {museCourante?.muse ?? genome.famille} · {codeDuGroupe(genome.etages)} · {lectureGlyphe(genome.etages)}
            </pre>
          </div>

          <div className="mt-4">
            {aMoi ? (
              <p className="font-mono text-sm text-cuivre">{t("relique.possedee")}</p>
            ) : (
              <Button type="button" disabled={!peut} onClick={() => acheter(lumen.age.nom)}>
                {t("relique.acheter")}
              </Button>
            )}
            {!aMoi && !peut ? (
              <p className="mt-2 font-mono text-[12px] text-sourd">{t("relique.court")}</p>
            ) : null}
            <p className="mt-2 min-h-5 font-mono text-sm" role="status">
              {erreur ? <span className="text-fer">{erreur}</span> : null}
              {!erreur && flash ? <span className="text-cuivre">{flash}</span> : null}
            </p>
          </div>
        </section>

        <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)]">
          <h2 className="font-mono text-base font-normal text-encre">{t("relique.chaine")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {artefacts.map((a) => {
              const sig = SIGNATURES.find((s) => s.id === a.id);
              return (
                <button
                  key={a.digest}
                  type="button"
                  onClick={() => setSel(a.digest)}
                  className={cn(
                    "min-h-11 rounded-sm px-3 py-2 font-mono text-[12px]",
                    sel === a.digest
                      ? "bg-or text-or-fg"
                      : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                  )}
                >
                  {sig?.astre ?? ""} {sig?.muse ?? a.id}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSel("age")}
              className={cn(
                "min-h-11 rounded-sm px-3 py-2 font-mono text-[12px]",
                sel === "age"
                  ? "bg-or text-or-fg"
                  : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
              )}
            >
              {t("relique.ageSeul")}
            </button>
          </div>

          <h3 className="mt-5 font-mono text-sm text-encre">{t("relique.preuve")}</h3>
          <p className="mt-1 font-mono text-[12px] leading-relaxed text-sourd text-pretty">
            {t("relique.preuveAide")}
          </p>
          <textarea
            value={colle}
            onChange={(e) => {
              setColle(e.target.value);
              setVerdict(null);
            }}
            rows={5}
            spellCheck={false}
            className="mt-3 w-full rounded-sm bg-creux p-3 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
            placeholder='{"v":1,"spec":"eidos-artefact/1",…}'
          />
          <Button
            type="button"
            variant="discret"
            className="mt-3"
            onClick={() => {
              const p = parserPreuveArtefact(colle);
              if ("erreur" in p) {
                setVerdict({ ok: false, texte: t("relique.preuveKo") });
                return;
              }
              const v = verifierPreuveArtefact(p);
              if (!v.ok) {
                setVerdict({ ok: false, texte: t("relique.preuveKo") });
                return;
              }
              const sig = SIGNATURES.find((x) => x.id === v.artefact.id);
              setArtefacts((cur) => fusionnerArtefacts([...cur, v.artefact]));
              setSel(v.artefact.digest);
              setVerdict({
                ok: true,
                texte: t("relique.preuveOk", { muse: sig?.muse ?? v.artefact.id }),
              });
            }}
          >
            {t("relique.coller")}
          </Button>
          <p className="mt-2 min-h-5 font-mono text-sm" role="status">
            {verdict ? (
              <span className={verdict.ok ? "text-cuivre" : "text-fer"}>{verdict.texte}</span>
            ) : null}
          </p>
        </section>

        <ReliqueTrouvee />

        <Sauvegarde />
      </main>
    </div>
  );
}
