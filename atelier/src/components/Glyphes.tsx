import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { GlypheSvg } from "@/components/Mark";
import { Button } from "@/components/ui/button";
import { FIGURE_NOMS } from "@/lib/eidos/constantes.ts";
import {
  codeDuGroupe,
  encoderAdresse,
  groupeDuCode,
  verifierAdresse,
} from "@/lib/eidos/glyphs.ts";
import { asciiGlyphe } from "@/lib/eidos/trouvaille.ts";
import { fromHex } from "@/lib/eidos/hash.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";

const BITS = ["00", "01", "10", "11"] as const;

export function Glyphes() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const [etages, setEtages] = useState<[number, number, number]>([1, 2, 3]);
  const [alterer, setAlterer] = useState(false);
  const code = codeDuGroupe(etages);

  const adresse = useMemo(() => {
    const hexa = coffre.sorties[0]?.adresse;
    if (!hexa || hexa.length !== 40) return null;
    try {
      const texte = encoderAdresse(fromHex(hexa));
      return { hexa, texte };
    } catch {
      return null;
    }
  }, [coffre.sorties]);

  const verdict = useMemo(() => {
    if (!adresse) return null;
    let texte = adresse.texte;
    if (alterer) {
      const g = texte.split(/\s+/).filter((x) => x !== "|");
      const f = [...g[0]!];
      const i = ["\u00b7", "\u25cb", "\u263d", "\u271a"].indexOf(f[0]!);
      f[0] = ["\u00b7", "\u25cb", "\u263d", "\u271a"][(i + 1) % 4]!;
      g[0] = f.join("");
      texte = g.slice(0, 27).join(" ") + "  |  " + g.slice(27).join(" ");
    }
    try {
      const v = verifierAdresse(texte);
      return { ok: true as const, hexa: v.hexa };
    } catch (e) {
      return { ok: false as const, message: e instanceof Error ? e.message : "rompue" };
    }
  }, [adresse, alterer]);

  return (
    <Shell actuel="glyphes">
      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-display text-[26px] font-light text-or">{t("glyphes.h")}</h2>
        <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("glyphes.lede")}
        </p>
        <pre className="mt-3 font-mono text-sm leading-tight text-etain">
          {asciiGlyphe(etages)}
        </pre>
        <ul className="mt-4 grid grid-cols-4 gap-2">
          {([0, 1, 2, 3] as const).map((k) => (
            <li
              key={k}
              className="flex flex-col items-center gap-1 rounded-md bg-creux px-2 py-3"
            >
              <GlypheSvg etages={[k, k, k]} className="h-16 w-8" />
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-encre">
                {FIGURE_NOMS[k]}
              </span>
              <span className="font-mono text-[11px] text-sourd">{BITS[k]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-mono text-base font-normal text-encre">{t("glyphes.empiler")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd">
          {t("glyphes.empilerLede")}
        </p>
        <div className="mt-4 flex items-center gap-6">
          <GlypheSvg etages={etages} className="h-28 w-14 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            {([0, 1, 2] as const).map((etage) => (
              <div key={etage} className="flex gap-1">
                {([0, 1, 2, 3] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      setEtages((e) => {
                        const n: [number, number, number] = [...e];
                        n[etage] = k;
                        return n;
                      })
                    }
                    className={cn(
                      "flex h-10 flex-1 items-center justify-center rounded-sm",
                      etages[etage] === k
                        ? "bg-or text-or-fg"
                        : "bg-creux text-encre",
                    )}
                    aria-label={`${FIGURE_NOMS[k]} à l'étage ${etage}`}
                  >
                    <GlypheSvg etages={[k, k, k]} className="h-8 w-4" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 font-mono text-sm text-encre">
          {BITS[etages[0]]} {BITS[etages[1]]} {BITS[etages[2]]}
          <span className="text-sourd"> · </span>
          {code} / 63
        </p>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-mono text-base font-normal text-encre">{t("glyphes.64")}</h2>
        <p className="mt-1 mb-3 font-mono text-[12.5px] leading-relaxed text-sourd">
          {t("glyphes.64lede")}
        </p>
        <div className="grid grid-cols-8 gap-1">
          {Array.from({ length: 64 }, (_, c) => {
            const e = groupeDuCode(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setEtages(e)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-sm bg-creux",
                  code === c && "ring-1 ring-or",
                )}
                aria-label={`glyphe ${c}`}
              >
                <GlypheSvg etages={e} className="h-8 w-3.5" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
        <h2 className="font-mono text-base font-normal text-encre">{t("glyphes.adresse")}</h2>
        <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("glyphes.adresseLede")}
        </p>
        {adresse ? (
          <>
            <p className="sym mt-3 break-all font-mono text-[12.5px] leading-relaxed text-argent">
              {adresse.texte}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant={alterer ? "danger" : "discret"}
                size="sm"
                className="w-auto"
                onClick={() => setAlterer((v) => !v)}
              >
                {alterer ? t("glyphes.restaurer") : t("glyphes.alterer")}
              </Button>
            </div>
            {verdict ? (
              <p
                className={cn(
                  "mt-3 font-mono text-sm",
                  verdict.ok ? "text-cuivre" : "text-fer",
                )}
              >
                {verdict.ok
                  ? `Somme intacte · ${verdict.hexa.slice(0, 16)}…`
                  : verdict.message}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-3 font-mono text-[12.5px] text-sourd">
            Aucune sortie en coffre — le robinet en crée une.
          </p>
        )}
      </section>
    </Shell>
  );
}
