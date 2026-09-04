import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";
import { PALIERS_BUTIN, amplitudeDuSolde, palierButin, soldeAtomes } from "@/lib/eidos/coffres.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { agesScelles, sceauxDuCoffre } from "@/lib/eidos/sceaux.ts";
import { useCoffre } from "@/lib/store.ts";
import { useI18n } from "@/lib/i18n.ts";

const CoffreScene = lazy(() => import("./CoffreScene"));

export function CoffreVue() {
  const { t } = useI18n();
  const [gl, setGl] = useState(false);
  const reduced = usePrefersReducedMotion();
  const coffre = useCoffre((s) => s.coffre);
  const monde = useCoffre((s) => s.monde);
  const chargerMonde = useCoffre((s) => s.chargerMonde);
  const atomes = useMemo(() => soldeAtomes(coffre.sorties), [coffre.sorties]);
  const amp = amplitudeDuSolde(atomes);
  const palier = useMemo(
    () => palierButin(coffre, agesScelles(sceauxDuCoffre(monde, coffre), coffre)),
    [coffre, monde],
  );

  useEffect(() => {
    setGl(webglDisponible() && !reduced);
  }, [reduced]);

  useEffect(() => {
    if (monde === null) void chargerMonde();
  }, [monde, chargerMonde]);

  return (
    <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-base font-normal text-encre">{t("coffre.scene")}</h2>
        <p className="font-mono text-[11px] tabular-nums text-or">{formaterAtomes(atomes)}</p>
      </div>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">{t("coffre.sceneLede")}</p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-sourd">
        {t("coffre.palier")} · {t(`coffre.palier.${PALIERS_BUTIN[palier]}`)}
      </p>
      <div className="relative mt-4 h-64 overflow-hidden rounded-md bg-fond">
        {gl ? (
          <Suspense fallback={<div className="h-full bg-fond" />}>
            <CoffreScene amplitude={amp} palier={palier} />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-sourd">{formaterAtomes(atomes)}</div>
        )}
      </div>
    </section>
  );
}
