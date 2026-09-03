import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Langue } from "@/components/Langue";
import { Bandeau } from "@/components/Mark";
import { Sauvegarde } from "@/components/Sauvegarde";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import { formaterPrix, lumens, type Lumen } from "@/lib/eidos/relique.ts";
import { asciiTrouvaille } from "@/lib/eidos/trouvaille.ts";
import { useCoffre } from "@/lib/store.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";

const TOUS = lumens();

export function ReliqueView() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const lumen: Lumen = TOUS[idx]!;
  const coffre = useCoffre((s) => s.coffre);
  const hydrater = useCoffre((s) => s.hydrater);
  const acheter = useCoffre((s) => s.acheterRelique);
  const erreur = useCoffre((s) => s.erreur);
  const flash = useCoffre((s) => s.flash);

  useEffect(() => {
    hydrater();
  }, [hydrater]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let id = 0;
    const tick = (now: number) => {
      setPhase((now / 1800) % (Math.PI * 2));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const possedees = coffre.reliques ?? [];
  const aMoi = possedees.includes(lumen.age.nom);
  const solde = coffre.sorties.reduce((s, o) => s + o.montant, 0);
  const peut = !aMoi && solde >= lumen.prixAtomes;

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
                  "rounded-sm px-3 py-2 text-left font-mono",
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
          <p className="mt-1 font-mono text-[26px] tabular-nums text-encre">
            {formaterPrix(lumen.prix)}
            <span className="ml-2 text-[12px] tracking-wide text-sourd uppercase">
              {t("relique.prixUnite")}
            </span>
          </p>
          <p className="mt-1 font-mono text-[12px] text-sourd">{t("relique.prixAide")}</p>
          <pre className="mt-4 overflow-x-auto font-mono text-[11px] leading-[1.08] text-etain">
            {asciiTrouvaille(lumen, phase)}
          </pre>
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

        <Sauvegarde />
      </main>
    </div>
  );
}
