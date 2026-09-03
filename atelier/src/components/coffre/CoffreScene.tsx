/**
 * Scène muette des deux coffres.
 * Formules : docs/SPEC_AUDIT_COFFRES.md et lib/eidos/coffres.ts.
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
import {
  COFFRE_AVANT,
  COFFRE_FOND,
  gaussienne,
  type Palette8,
} from "@/lib/eidos/coffres.ts";

function Gaussienne() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(7.2, 7.2, 56, 56);
    const pos = g.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, gaussienne(x * 0.55, y * 0.55) * 1.05);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial
        color="#3a4550"
        roughness={0.55}
        metalness={0.18}
        wireframe
        emissive="#c9a227"
        emissiveIntensity={0.12}
      />
    </mesh>
  );
}

function CoffreVoxel({
  palette,
  scale,
  position,
}: {
  palette: Palette8;
  scale: number;
  position: readonly [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const mat = new THREE.MeshStandardMaterial({
      color: palette[4],
      roughness: 0.42,
      metalness: 0.55,
    });
    const dummy = new THREE.Object3D();
    const cells: { p: THREE.Vector3; i: number }[] = [];
    for (let x = -4; x <= 4; x++) {
      for (let y = -3; y <= 3; y++) {
        for (let z = -3; z <= 3; z++) {
          const ax = Math.abs(x);
          const ay = Math.abs(y);
          const az = Math.abs(z);
          const coque = ax === 4 || ay === 3 || az === 3;
          const couvercle = y >= 2;
          if (!coque) continue;
          let i = 4;
          if (couvercle) i = 2;
          if (ay === 3 && ax <= 1 && az === 3) i = 1;
          if (ax === 0 && y === 0 && az === 3) i = 0;
          if (ax === 4 && ay <= 1) i = 6;
          cells.push({ p: new THREE.Vector3(x * 0.2, y * 0.2 + 0.15, z * 0.2), i });
        }
      }
    }
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
  }, [palette]);

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += Math.min(dt, 0.08) * 0.12;
  });

  return (
    <group ref={group} position={[...position]} scale={scale}>
      <primitive object={mesh} />
    </group>
  );
}

function SphereCoords() {
  return (
    <mesh position={[0, 1.55, -0.15]}>
      <sphereGeometry args={[0.72, 16, 12]} />
      <meshBasicMaterial color="#c9a227" wireframe transparent opacity={0.55} />
    </mesh>
  );
}

export default function CoffreScene() {
  const visible = useOngletVisible();
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [3.4, 2.6, 4.6], fov: 34 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      <ambientLight intensity={0.7} />
      <directionalLight
        position={LUMIERE_DIR.position}
        intensity={1.05}
        color={LUMIERE_DIR.color}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.35} color="#8FCBFF" />
      <Gaussienne />
      <SphereCoords />
      <CoffreVoxel
        palette={COFFRE_FOND.palette}
        scale={COFFRE_FOND.scale}
        position={COFFRE_FOND.position}
      />
      <CoffreVoxel
        palette={COFFRE_AVANT.palette}
        scale={COFFRE_AVANT.scale}
        position={COFFRE_AVANT.position}
      />
    </Canvas>
  );
}
