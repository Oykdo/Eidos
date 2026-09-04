/**
 * Tour — la dalle d'un étage et ses occupants.
 * Jauge, hors feuille : dalleDe / occupantsDe (tour.ts) sont l'invariant ; ici
 * on ne fait que les lire. Pierre satinée, occlusion par voisins, trame de Bayer
 * décalée par l'étage, ombre de contact sous chaque occupant ; lumière du contrat,
 * environnement et contre-jour dans la teinte du biome. Rien n'est animé :
 * rendu à la demande (R3F invalide seul à chaque commit React).
 */
import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
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
  MATIERE_PIERRE,
  MATIERE_TRAMEE,
  type Matiere,
  couleurSRGB,
  disposerInstance,
  environnementDisponible,
  matiereEffective,
} from "@/components/canvas/matiere.ts";
import { cleCellule, seuilBayer } from "@/components/canvas/texel.ts";
import {
  DALLE_N,
  TEINTE_BIOME,
  biomeDe,
  dalleDe,
  occupantsDe,
  type Occupant,
} from "@/lib/eidos/tour.ts";

/** Clartés (facteur sRGB, mêmes pas que CLARTE_OCCLUSION[0..2]) : bord libre, bord de trou, intérieur. */
const CLARTE_DALLE = [1.0, 0.93, 0.86] as const;

/** Ombre de contact (facteur sRGB) sous l'élu / sous un autre occupant. */
const CONTACT_ELU = 0.74;
const CONTACT_OCCUPANT = 0.82;

/** Or poli de l'élu ; satiné des autres (égal à son repli sans environnement). */
const MATIERE_ELU: Matiere = { roughness: 0.3, metalness: 0.6 };
const MATIERE_OCCUPANT: Matiere = { roughness: 0.45, metalness: 0.35 };

/** Case d'un occupant sur la dalle (même règle pour l'ombre de contact et le rendu). */
function caseDe(o: Occupant): { gx: number; gz: number } {
  return { gx: (o.k * 3 + 1) % DALLE_N, gz: (o.k * 5 + 3) % DALLE_N };
}

function Dalle({
  dalle,
  teinte,
  etage,
  occupants,
  k,
}: {
  dalle: boolean[][];
  teinte: string;
  etage: number;
  occupants: Occupant[];
  k: number;
}) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  // Un seul objet vivant par étage : la sélection ne touche que les couleurs (effet plus bas).
  const sol = useMemo(() => {
    const mid = (DALLE_N - 1) / 2;
    const cells: { gx: number; gz: number }[] = [];
    for (let gz = 0; gz < DALLE_N; gz++) {
      for (let gx = 0; gx < DALLE_N; gx++) {
        if (dalle[gz]![gx]) cells.push({ gx, gz });
      }
    }
    const occ = new Set(cells.map((c) => cleCellule(c.gx, 0, c.gz)));
    // Voisins occupés parmi les huit de la dalle (2D : y fixe).
    const n8 = (x: number, z: number) => {
      let n = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if ((dx !== 0 || dz !== 0) && occ.has(cleCellule(x + dx, 0, z + dz))) n++;
        }
      }
      return n;
    };
    // Les interstices de la dalle sont voulus (carrelage).
    const geo = new THREE.BoxGeometry(0.92, 0.18, 0.92);
    const m = matiereEffective(MATIERE_PIERRE, environnementDisponible(gl));
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: m.roughness,
      metalness: m.metalness,
      envMapIntensity: 0.35,
      ...MATIERE_TRAMEE,
    });
    // Composantes sRGB 0..255 de la teinte ; K multiplie ce triplet, couleurSRGB convertit ensuite (même règle que l'inventaire).
    const t = new THREE.Color(teinte).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
    const inst = new THREE.InstancedMesh(geo, mat, Math.max(1, cells.length));
    const dummy = new THREE.Object3D();
    const teintes: { cle: number; r: number; g: number; b: number }[] = [];
    cells.forEach((c, i) => {
      const n = n8(c.gx, c.gz);
      // Bits de la dalle à 50 % : n8 ~ Binomiale(8, ½) → bord libre (≈14 %), bord de trou (≈71 %), intérieur (≈14 %).
      let j = n <= 2 ? 0 : n <= 5 ? 1 : 2;
      // Trame : un quart des cellules remonte d'un palier ; motif décalé par l'étage (période 4).
      if (j > 0 && seuilBayer(c.gx, etage, c.gz) < 4) j -= 1;
      const K: number = CLARTE_DALLE[j]!;
      const r = t.r * 255 * K;
      const g = t.g * 255 * K;
      const b = t.b * 255 * K;
      teintes.push({ cle: cleCellule(c.gx, 0, c.gz), r, g, b });
      dummy.position.set(c.gx - mid, 0, c.gz - mid);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, couleurSRGB(r, g, b));
    });
    inst.count = cells.length;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    return { inst, teintes };
  }, [dalle, teinte, etage, gl]);

  // Ombre de contact : la cellule sous chaque occupant, si elle existe ; l'élu pèse plus.
  // Écriture d'attribut hors commit React : en rendu à la demande, il faut invalider soi-même.
  useEffect(() => {
    const contacts = new Map<number, number>();
    for (const o of occupants) {
      const c = caseDe(o);
      contacts.set(cleCellule(c.gx, 0, c.gz), o.k === k ? CONTACT_ELU : CONTACT_OCCUPANT);
    }
    sol.teintes.forEach((c, i) => {
      const f = contacts.get(c.cle) ?? 1;
      sol.inst.setColorAt(i, couleurSRGB(c.r * f, c.g * f, c.b * f));
    });
    if (sol.inst.instanceColor) sol.inst.instanceColor.needsUpdate = true;
    invalidate();
  }, [sol, occupants, k, invalidate]);

  // R3F ne dispose pas les <primitive> : géométrie, matière et instance sont rendues au changement d'étage.
  useEffect(() => () => disposerInstance(sol.inst), [sol]);

  return <primitive object={sol.inst} />;
}

