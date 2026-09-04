/**
 * Scène muette du coffre.
 * Formules : docs/SPEC_AUDIT_COFFRES.md et lib/eidos/coffres.ts.
 * Un seul coffre au pic de la cloche ; palette isochromatique et ornements
 * choisis par le palier du butin. Cage (r,θ,φ) née sur la serrure au palier
 * « précieux ». Fond atelier, pas parchemin — écart volontaire, noté dans l'audit.
 */
import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ATELIER_DPR, ATELIER_FOND, ATELIER_GL, LUMIERE_DIR, useOngletVisible } from "@/components/canvas/atelier.ts";
import {
  ORNEMENT_TEINTE,
  PALETTES,
  SERRURE_LOCALE,
  gaussienne,
  ornementsDe,
  voxelsCouronne,
  voxelsFerrures,
  voxelsOrnementSpherique,
  voxelsTasCouvercle,
  type Ornement,
  type Palette8,
} from "@/lib/eidos/coffres.ts";

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
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color="#3a4550"
        roughness={0.55}
        metalness={0.18}
        wireframe
        emissive={teinte}
        emissiveIntensity={0.08 + amplitude * 0.12}
      />
    </mesh>
  );
}

function CoffreVoxel({ palette, ornements }: { palette: Palette8; ornements: readonly Ornement[] }) {
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.42, metalness: 0.55 });
    const dummy = new THREE.Object3D();
    const cells: { p: THREE.Vector3; i: number }[] = [];
    for (let x = -4; x <= 4; x++) {
      for (let y = -3; y <= 3; y++) {
        for (let z = -3; z <= 3; z++) {
          const ax = Math.abs(x);
          const ay = Math.abs(y);
          const az = Math.abs(z);
          const coque = ax === 4 || ay === 3 || az === 3;
          if (!coque) continue;
          let i = 4;
          if (y >= 2) i = 2;
          if (ay === 3 && ax <= 1 && az === 3) i = 1;
          if (ax === 0 && y === 0 && az === 3) i = 7; // serrure, toujours la clarté la plus sombre
          if (ax === 4 && ay <= 1) i = 6;
          cells.push({ p: new THREE.Vector3(x * 0.2, y * 0.2 + 0.15, z * 0.2), i });
        }
      }
    }
    const poserCellules = (cs: { x: number; y: number; z: number }[], i: number, pas = 0.2, dy = 0.15) => {
      for (const c of cs) cells.push({ p: new THREE.Vector3(c.x * pas, c.y * pas + dy, c.z * pas), i });
    };
    if (ornements.includes("ferrures")) poserCellules(voxelsFerrures(), 1);
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
  }, [palette, ornements]);
  return <primitive object={mesh} />;
}

function CageSerrure() {
  const mesh = useMemo(() => {
    const vs = voxelsOrnementSpherique();
    const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.55 });
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
  }, []);
  return (
    <group position={[...SERRURE_LOCALE]} scale={0.085}>
      <primitive object={mesh} />
    </group>
  );
}

function GroupeCoffre({ palette, ornements, scale, y }: { palette: Palette8; ornements: readonly Ornement[]; scale: number; y: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += Math.min(dt, 0.08) * 0.08;
  });
  return (
    <group ref={group} position={[0, y, 0]} scale={scale}>
      <CoffreVoxel palette={palette} ornements={ornements} />
      {ornements.includes("cage") ? <CageSerrure /> : null}
    </group>
  );
}

export default function CoffreScene({ amplitude, palier }: { amplitude: number; palier: 0 | 1 | 2 | 3 }) {
  const visible = useOngletVisible();
  const palette = PALETTES[palier]!;
  const ornements = ornementsDe(palier);
  const echelle = 0.78 + amplitude * 0.32;
  const pic = gaussienne(0, 0) * (0.55 + amplitude);
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
      <ambientLight intensity={0.7} />
      <directionalLight position={LUMIERE_DIR.position} intensity={1.05} color={LUMIERE_DIR.color} />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} color={palette[2]} />
      <Gaussienne amplitude={amplitude} teinte={palette[3]!} />
      <GroupeCoffre palette={palette} ornements={ornements} scale={echelle} y={pic + 0.15} />
    </Canvas>
  );
}
