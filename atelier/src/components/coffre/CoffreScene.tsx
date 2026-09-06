/**
 * Scène muette du coffre.
 * Formules : docs/SPEC_AUDIT_COFFRES.md et lib/eidos/coffres.ts.
 * Un seul coffre, face caméra, au centre du cadre. Pas de cloche au sol :
 * l'amplitude règle l'échelle, pas une colline. Palette isochromatique et
 * ornements choisis par le palier du butin. Cage (r,θ,φ) née sur la serrure
 * au palier « précieux ». Une figure, jamais une preuve.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ATELIER_DPR,
  ATELIER_FOND,
  ATELIER_GL,
  brouillard,
  useOngletVisible,
} from "@/components/canvas/atelier.ts";
import { EnvironnementAtelier } from "@/components/canvas/Environnement.tsx";
import { Halo } from "@/components/canvas/Halo.tsx";
import { LumieresAtelier } from "@/components/canvas/Lumieres.tsx";
import {
  MATIERE_FERRURE,
  MATIERE_PALIER,
  MATIERE_TRAMEE,
  disposerInstance,
  environnementDisponible,
  matiereEffective,
} from "@/components/canvas/matiere.ts";
import {
  ORNEMENT_TEINTE,
  PALETTES,
  SERRURE_LOCALE,
  ornementsDe,
  voxelsCouronne,
  voxelsOrnementSpherique,
  voxelsTasCouvercle,
  type Ornement,
  type Palette8,
} from "@/lib/eidos/coffres.ts";
import { cellulesCoque } from "./cellules.ts";

type Palier = 0 | 1 | 2 | 3;

const CIBLE: [number, number, number] = [0, 0.28, 0];

function Viser() {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(CIBLE[0], CIBLE[1], CIBLE[2]);
  }, [camera]);
  return null;
}

function Socle() {
  return (
    <mesh position={[0, -0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.9, 1.5]} />
      <meshStandardMaterial
        color="#1a1e24"
        roughness={0.9}
        metalness={0.05}
        envMapIntensity={0.2}
        dithering
      />
    </mesh>
  );
}

function CoffreVoxel({
  palette,
  ornements,
  palier,
}: {
  palette: Palette8;
  ornements: readonly Ornement[];
  palier: Palier;
}) {
  const gl = useThree((s) => s.gl);
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const m = matiereEffective(MATIERE_PALIER[palier]!, environnementDisponible(gl));
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: m.roughness,
      metalness: m.metalness,
      ...MATIERE_TRAMEE,
    });
    const dummy = new THREE.Object3D();
    const cells: { p: THREE.Vector3; i: number }[] = cellulesCoque(ornements).map((c) => ({
      p: new THREE.Vector3(c.x * 0.2, c.y * 0.2 + 0.15, c.z * 0.2),
      i: c.i,
    }));
    const poserCellules = (
      cs: { x: number; y: number; z: number }[],
      i: number,
      pas = 0.2,
      dy = 0.15,
    ) => {
      for (const c of cs)
        cells.push({ p: new THREE.Vector3(c.x * pas, c.y * pas + dy, c.z * pas), i });
    };
    if (ornements.includes("tas")) poserCellules(voxelsTasCouvercle(), 0, 0.16, 0.12);
    if (ornements.includes("couronne")) poserCellules(voxelsCouronne(), 0, 0.2, 0.12);
    const inst = new THREE.InstancedMesh(geo, mat, cells.length);
    cells.forEach((c, n) => {
      dummy.position.copy(c.p);
      dummy.updateMatrix();
      inst.setMatrixAt(n, dummy.matrix);
      inst.setColorAt(n, new THREE.Color(palette[c.i]!));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    return inst;
  }, [palette, ornements, palier, gl]);
  useEffect(() => () => disposerInstance(mesh), [mesh]);
  return <primitive object={mesh} />;
}

function CageSerrure() {
  const gl = useThree((s) => s.gl);
  const mesh = useMemo(() => {
    const vs = voxelsOrnementSpherique();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const m = matiereEffective(MATIERE_FERRURE, environnementDisponible(gl));
    const mat = new THREE.MeshStandardMaterial({
      roughness: m.roughness,
      metalness: m.metalness,
      ...MATIERE_TRAMEE,
    });
    const inst = new THREE.InstancedMesh(geo, mat, vs.length);
    const dummy = new THREE.Object3D();
    vs.forEach((v, i) => {
      dummy.position.set(v.x, v.z, v.y);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, new THREE.Color(ORNEMENT_TEINTE[v.kind]));
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    return inst;
  }, [gl]);
  useEffect(() => () => disposerInstance(mesh), [mesh]);
  return (
    <group position={[...SERRURE_LOCALE]} scale={0.085}>
      <primitive object={mesh} />
    </group>
  );
}

function GroupeCoffre({
  palette,
  ornements,
  palier,
  scale,
}: {
  palette: Palette8;
  ornements: readonly Ornement[];
  palier: Palier;
  scale: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += Math.min(dt, 0.08) * 0.06;
  });
  return (
    <group ref={group} position={[0, 0, 0]} scale={scale}>
      <Socle />
      <CoffreVoxel palette={palette} ornements={ornements} palier={palier} />
      {ornements.includes("cage") ? <CageSerrure /> : null}
    </group>
  );
}

export default function CoffreScene({ amplitude, palier }: { amplitude: number; palier: Palier }) {
  const visible = useOngletVisible();
  const palette = PALETTES[palier]!;
  const ornements = ornementsDe(palier);
  const echelle = 0.86 + amplitude * 0.22;
  const brume = useMemo(() => brouillard(4.2, 11), []);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [0, 1.15, 3.55], fov: 32 }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(ATELIER_FOND, 1);
        camera.lookAt(CIBLE[0], CIBLE[1], CIBLE[2]);
      }}
    >
      <Viser />
      <Halo teinte={palette[3]!} cible={CIBLE} force={0.06} />
      <fog attach="fog" args={brume} />
      <LumieresAtelier contre={palette[2]!} />
      <EnvironnementAtelier teinte={palette[2]!} />
      <GroupeCoffre
        palette={palette}
        ornements={ornements}
        palier={palier}
        scale={echelle}
      />
    </Canvas>
  );
}
