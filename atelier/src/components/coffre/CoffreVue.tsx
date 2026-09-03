import { lazy, Suspense, useEffect, useState } from "react";
import { usePrefersReducedMotion, webglDisponible } from "@/components/canvas/atelier.ts";
const CoffreScene = lazy(() => import("./CoffreScene"));

export function CoffreVue() {
  const [gl, setGl] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    setGl(webglDisponible() && !reduced);
  }, [reduced]);

  return (
    <section className="rounded-lg bg-carte p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.10)] sm:p-5">
      <h2 className="font-mono text-base font-normal text-encre">Coffre</h2>
      <p className="mt-2 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
        Deux coffres. Forme sur le sommet, image au premier plan. La gaussienne porte les deux.
        Les équations restent dans la spec d&apos;audit.
      </p>
      <div className="relative mt-4 h-64 overflow-hidden rounded-md bg-fond">
        {gl ? (
          <Suspense fallback={<div className="h-full bg-fond" />}>
            <CoffreScene />
          </Suspense>
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-sourd">
            WebGL off
          </div>
        )}
      </div>
    </section>
  );
}