function Occupants({ occupants, teinte, k }: { occupants: Occupant[]; teinte: string; k: number }) {
  const gl = useThree((s) => s.gl);
  const envOk = environnementDisponible(gl);
  const mid = (DALLE_N - 1) / 2;
  return (
    <>
      {occupants.map((o) => {
        const c = caseDe(o);
        const elu = o.k === k;
        // Même repli que la dalle : sans environnement, l'or poli redevient matière peinte.
        const m = matiereEffective(elu ? MATIERE_ELU : MATIERE_OCCUPANT, envOk);
        return (
          <mesh key={o.k} position={[c.gx - mid, 0.55, c.gz - mid]} scale={elu ? 1.15 : 0.9}>
            <boxGeometry args={[0.7, 1.1, 0.7]} />
            {/* L'élu se lit par la matière : or poli contre satiné (même sur jupiter, où teinte = or). */}
            <meshStandardMaterial
              color={elu ? "#c9a227" : teinte}
              roughness={m.roughness}
              metalness={m.metalness}
              emissive={elu ? "#c9a227" : teinte}
              emissiveIntensity={elu ? 0.25 : 0.12}
              {...MATIERE_TRAMEE}
            />
          </mesh>
        );
      })}
    </>
  );
}

export default function TourCanvas({ etage, k }: { etage: number; k: number }) {
  const visible = useOngletVisible();
  const biome = biomeDe(etage);
  const teinte = TEINTE_BIOME[biome.id];
  const dalle = useMemo(() => dalleDe(etage), [etage]);
  const occupants = useMemo(() => occupantsDe(etage), [etage]);

  return (
    <Canvas
      className="absolute inset-0 h-full w-full touch-none"
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      dpr={ATELIER_DPR}
      gl={ATELIER_GL}
      frameloop={visible ? "demand" : "never"}
      camera={{ position: [7, 9, 9], fov: 38 }}
      onCreated={({ gl }) => gl.setClearColor(ATELIER_FOND, 1)}
    >
      {/* Halo discret : sur terre (#4a5a48) le centre ne monte que de 3,5/255 (écart max 69/255 × 0,05) ; Halo se retire seul sous 1,5/255. */}
      <Halo teinte={teinte} force={0.05} />
      {/* Profondeur de vue (−mvPosition.z, pas la distance) : centre à 14,5, coin proche 10,1 intact, coin lointain 18,9 fondu d'environ 35 %. */}
      <fog attach="fog" args={brouillard(13, 30)} />
      <LumieresAtelier contre={teinte} />
      <EnvironnementAtelier teinte={teinte} />
      <Dalle dalle={dalle} teinte={teinte} etage={etage} occupants={occupants} k={k} />
      <Occupants occupants={occupants} teinte={teinte} k={k} />
    </Canvas>
  );
}
