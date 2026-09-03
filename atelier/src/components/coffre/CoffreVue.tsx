import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";
import { amplitudeDuSolde, soldeAtomes } from "@/lib/eidos/coffres.ts";
import { formaterAtomes } from "@/lib/eidos/coinselect.ts";
import { useCoffre } from "@/lib/store.ts";

const CoffreScene = lazy(() => import("./CoffreScene"));

export function CoffreVue() {
  const [gl, setGl] = useState(false);
  const reduced = usePrefersReducedMotion();
  const sorties = useCoffre((s) => s.coffre.sorties);
  const atomes = useMemo(() => soldeAtomes(sorties), [sorties]);
  const amp = amplitudeDuSolde(atomes);

  useEffect(() => {
    setGl(webglDisponible() && !reduced);
  }, [reduced]);

  return (
    <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-base font-normal text-encre">Coffre</h2>
        <p className="font-mono text-[11px] tabular-nums text-or">{formaterAtomes(atomes)}</p>
      </div>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        La cloche suit le solde du carnet. Forme sur le sommet, image au premier plan.
        Les équations restent dans la spec d&apos;audit.
      </p>
      <div className="relative mt-4 h-64 overflow-hidden rounded-md bg-fond">
        {gl ? (
          <Suspense fallback={<div className="h-full bg-fond" />}>
            <CoffreScene atomes={atomes} amplitude={amp} />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-sourd">
            {formaterAtomes(atomes)} · WebGL off
          </div>
        )}
      </div>
    </section>
  );
}
