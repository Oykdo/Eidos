/**
 * Scène muette du coffre.
 * Formules : docs/SPEC_AUDIT_COFFRES.md et lib/eidos/coffres.ts.
 * Un seul coffre au pic de la cloche ; palette isochromatique et ornements
 * choisis par le palier du butin. Cage (r,θ,φ) née sur la serrure au palier
 * « précieux ». Fond atelier, pas parchemin — écart volontaire, noté dans l'audit.
 * Lumière et environnement du socle (canvas/) ; la coque vient de cellules.ts,
 * la matière de matiere.ts par palier. Une figure, jamais une preuve.
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
  gaussienne,
  ornementsDe,
  voxelsCouronne,
  voxelsOrnementSpherique,
  voxelsTasCouvercle,
  type Ornement,
  type Palette8,
} from "@/lib/eidos/coffres.ts";
import { cellulesCoque } from "./cellules.ts";

type Palier = 0 | 1 | 2 | 3;

function Gaussienne({ amplitude, teinte }: { amplitude: number; teinte: string }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7.2, 7.2, 56, 56);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, gaussienne(pos.getX(i) * 0.55, pos.getY(i) * 0.55) * (0.55 + amplitude));
    }
    g.computeVertexNormals();
    return g;
  }, [amplitude]);
  useEffect(() => () => geo.dispose(), [geo]);
  // Hors environnement (rien à réfléchir sur un fil), fondue dans le brouillard.
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color="#3a4550"
        roughness={0.55}
        metalness={0.18}
        wireframe
        emissive={teinte}
        emissiveIntensity={0.08 + amplitude * 0.12}
        envMapIntensity={0}
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
    // Jointif au pas 0,2 : l'interstice 0,02 u (≈ 1 px) rampait en rotation.
    const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const m = matiereEffective(MATIERE_PALIER[palier]!, environnementDisponible(gl));
    // Matière blanche × couleur d'instance : l'ordre des huit clartés est préservé.
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
    // Cellule pleine : 1 × 0,085 = l'interstice d'hier (0,08 × 0,085) passait sous le pixel et scintillait.
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // Même repli que la coque : sans environnement, la ferrure passe entière en matière peinte.
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
  y,
}: {
  palette: Palette8;
  ornements: readonly Ornement[];
  palier: Palier;
  scale: number;
  y: number;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += Math.min(dt, 0.08) * 0.08;
  });
  return (
    <group ref={group} position={[0, y, 0]} scale={scale}>
      <CoffreVoxel palette={palette} ornements={ornements} palier={palier} />
      {ornements.includes("cage") ? <CageSerrure /> : null}
    </group>
  );
}

export default function CoffreScene({ amplitude, palier }: { amplitude: number; palier: Palier }) {
  const visible = useOngletVisible();
  const palette = PALETTES[palier]!;
  const ornements = ornementsDe(palier);
  const echelle = 0.78 + amplitude * 0.32;
  const pic = gaussienne(0, 0) * (0.55 + amplitude);
  // Le halo vise le coffre ; recalculé quand le palier ou le solde change, jamais par image.
  const cible = useMemo<[number, number, number]>(() => [0, pic + 0.15, 0], [pic]);
  // Caméra à 5,0 du centre : le coffre (4,2–4,6) reste intact, le bord lointain de
  // la cloche (≈ 9,8) fond aux deux tiers ; le terme en pic suit la hauteur du coffre.
  const brume = useMemo(() => brouillard(5.4 + 0.4 * pic, 12.5 + 0.6 * pic), [pic]);
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [2.6, 2.3, 3.6], fov: 34 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      <Halo teinte={palette[3]!} cible={cible} force={0.06} />
      <fog attach="fog" args={brume} />
      <LumieresAtelier contre={palette[2]!} />
      <EnvironnementAtelier teinte={palette[2]!} />
      <Gaussienne amplitude={amplitude} teinte={palette[3]!} />
      <GroupeCoffre
        palette={palette}
        ornements={ornements}
        palier={palier}
        scale={echelle}
        y={pic + 0.15}
      />
    </Canvas>
  );
}
