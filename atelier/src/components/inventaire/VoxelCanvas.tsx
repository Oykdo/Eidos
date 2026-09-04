/**
 * Voxels instanciés — l'occupance est l'invariant, le quaternion l'orientation.
 * q et −q : même sculpture, même rotation (revêtement double).
 * Jauge, hors feuille : la teinte (rgbJauge, lue en sRGB), la matière de l'âge,
 * l'occlusion et la trame par cellule entière (texel.ts) ne font que lire
 * l'occupance ; une cellule enclose n'est pas dessinée, elle reste comptée.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ATELIER_DPR,
  ATELIER_FOND,
  ATELIER_GL,
  brouillard,
  useOngletVisible,
  usePrefersReducedMotion,
} from "@/components/canvas/atelier.ts";
import { EnvironnementAtelier } from "@/components/canvas/Environnement.tsx";
import { Halo } from "@/components/canvas/Halo.tsx";
import { LumieresAtelier } from "@/components/canvas/Lumieres.tsx";
import {
  MATIERE_AGE,
  MATIERE_TRAMEE,
  couleurSRGB,
  disposerInstance,
  environnementDisponible,
  hexDe,
  matiereEffective,
} from "@/components/canvas/matiere.ts";
import { clarteCellule, visibles } from "@/components/canvas/texel.ts";
import { objetDePorte } from "@/lib/eidos/inventaire.ts";
import { depaqueter, Q_SCALE } from "@/lib/eidos/objets.ts";
import { METAUX_VOXEL, rgbJauge, voxelsDe, VOXEL_N } from "@/lib/eidos/voxels.ts";
import type { ObjetPorte } from "@/lib/eidos/types.ts";

function VoxelMesh({
  objet,
  rgb,
  immobile,
}: {
  objet: ObjetPorte;
  rgb: readonly [number, number, number];
  immobile: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);
  const vs = useMemo(() => voxelsDe(objetDePorte(objet)), [objet]);
  const [r, g, b] = rgb;
  const quat = useMemo(() => {
    const q = depaqueter(objet.mot);
    const s = Q_SCALE;
    return new THREE.Quaternion(q[1] / s, q[2] / s, q[3] / s, q[0] / s).normalize();
  }, [objet.mot]);

  const mesh = useMemo(() => {
    // Jointif : l'interstice de 0,08 u faisait 1-2 px qui clignotaient en rotation.
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const m = matiereEffective(MATIERE_AGE[objet.age], environnementDisponible(gl));
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: m.roughness,
      metalness: m.metalness,
      ...MATIERE_TRAMEE,
    });
    // Jauge — hors feuille : l'occupance (voxelsDe) est l'invariant ; ici on ne fait que la lire.
    const { occ, vus } = visibles(vs);
    const inst = new THREE.InstancedMesh(geo, mat, Math.max(1, vus.length));
    const dummy = new THREE.Object3D();
    const mid = (VOXEL_N - 1) / 2;
    vus.forEach((v, i) => {
      // K multiplie le triplet sRGB (même règle que VoxelIcon), couleurSRGB convertit ensuite.
      const K = clarteCellule(occ, v.x, v.y, v.z);
      dummy.position.set(v.x - mid, v.y - mid, v.z - mid);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, couleurSRGB(r * K, g * K, b * K));
    });
    inst.count = vus.length;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    return inst;
  }, [vs, r, g, b, objet.age, gl]);

  // R3F ne dispose pas les <primitive> : géométrie, matière et instance sont rendues au changement d'objet.
  useEffect(() => () => disposerInstance(mesh), [mesh]);

  useFrame((_, dt) => {
    if (!group.current || immobile) return;
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
  const immobile = usePrefersReducedMotion();
  const rgb = useMemo(() => rgbJauge(objet.age, objet.nonce), [objet.age, objet.nonce]);
  const [r, g, b] = rgb;
  // Teinte de l'âge (sans le nonce) : l'environnement n'est préfiltré qu'au changement d'âge, jamais par objet.
  const teinteAge = useMemo(() => hexDe(...METAUX_VOXEL[objet.age]), [objet.age]);
  const teinteObjet = useMemo(() => hexDe(r, g, b), [r, g, b]);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? (immobile ? "demand" : "always") : "never"}
      camera={{ position: [5.2, 4.2, 6.8], fov: 32 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      <Halo teinte={teinteObjet} force={0.06} />
      {/* Caméra à 9,5 du centre, rayon ≈ 3,6 : la moitié avant intacte, la face arrière fondue d'environ 30 %. */}
      <fog attach="fog" args={brouillard(9.5, 21)} />
      <LumieresAtelier contre={teinteAge} />
      <EnvironnementAtelier teinte={teinteAge} />
      <VoxelMesh objet={objet} rgb={rgb} immobile={immobile} />
    </Canvas>
  );
}
