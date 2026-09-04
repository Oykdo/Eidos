import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlypheSvg } from "@/components/Mark";
import { useI18n } from "@/lib/i18n.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { AGES_RELIQUE, estNomAge } from "@/lib/eidos/relique.ts";
import { SIGNATURES, type SignatureId } from "@/lib/eidos/signatures.ts";
import { genomeDeGoutte, type Genome } from "@/lib/reliques/genome.ts";
import { sceauxDuCoffre, type EntreeMonde, type Sceau } from "@/lib/eidos/sceaux.ts";
import { FEDERATION_URL, parserFederation, type FederationPublique } from "@/lib/eidos/temoin.ts";
import { fabriquerTrophee, jugerTrophee, parserTrophee, serialiserTrophee, type VerdictTrophee } from "@/lib/eidos/trophee.ts";
import type { NomAge } from "@/lib/eidos/types.ts";

/** Colonnes : Terre au sol, Uranie au faîte — comme la Tour. */
const COLONNES = [...SIGNATURES].reverse();
/** Lignes : Satya en haut, Kali en bas. */
const LIGNES = AGES_RELIQUE;

type Placee = {
  entree: EntreeMonde & { id: string; adresse: string };
  age: NomAge;
  genome: Genome | null;
  muse: SignatureId | null;
  mienne: boolean;
};

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

function placer(monde: EntreeMonde[], sceaux: Sceau[]): Placee[] {
  const miens = new Set(sceaux.map((s) => s.id));
  const out: Placee[] = [];
  for (const e of monde) {
    if (typeof e.id !== "string" || typeof e.adresse !== "string") continue;
    const age: NomAge = typeof e.age === "string" && estNomAge(e.age) ? e.age : "Kali";
    const genome = typeof e.txid === "string" && e.txid.length === 64 ? genomeDeGoutte(e.txid, e.adresse, age) : null;
    out.push({ entree: e as Placee["entree"], age, genome, muse: genome?.famille ?? null, mienne: miens.has(e.id) });
  }
  return out;
}

