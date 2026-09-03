import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  ATELIER_DPR,
  ATELIER_FOND,
  ATELIER_GL,
  LUMIERE_DIR,
  useOngletVisible,
} from "@/components/canvas/atelier.ts";
import {
  DALLE_N,
  TEINTE_BIOME,
  biomeDe,
  dalleDe,
  occupantsDe,
} from "@/lib/eidos/tour.ts";

export default function TourCanvas({ etage, k }: { etage: number; k: number }) {
  const visible = useOngletVisible();
  const biome = biomeDe(etage);
  const teinte = TEINTE_BIOME[biome.id];
  const dalle = useMemo(() => dalleDe(etage), [etage]);
  const occupants = useMemo(() => occupantsDe(etage), [etage]);

  const sol = useMemo(() => {
    const cells: THREE.Vector3[] = [];
    const mid = (DALLE_N - 1) / 2;
    for (let y = 0; y < DALLE_N; y++) {
      for (let x = 0; x < DALLE_N; x++) {
        if (!dalle[y]![x]) continue;
        cells.push(new THREE.Vector3(x - mid, 0, y - mid));
      }
    }
    const geo = new THREE.BoxGeometry(0.92, 0.18, 0.92);
    const mat = new THREE.MeshStandardMaterial({
      color: teinte,
      roughness: 0.5,
      metalness: 0.25,
    });
    const inst = new THREE.InstancedMesh(geo, mat, Math.max(1, cells.length));
    const dummy = new THREE.Object3D();
    cells.forEach((p, i) => {
      dummy.position.copy(p);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }, [dalle, teinte]);

  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [7, 9, 9], fov: 38 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={LUMIERE_DIR.position}
        intensity={1}
        color={LUMIERE_DIR.color}
      />
      <primitive object={sol} />
      {occupants.map((o) => {
        const mid = (DALLE_N - 1) / 2;
        const gx = ((o.k * 3 + 1) % DALLE_N) - mid;
        const gz = ((o.k * 5 + 3) % DALLE_N) - mid;
        return (
          <mesh key={o.k} position={[gx, 0.55, gz]} scale={o.k === k ? 1.15 : 0.9}>
            <boxGeometry args={[0.7, 1.1, 0.7]} />
            <meshStandardMaterial
              color={o.k === k ? "#c9a227" : teinte}
              roughness={0.35}
              metalness={0.55}
              emissive={o.k === k ? "#c9a227" : "#000000"}
              emissiveIntensity={o.k === k ? 0.25 : 0}
            />
          </mesh>
        );
      })}
    </Canvas>
  );
}
