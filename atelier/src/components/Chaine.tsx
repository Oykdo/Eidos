import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { chaineSaine, tete, verifierChaine } from "@/lib/eidos/chaine.ts";
import { ageOf, rewardAt } from "@/lib/eidos/eonis.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import {
  encoderJson,
  serialiserTete,
  teteDeBloc,
} from "@/lib/eidos/temoin.ts";
import { useCoffre } from "@/lib/store.ts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";

const MOTIF: Record<string, string> = {
  genese: "genèse",
  atelier: "atelier",
  envoi: "envoi",
  regroupement: "regroupement",
  robinet: "robinet",
  mine: "mine",
};

function court(h: string): string {
  return `${h.slice(0, 8)}…${h.slice(-4)}`;
}

export function Chaine() {
  const { t } = useI18n();
  const coffre = useCoffre((s) => s.coffre);
  const miner = useCoffre((s) => s.miner);
  const flash = useCoffre((s) => s.flash);
  const ch = coffre.chaine ?? [];
  const tip = tete(ch);
  const controles = verifierChaine(coffre);
  const ok = chaineSaine(coffre);
  const recents = ch.length <= 4 ? ch : [ch[0]!, ...ch.slice(-3)];
  const [copie, setCopie] = useState(false);

  const portable = tip && tip.motif !== "genese" ? serialiserTete(teteDeBloc(tip)) : null;
  const codeTete = portable ? encoderJson(portable) : null;

  async function exporter() {
    if (!portable) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(portable, null, 2));
      setCopie(true);
      window.setTimeout(() => setCopie(false), 1600);
    } catch {
      /* */
    }
  }

  const h = tip?.hauteur ?? 0;
  const age = ageOf(h);
  const r = rewardAt(h);
  const suivant = rewardAt(h + 1);

  return (
    <section className="rounded-lg bg-carte p-5 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-6">
      <h2 className="font-mono text-base font-normal text-encre">{t("chaine.titre")}</h2>
      <p className="mb-4 mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        {t("chaine.lede")}
      </p>

      <p className={cn("mb-3 font-mono text-sm", ok ? "text-cuivre" : "text-fer")}>
        {ok
          ? t("chaine.ok", { h: String(tip?.hauteur ?? "—") })
          : t("chaine.ko")}
      </p>
      {age ? (
        <p className="mb-3 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("emission.ligne", {
            age: age.nom,
            h: String(h),
            r: formaterAtomes(r),
          })}
        </p>
      ) : null}

      <Button type="button" className="mb-4" onClick={() => void miner()}>
        {t("mine.bouton", { r: formaterAtomes(suivant) })}
      </Button>
      {flash ? (
        <p className="mb-3 font-mono text-sm text-cuivre">{flash}</p>
      ) : null}

      <ol className="flex flex-col gap-2">
        {recents.map((b, i) => (
          <li
            key={b.hash + i}
            className="rounded-md bg-creux px-3 py-3 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)]"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
              bloc {b.hauteur} · {MOTIF[b.motif] ?? b.motif}
              {b.bits === 0 ? " · sans PoW" : ` · ${b.bits} bits`}
            </p>
            <p className="mt-1 break-all font-mono text-[12px] text-encre">
              {court(b.hash)}
            </p>
            <p className="mt-1 font-mono text-[11px] text-sourd">
              merkle · {court(b.merkle)}
            </p>
          </li>
        ))}
      </ol>

      <ul className="mt-4 flex flex-col gap-1.5">
        {controles.map((c) => (
          <li
            key={c.id}
            className={cn(
              "font-mono text-[12px]",
              c.ok ? "text-sourd" : "text-fer",
            )}
          >
            {c.ok ? "·" : "×"} {c.label}
          </li>
        ))}
      </ul>

      {portable && codeTete ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Button type="button" variant="discret" className="w-auto" onClick={() => void exporter()}>
            {copie ? t("chaine.copie") : t("chaine.exporter")}
          </Button>
          <Button asChild variant="or" className="w-auto">
            <Link to="/temoin" search={{ tete: codeTete }}>
              {t("chaine.ouvrir")}
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
