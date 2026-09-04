import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
import { GlypheSvg } from "@/components/Mark";
import {
  SIGNATURES,
  TRIA_PRIMA,
  codeDe,
  parserPreuveArtefact,
  verifierPreuveArtefact,
  type Signature,
} from "@/lib/eidos/signatures.ts";
import { chargerEtat } from "@/lib/eidos/etat-reseau.ts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n, type Msg } from "@/lib/i18n.ts";

const LECTURE: Record<Signature["id"], Msg> = {
  uranie: "sig.uranie",
  saturne: "sig.saturne",
  jupiter: "sig.jupiter",
  mars: "sig.mars",
  soleil: "sig.soleil",
  venus: "sig.venus",
  mercure: "sig.mercure",
  lune: "sig.lune",
  terre: "sig.terre",
};

const METAL: Record<Signature["id"], Msg> = {
  uranie: "sig.m.uranie",
  saturne: "sig.m.saturne",
  jupiter: "sig.m.jupiter",
  mars: "sig.m.mars",
  soleil: "sig.m.soleil",
  venus: "sig.m.venus",
  mercure: "sig.m.mercure",
  lune: "sig.m.lune",
  terre: "sig.m.terre",
};

const TRIA: Record<(typeof TRIA_PRIMA)[number]["id"], Msg> = {
  sel: "sig.tria.sel",
  mercure: "sig.tria.mercure",
  soufre: "sig.tria.soufre",
};

export function Signatures() {
  const { t } = useI18n();
  const [sel, setSel] = useState<Signature["id"]>("lune");
  const [trouves, setTrouves] = useState<Set<string>>(new Set());
  const [colle, setColle] = useState("");
  const [verdict, setVerdict] = useState<{ ok: boolean; texte: string } | null>(null);
  const s = SIGNATURES.find((x) => x.id === sel) ?? SIGNATURES[7]!;

  useEffect(() => {
    void chargerEtat().then((e) => {
      if (!e) return;
      setTrouves(new Set(e.artefacts.map((a) => a.id)));
    });
  }, []);

  return (
    <Shell actuel="signatures">
      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-display text-[26px] font-light text-or">{t("sig.h")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("sig.lede")}
        </p>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-mono text-base font-normal text-encre">{t("sig.tria")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("sig.triaLede")}
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {TRIA_PRIMA.map((p) => (
            <li key={p.id} className="flex items-center gap-3 font-mono text-[12.5px] text-encre">
              <span className="w-4 text-or">{p.etage}</span>
              <GlypheSvg etages={[p.figure, p.figure, p.figure]} className="h-8 w-4" />
              <span>{t(TRIA[p.id])}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-mono text-base font-normal text-encre">{t("sig.choeur")}</h2>
        <p className="mt-1 mb-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("sig.choeurLede")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SIGNATURES.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setSel(x.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-2 py-3",
                sel === x.id ? "bg-or text-or-fg" : "bg-creux text-encre",
              )}
            >
              <GlypheSvg etages={x.etages} className="h-14 w-7" />
              <span className="font-mono text-[16px] leading-none">{x.astre}</span>
              <span className="font-mono text-[10px] tracking-wide">{x.muse}</span>
              {trouves.has(x.id) ? (
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-80">
                  {t("sig.trouve")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <div className="flex items-start gap-4">
          <GlypheSvg etages={s.etages} className="h-24 w-12 shrink-0" />
          <div>
            <p className="font-display text-2xl font-light text-or">
              {s.astre} {s.muse}
            </p>
            <p className="mt-1 font-mono text-[12.5px] text-encre">{t(METAL[s.id])}</p>
            <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
              {t(LECTURE[s.id])}
            </p>
            <p className="mt-2 font-mono text-[11px] text-etain">
              {t("sig.code", { n: codeDe(s) })}
            </p>
          </div>
        </div>
        <p className="mt-4 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("sig.pas")}
        </p>
        <p className="mt-3">
          <Link
            to="/glyphes"
            className="font-mono text-[12px] text-or underline-offset-4 hover:underline"
          >
            {t("guide.06b")}
          </Link>
        </p>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-mono text-base font-normal text-encre">{t("sig.juger")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("sig.jugerLede")}
        </p>
        <textarea
          value={colle}
          onChange={(e) => {
            setColle(e.target.value);
            setVerdict(null);
          }}
          rows={8}
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
              setVerdict({ ok: false, texte: t("sig.rompue") });
              return;
            }
            const v = verifierPreuveArtefact(p);
            if (!v.ok) {
              setVerdict({ ok: false, texte: t("sig.rompue") });
              return;
            }
            const sig = SIGNATURES.find((x) => x.id === v.artefact.id);
            setVerdict({
              ok: true,
              texte: t("sig.intacte", { muse: sig?.muse ?? v.artefact.id }),
            });
            setSel(v.artefact.id);
          }}
        >
          {t("sig.rejouer")}
        </Button>
        {verdict ? (
          <p className={cn("mt-3 font-mono text-sm", verdict.ok ? "text-cuivre" : "text-fer")}>
            {verdict.texte}
          </p>
        ) : null}
      </section>
    </Shell>
  );
}
