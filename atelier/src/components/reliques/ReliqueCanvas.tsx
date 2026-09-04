/**
 * Voie A — SDF raymarché, un quad, zéro mesh importé, zéro texture.
 * La topologie change avec la graine. Tient sur un téléphone.
 * Voie B (TSL/WebGPU) double la surface WebGL2/WebGPU : plus tard.
 * Voie C (maillage CPU) plus lourde, moins unique : rejetée.
 */
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import vert from "./relique.vert.glsl?raw";
import frag from "./relique.frag.glsl?raw";
import {
  ATELIER_DPR,
  ATELIER_FOND,
  ATELIER_GL,
  LUMIERE_CONTRE,
  LUMIERE_DIR,
  useOngletVisible,
} from "@/components/canvas/atelier.ts";
import { MATIERE_AGE, couleurSRGB } from "@/components/canvas/matiere.ts";
import { valeursUniforms } from "@/lib/reliques/forme.ts";
import { PERIODE_DANSE_S } from "@/lib/reliques/danse.ts";
import type { Genome } from "@/lib/reliques/genome.ts";

type Uniforms = {
  uMetal: { value: THREE.Vector3 };
  uP0: { value: THREE.Vector4 };
  uP1: { value: THREE.Vector4 };
  uP2: { value: THREE.Vector4 };
  uP3: { value: THREE.Vector4 };
  uP4: { value: THREE.Vector4 };
  uFamille: { value: number };
  uPhase: { value: number };
  uYaw: { value: number };
  uUsure: { value: number };
  uCamPos: { value: THREE.Vector3 };
  uCamRight: { value: THREE.Vector3 };
  uCamUp: { value: THREE.Vector3 };
  uCamFwd: { value: THREE.Vector3 };
  uFov: { value: number };
  uAspect: { value: number };
  uRes: { value: THREE.Vector2 };
  uAA: { value: number };
  // Lumière et matière du contrat d'atelier (atelier.ts, matiere.ts) — ajoutés en fin, jamais réordonnés.
  uLumDir: { value: THREE.Vector3 };
  uLumCol: { value: THREE.Color };
  uContreDir: { value: THREE.Vector3 };
  uContreCol: { value: THREE.Color };
  uMatiere: { value: THREE.Vector2 };
  uMetalAff: { value: THREE.Vector3 };
};

function fabriquerUniforms(): Uniforms {
  return {
    uMetal: { value: new THREE.Vector3() },
    uP0: { value: new THREE.Vector4() },
    uP1: { value: new THREE.Vector4() },
    uP2: { value: new THREE.Vector4() },
    uP3: { value: new THREE.Vector4() },
    uP4: { value: new THREE.Vector4() },
    uFamille: { value: 0 },
    uPhase: { value: 0 },
    uYaw: { value: 0.4 },
    uUsure: { value: 0 },
    uCamPos: { value: new THREE.Vector3(0, 0.08, 2.05) },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uCamFwd: { value: new THREE.Vector3(0, 0, -1) },
    uFov: { value: 0.7 },
    uAspect: { value: 1 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAA: { value: 1 },
    uLumDir: { value: new THREE.Vector3(...LUMIERE_DIR.position).normalize() },
    uLumCol: { value: new THREE.Color(LUMIERE_DIR.color) },
    uContreDir: { value: new THREE.Vector3(...LUMIERE_CONTRE.position).normalize() },
    uContreCol: { value: new THREE.Color(LUMIERE_CONTRE.color) },
    uMatiere: { value: new THREE.Vector2(0.32, 0.6) },
    // Métal en sRGB 0..1, pour l'aura du fond composée en espace d'affichage.
    uMetalAff: { value: new THREE.Vector3() },
  };
}

function appliquer(u: Uniforms, g: Genome, w: number, h: number) {
  const v = valeursUniforms(g);
  // Le métal d'âge est un triplet sRGB : linéarisé ici, comme les couleurs des scènes voxel.
  const c = couleurSRGB(v.metal[0] * 255, v.metal[1] * 255, v.metal[2] * 255);
  u.uMetal.value.set(c.r, c.g, c.b);
  u.uContreCol.value.copy(c);
  u.uMetalAff.value.set(v.metal[0], v.metal[1], v.metal[2]);
  const m = MATIERE_AGE[g.age];
  u.uMatiere.value.set(m.roughness, m.metalness);
  u.uP0.value.fromArray(v.p0);
  u.uP1.value.fromArray(v.p1);
  u.uP2.value.fromArray(v.p2);
  u.uP3.value.fromArray(v.p3);
  u.uP4.value.fromArray(v.p4);
  u.uFamille.value = v.famille;
  u.uUsure.value = v.usure;
  u.uAspect.value = w / Math.max(h, 1);
  u.uRes.value.set(w, h);
  u.uAA.value = typeof window !== "undefined" && window.devicePixelRatio > 1.4 ? 0 : 1;
}

function ReliqueQuad({ genome }: { genome: Genome }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const yaw = useRef(0.35);
  const drag = useRef(false);
  const last = useRef<[number, number]>([0, 0]);
  const { size } = useThree();
  const uniforms = useMemo(() => fabriquerUniforms(), []);

  useEffect(() => {
    appliquer(uniforms, genome, size.width, size.height);
  }, [genome, size.width, size.height, uniforms]);

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    if (!drag.current) yaw.current += d * 0.22;
    const m = mat.current;
    if (!m) return;
    m.uniforms.uYaw.value = yaw.current;
    m.uniforms.uPhase.value = state.clock.elapsedTime * ((Math.PI * 2) / PERIODE_DANSE_S);
    m.uniforms.uRes.value.set(size.width, size.height);
    m.uniforms.uAspect.value = size.width / Math.max(size.height, 1);
  });

  return (
    <mesh
      frustumCulled={false}
      onPointerDown={(e) => {
        e.stopPropagation();
        drag.current = true;
        last.current = [e.clientX, e.clientY];
        const el = e.nativeEvent.target;
        if (el instanceof HTMLElement) el.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        drag.current = false;
        const el = e.nativeEvent.target;
        if (el instanceof HTMLElement) el.releasePointerCapture(e.pointerId);
      }}
      onPointerLeave={() => {
        drag.current = false;
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        yaw.current += (e.clientX - last.current[0]) * 0.008;
        last.current = [e.clientX, e.clientY];
      }}
    >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export default function ReliqueCanvas({ genome }: { genome: Genome }) {
  const visible = useOngletVisible();
  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "always" : "never"}
      camera={{ position: [0, 0, 1], fov: 40 }}
      onCreated={({ gl }) => {
        gl.setClearColor(ATELIER_FOND, 1);
      }}
    >
      <ReliqueQuad genome={genome} />
    </Canvas>
  );
}
