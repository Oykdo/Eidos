import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Nav } from "@/components/Nav";
import { Langue } from "@/components/Langue";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n.ts";
import {
  lumens,
  echelleRelique,
  type Lumen,
} from "@/lib/eidos/relique.ts";
import { asciiTrouvaille } from "@/lib/eidos/trouvaille.ts";

const TOUS = lumens();

function Coupe({
  lumen,
  coupe,
}: {
  lumen: Lumen;
  coupe: boolean;
}) {
  const s = echelleRelique(lumen);
  const plane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.02),
    [],
  );
  const clip = coupe ? [plane] : [];
  const paroi = "#7a4e68";
  const lumiere = "#7eb3c9";

  return (
    <group scale={[s, s * 0.5, s]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[1.15, 0, 0]}>
        <torusGeometry args={[1.12, 0.36, 28, 56]} />
        <meshStandardMaterial
          color={paroi}
          roughness={0.55}
          metalness={0.08}
          side={THREE.DoubleSide}
          clippingPlanes={clip}
          clipShadows
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.55, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.3, 2.6, 36, 1, true]} />
        <meshStandardMaterial
          color={paroi}
          roughness={0.55}
          metalness={0.08}
          side={THREE.DoubleSide}
          clippingPlanes={clip}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.55, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 2.55, 28, 1, true]} />
        <meshStandardMaterial
          color={lumiere}
          transparent
          opacity={0.35}
          roughness={0.2}
          side={THREE.DoubleSide}
          clippingPlanes={clip}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Scene({ lumen, coupe }: { lumen: Lumen; coupe: boolean }) {
  return (
    <>
      <color attach="background" args={["#12151a"]} />
      <fog attach="fog" args={["#12151a", 8, 22]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 8, 4]} intensity={0.9} color="#dde1e6" />
      <pointLight position={[-3, 4, 5]} intensity={1.1} color="#c9a227" distance={16} />
      <Coupe lumen={lumen} coupe={coupe} />
      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={14}
        target={[0.4, 0, 0]}
      />
    </>
  );
}

export function ReliqueView() {
  const { t } = useI18n();
  const [ready, setReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const [coupe, setCoupe] = useState(true);
  const [trouvaille, setTrouvaille] = useState(false);
  const [phase, setPhase] = useState(0);
  const lumen = TOUS[idx]!;

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!trouvaille) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let id = 0;
    const tick = (t: number) => {
      setPhase((t / 1800) % (Math.PI * 2));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [trouvaille]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-fond">
      {ready ? (
        <Canvas
          className="h-full w-full touch-none"
          dpr={[1, 1.75]}
          camera={{ position: [4.2, 2.4, 5.2], fov: 42, near: 0.1, far: 60 }}
          gl={{
            antialias: true,
            alpha: false,
            localClippingEnabled: true,
            powerPreference: "high-performance",
          }}
        >
          <Scene lumen={lumen} coupe={coupe} />
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center font-mono text-sm text-sourd">
          {t("relique.ouv")}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col">
        <header className="pointer-events-auto flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-1">
          <p className="font-display text-[18px] font-light tracking-[0.38em] text-encre uppercase">
            Eidos
          </p>
          <Nav actuel="reliques" />
          <Langue />
        </header>

        <div className="mt-auto flex flex-col gap-3 px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-5">
          <aside className="pointer-events-auto mx-auto w-full max-w-[420px] rounded-lg bg-carte/95 p-4 shadow-[0_0_0_1px_rgb(198_203_209_/_0.14)] backdrop-blur-sm">
            <h2 className="font-display text-xl font-light text-or">
              {lumen.age.nomAffiche}
            </h2>
            <p className="mt-1 font-mono text-[12.5px] leading-relaxed text-sourd text-pretty">
              {t("relique.lede")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[12.5px] text-encre">
              <dt className="text-sourd">{t("relique.a")}</dt>
              <dd>{lumen.a} eidôla</dd>
              <dt className="text-sourd">{t("relique.b")}</dt>
              <dd>{lumen.b} eidôla</dd>
              <dt className="text-sourd">{t("relique.ratio")}</dt>
              <dd>{lumen.ratio.toFixed(1)}</dd>
              <dt className="text-sourd">{t("relique.aire")}</dt>
              <dd>{lumen.aire.toFixed(1)}</dd>
              <dt className="text-sourd">{t("relique.epoques")}</dt>
              <dd>{lumen.age.epoques}</dd>
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {TOUS.map((l, i) => (
                <button
                  key={l.age.nom}
                  type="button"
                  onClick={() => setIdx(i)}
                  className={cn(
                    "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                    i === idx
                      ? "bg-or text-or-fg"
                      : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                  )}
                >
                  {l.age.nomAffiche}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCoupe((c) => !c)}
                className={cn(
                  "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                  coupe
                    ? "bg-etain text-encre"
                    : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                {t("relique.coupe")}
              </button>
              <button
                type="button"
                onClick={() => setTrouvaille((t) => !t)}
                className={cn(
                  "h-8 rounded-sm px-2.5 font-mono text-[11px] tracking-wide",
                  trouvaille
                    ? "bg-or text-or-fg"
                    : "text-encre shadow-[0_0_0_1px_rgb(198_203_209_/_0.24)]",
                )}
              >
                {t("relique.trouvaille")}
              </button>
            </div>
            {trouvaille ? (
              <pre className="mt-3 overflow-x-auto font-mono text-[9px] leading-[1.05] text-etain">
                {asciiTrouvaille(lumen, phase)}
              </pre>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