/** La carte des reliques du monde : par âge et par muse. Une lecture, pas une preuve. */
export function CarteReliques() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);
  const monde = useCoffre((s) => s.monde);
  const chargerMonde = useCoffre((s) => s.chargerMonde);
  const reseau = useCoffre((s) => s.reseau);
  const suivreReseau = useCoffre((s) => s.suivreReseau);
  const [choisie, setChoisie] = useState<string | null>(null);
  const [trophee, setTrophee] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [colle, setColle] = useState("");
  const [verdict, setVerdict] = useState<VerdictTrophee | null>(null);
  const [fed, setFed] = useState<FederationPublique | null>(null);

  useEffect(() => {
    hydrater();
  }, [hydrater]);
  useEffect(() => {
    if (monde === null) void chargerMonde();
  }, [monde, chargerMonde]);

  const sceaux = useMemo(() => sceauxDuCoffre(monde, coffre), [monde, coffre]);
  const placees = useMemo(() => placer(monde ?? [], sceaux), [monde, sceaux]);
  const enAttente = placees.filter((p) => p.muse === null);
  const selection = placees.find((p) => p.entree.id === choisie) ?? null;

  async function chargerFed(): Promise<FederationPublique | null> {
    if (fed) return fed;
    try {
      const r = await fetch(FEDERATION_URL, { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const f = parserFederation(await r.json());
      if ("erreur" in f) throw new Error(f.erreur);
      setFed(f);
      return f;
    } catch (e) {
      setErreur(`federation.json : ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  async function exporter(p: Placee) {
    setErreur(null);
    setTrophee(null);
    const sceau = sceaux.find((s) => s.id === p.entree.id);
    if (!sceau) return;
    if (!reseau) await suivreReseau();
    const r = useCoffre.getState().reseau;
    if (!r) {
      setErreur(t("carte.trophee.sansTete"));
      return;
    }
    if (!r.verdict.ok) {
      setErreur(t("carte.trophee.teteRefusee"));
      return;
    }
    const tr = fabriquerTrophee(sceau, r.sorties, r.tete);
    if ("erreur" in tr) {
      setErreur(tr.erreur);
      return;
    }
    setTrophee(serialiserTrophee(tr));
  }

  async function juger() {
    setVerdict(null);
    setErreur(null);
    const tr = parserTrophee(colle);
    if ("erreur" in tr) {
      setErreur(tr.erreur);
      return;
    }
    const f = await chargerFed();
    if (!f) return;
    setVerdict(jugerTrophee(tr, f, monde));
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] sm:p-5">
        <h2 className="font-mono text-base font-normal text-encre">{t("carte.titre")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("carte.lede")}</p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 font-mono text-[11px]">
            <thead>
              <tr>
                <th className="text-left text-[10px] uppercase tracking-[0.12em] text-sourd">{t("carte.age")}</th>
                {COLONNES.map((s) => (
                  <th key={s.id} className="text-center text-[10px] text-sourd" title={s.muse}>
                    {s.astre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LIGNES.map((age) => (
                <tr key={age.nom}>
                  <td className="whitespace-nowrap text-encre">{age.nomAffiche}</td>
                  {COLONNES.map((s) => {
                    const ici = placees.filter((p) => p.age === age.nom && p.muse === s.id);
                    return (
                      <td key={s.id} className="h-9 min-w-9 rounded-sm bg-creux text-center align-middle">
                        {ici.map((p) => (
                          <button
                            key={p.entree.id}
                            type="button"
                            title={`${p.entree.id} · ${s.muse}`}
                            onClick={() => {
                              setChoisie(p.entree.id);
                              setTrophee(null);
                              setErreur(null);
                            }}
                            className={cn(
                              "mx-0.5 inline-flex size-6 items-center justify-center rounded-full text-[11px]",
                              p.entree.etat === "intacte" ? "bg-or text-or-fg" : "bg-fond text-sourd line-through",
                              p.mienne ? "shadow-[0_0_0_2px_rgb(201_162_39)]" : "",
                              choisie === p.entree.id ? "outline outline-1 outline-encre" : "",
                            )}
                          >
                            {p.entree.etat === "intacte" ? "●" : "○"}
                          </button>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 font-mono text-[11px] text-sourd">
          {t("carte.legende")}
          {monde === null ? " · …" : ` · ${t("carte.compte", { n: placees.length, a: enAttente.length })}`}
        </p>
        {enAttente.length > 0 ? (
          <p className="mt-1 font-mono text-[11px] text-sourd">
            {t("carte.attente")} :{" "}
            {enAttente.map((p) => (
              <button key={p.entree.id} type="button" className="underline decoration-dotted" onClick={() => setChoisie(p.entree.id)}>
                {p.entree.id}
              </button>
            ))}
          </p>
        ) : null}
      </section>

      {selection ? (
        <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] sm:p-5">
          <div className="flex items-start gap-3">
            {selection.genome ? <GlypheSvg etages={selection.genome.etages} className="h-14 w-7 shrink-0" /> : null}
            <div className="min-w-0 flex-1 font-mono text-[12px] text-encre">
              <p className="text-[11px] uppercase tracking-[0.12em] text-sourd">
                relique {selection.entree.id} · {selection.age}
                {selection.mienne ? ` · ${t("carte.mienne")}` : ""}
              </p>
              {selection.muse ? (
                <p className="mt-1">
                  {SIGNATURES.find((s) => s.id === selection.muse)?.astre} {SIGNATURES.find((s) => s.id === selection.muse)?.muse}
                  <span className="text-sourd"> · {t("relique.danse")} : {t(`danse.${selection.muse}`)}</span>
                </p>
              ) : null}
              <p className="mt-1 text-sourd">
                {t(`relique.qr.etat.${selection.entree.etat ?? "attente"}` as "relique.qr.etat.attente")}
                {selection.entree.etat === "recuperee" && typeof selection.entree.bloc === "number"
                  ? ` · ${t("carte.bloc", { b: selection.entree.bloc })} · ${court(selection.entree.vers ?? "")}`
                  : ""}
                {selection.entree.etat === "intacte" && typeof selection.entree.montant === "number"
                  ? ` · ${(selection.entree.montant / 1e8).toFixed(2)} ${selection.entree.scellee === false ? t("carte.sousScellee") : ""}`
                  : ""}
              </p>
              {selection.entree.indice ? <p className="mt-1 text-sourd">« {selection.entree.indice} »</p> : null}
              <p className="mt-1 break-all text-[11px] text-sourd">{selection.entree.adresse}</p>
            </div>
          </div>
          {selection.mienne ? (
            <div className="mt-3">
              <Button type="button" variant="or" className="w-auto" onClick={() => void exporter(selection)}>
                {t("carte.trophee.exporter")}
              </Button>
              {trophee ? (
                <div className="mt-2">
                  <textarea readOnly value={trophee} rows={4} className="w-full rounded-sm bg-fond p-2 font-mono text-[10px] text-sourd" />
                  <Button type="button" variant="discret" className="mt-2 w-auto" onClick={() => void navigator.clipboard?.writeText(trophee)}>
                    {t("relique.qr.copier")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] sm:p-5">
        <h3 className="font-mono text-sm text-encre">{t("carte.trophee.juger")}</h3>
        <p className="mt-1 font-mono text-[12px] leading-relaxed text-sourd text-pretty">{t("carte.trophee.aide")}</p>
        <textarea
          value={colle}
          onChange={(e) => {
            setColle(e.target.value);
            setVerdict(null);
          }}
          rows={3}
          spellCheck={false}
          placeholder='{"v":1,"spec":"eidos-sceau/1",…}'
          className="mt-2 w-full rounded-sm bg-creux p-2 font-mono text-[11px] text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
        />
        <Button type="button" variant="discret" className="mt-2 w-auto" disabled={!colle.trim()} onClick={() => void juger()}>
          {t("carte.trophee.jugerBtn")}
        </Button>
        {verdict ? (
          <p className={cn("mt-2 font-mono text-[12.5px]", verdict.ok ? "text-cuivre" : "text-fer")}>
            {verdict.motif}
            {verdict.ok && verdict.relie !== null ? ` · ${verdict.relie ? t("carte.trophee.relie") : t("carte.trophee.nonRelie")}` : ""}
          </p>
        ) : null}
        {erreur ? <p className="mt-2 font-mono text-[12.5px] text-fer">{erreur}</p> : null}
      </section>
    </div>
  );
}
