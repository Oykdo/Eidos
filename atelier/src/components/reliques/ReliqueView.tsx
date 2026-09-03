import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Langue } from "@/components/Langue";
import { Bandeau } from "@/components/Mark";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import { formaterPrix, lumens, type Lumen } from "@/lib/eidos/relique.ts";
import { asciiTrouvaille } from "@/lib/eidos/trouvaille.ts";

const TOUS = lumens();

export function ReliqueView() {
  const { t } = useI18n();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const lumen: Lumen = TOUS[idx]!;

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

  return (
    <div className="relative min-h-dvh w-full bg-fond">
      <header className="flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3">
        <Bandeau className="[&_img]:h-10" />
        <Nav actuel="reliques" />
        <Langue />
      </header>

      <main className="mx-auto w-full max-w-[440px] px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        <p className="mb-4 text-center font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
          {t("relique.lede")}
        </p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {TOUS.map((l, i) => (
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
              <div className="text-[13px]">{l.age.nomAffiche}</div>
              <div className={cn("text-[11px]", i === idx ? "opacity-80" : "text-sourd")}>
                {formaterPrix(l.prix)}
              </div>
            </button>
          ))}
        </div>

        <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)]">
          <h2 className="font-display text-2xl font-light text-or">{lumen.age.nomAffiche}</h2>
          <p className="mt-1 font-mono text-[26px] tabular-nums text-encre">
            {formaterPrix(lumen.prix)}
            <span className="ml-2 text-[12px] tracking-wide text-sourd uppercase">
              {t("relique.prixUnite")}
            </span>
          </p>
          <p className="mt-1 font-mono text-[12px] text-sourd">
            {t("relique.prixAide")}
          </p>
          <pre className="mt-4 overflow-x-auto font-mono text-[11px] leading-[1.08] text-etain">
            {asciiTrouvaille(lumen, phase)}
          </pre>
        </section>
      </main>
    </div>
  );
}
