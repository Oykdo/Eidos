/**
 * Environnement d'atelier — jauge, hors feuille.
 * Une sphère de sommets colorés (le même « air » que LumieresAtelier : dégradé
 * creux→encre, lobe de la clé, lobe de la contre dans la teinte de la scène),
 * préfiltrée UNE fois par PMREM à 64 px. Aucune texture importée.
 * Rien si le contexte ne rend pas en flottant : les matières repassent en
 * peinture (matiereEffective). Clé de rebake = la teinte seulement.
 */
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ENV_INTENSITE,
  LUMIERE_CONTRE,
  LUMIERE_DIR,
  LUMIERE_HEMI,
} from "@/components/canvas/atelier.ts";
import { environnementDisponible } from "@/components/canvas/matiere.ts";

export function EnvironnementAtelier({ teinte }: { teinte: string }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    if (!environnementDisponible(gl)) return;
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 48, 24);
    const pos = geo.attributes.position!;
    const col = new Float32Array(pos.count * 3);
    const sol = new THREE.Color(LUMIERE_HEMI.sol);
    const ciel = new THREE.Color(LUMIERE_HEMI.ciel);
    const cle = new THREE.Color(LUMIERE_DIR.color);
    const contre = new THREE.Color(teinte);
    const L1 = new THREE.Vector3(...LUMIERE_DIR.position).normalize();
    const L2 = new THREE.Vector3(...LUMIERE_CONTRE.position).normalize();
    const d = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      c.copy(sol)
        .lerp(ciel, THREE.MathUtils.smoothstep(d.y, -0.35, 0.75))
        .multiplyScalar(0.35);
      const a = 1.6 * Math.pow(Math.max(d.dot(L1), 0), 20);
      const b = 0.8 * Math.pow(Math.max(d.dot(L2), 0), 8);
      col[3 * i] = c.r + cle.r * a + contre.r * b;
      col[3 * i + 1] = c.g + cle.g * a + contre.g * b;
      col[3 * i + 2] = c.b + cle.b * a + contre.b * b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true });
    env.add(new THREE.Mesh(geo, mat));
    let rt: THREE.WebGLRenderTarget | null = null;
    // Le générateur est créé hors du try : ses cibles internes sont rendues dans
    // tous les cas (fromScene désactive lui-même le tone mapping pendant le rendu).
    const pmrem = new THREE.PMREMGenerator(gl);
    try {
      rt = pmrem.fromScene(env, 0, 0.1, 100, { size: 64 });
      scene.environment = rt.texture;
      scene.environmentIntensity = ENV_INTENSITE;
    } catch {
      rt = null;
    } finally {
      pmrem.dispose();
    }
    geo.dispose();
    mat.dispose();
    invalidate();
    return () => {
      scene.environment = null;
      if (rt) rt.dispose();
    };
  }, [gl, scene, invalidate, teinte]);

  return null;
}
