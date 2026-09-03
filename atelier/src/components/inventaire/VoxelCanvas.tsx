/**
 * Voxels instanciés — l'occupance est l'invariant, le quaternion l'orientation.
 * q et −q : même sculpture, même rotation (revêtement double).
 */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  ATELIER_DPR,
  ATELIER_FOND,
  ATELIER_GL,
  LUMIERE_DIR,
  useOngletVisible,
} from "@/components/canvas/atelier.ts";
import { objetDePorte } from "@/lib/eidos/inventaire.ts";
import { depaqueter, Q_SCALE } from "@/lib/eidos/objets.ts";
import { rgbJauge, voxelsDe, VOXEL_N } from "@/lib/eidos/voxels.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

function VoxelMesh({ objet }: { objet: ObjetPorte }) {
  const group = useRef<THREE.Group>(null);
  const vs = useMemo(() => voxelsDe(objetDePorte(objet)), [objet]);
  const color = useMemo(() => {
    const [r, g, b] = rgbJauge(objet.age, objet.nonce);
    return new THREE.Color(r / 255, g / 255, b / 255);
  }, [objet]);
  const quat = useMemo(() => {
    const q = depaqueter(objet.mot);
    const s = Q_SCALE;
    return new THREE.Quaternion(q[1] / s, q[2] / s, q[3] / s, q[0] / s).normalize();
  }, [objet.mot]);

  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.38,
      metalness: 0.65,
      emissive: color.clone().multiplyScalar(0.22),
    });
    const inst = new THREE.InstancedMesh(geo, mat, vs.length);
    const dummy = new THREE.Object3D();
    const mid = (VOXEL_N - 1) / 2;
    vs.forEach((v, i) => {
      dummy.position.set(v.x - mid, v.y - mid, v.z - mid);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    });
    inst.instanceMatrix.needsUpdate = true;
    return inst;
  }, [vs, color]);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += Math.min(dt, 0.1) * 0.35;
  });

  return (
    <group ref={group} quaternion={quat} scale={0.38}>
      <primitive object={mesh} />
    </group>
  );
}

export default function VoxelCanvas({ objet }: { objet: ObjetPorte }) {
  const visible = useOngletVisible();
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [5.2, 4.2, 6.8], fov: 32 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      <ambientLight intensity={0.8} />
      <directionalLight
        position={LUMIERE_DIR.position}
        intensity={1.15}
        color={LUMIERE_DIR.color}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#c9a227" />
      <VoxelMesh objet={objet} />
    </Canvas>
  );
}
