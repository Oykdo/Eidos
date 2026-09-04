/**
 * Halo de fond — jauge, hors feuille.
 * Dôme à couleurs de sommets : FOND exact aux bords du champ, teinte de la scène
 * au centre. Vignettage « à l'envers » : le centre est levé, les coins ne bougent
 * pas (couture avec bg-fond à l'octet). Aucune texture, aucun GLSL.
 * toneMapped=false (sinon FOND ressortirait ≠ #12151a) ; scene.environment
 * n'atteint pas un MeshBasicMaterial (rien à neutraliser) ; fog=false (le dôme
 * à 40 unités serait entièrement fondu).
 * Lit la caméra au rendu React : pour une caméra fixe (prop camera du Canvas).
 * Une caméra animée dans useFrame ne rebâtit pas le dôme.
 */
import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ATELIER_FOND } from "@/components/canvas/atelier.ts";

/** Composantes sRGB d'une couleur CSS (toute forme acceptée par three). */
function srgb(css: string): [number, number, number] {
  const c = new THREE.Color(css).getRGB(new THREE.Color(), THREE.SRGBColorSpace);
  return [c.r, c.g, c.b];
}

export function Halo({
  teinte,
  cible = [0, 0, 0],
  force = 0.06,
}: {
  teinte: string;
  cible?: [number, number, number];
  force?: number;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.viewport.aspect);
  const cx = camera.position.x;
  const cy = camera.position.y;
  const cz = camera.position.z;
  const [tx, ty, tz] = cible;
  const fov = camera.fov;

  const fond = srgb(ATELIER_FOND);
  const t = srgb(teinte);
  const ecart = Math.max(
    Math.abs(t[0] - fond[0]),
    Math.abs(t[1] - fond[1]),
    Math.abs(t[2] - fond[2]),
  );
  // Sous 1,5/255 au centre le halo est invisible (terre #4a5a48 : +2/255) : rien à monter.
  const utile = ecart * force * 255 >= 1.5;

  const geo = useMemo(() => {
    if (!utile) return null;
    const f = srgb(ATELIER_FOND);
    const c1 = srgb(teinte);
    const g = new THREE.SphereGeometry(40, 48, 32);
    // Le plus petit des deux demi-angles : les bords restent FOND sur un canvas
    // plus haut que large comme sur un plus large que haut.
    const demiV = ((fov * Math.PI) / 180) * 0.5;
    const demiH = Math.atan(Math.tan(demiV) * aspect);
    const sigma = 0.45 * Math.min(demiV, demiH);
    const oeil = new THREE.Vector3(cx, cy, cz);
    const fwd = new THREE.Vector3(tx, ty, tz).sub(oeil).normalize();
    const pos = g.attributes.position!;
    const col = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).sub(oeil).normalize();
      const theta = Math.acos(THREE.MathUtils.clamp(v.dot(fwd), -1, 1));
      const k = force * Math.exp(-(theta * theta) / (sigma * sigma));
      // Mélange en sRGB, puis conversion en linéaire par three.
      c.setRGB(
        f[0] + (c1[0] - f[0]) * k,
        f[1] + (c1[1] - f[1]) * k,
        f[2] + (c1[2] - f[2]) * k,
        THREE.SRGBColorSpace,
      );
      col[3 * i] = c.r;
      col[3 * i + 1] = c.g;
      col[3 * i + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [utile, fov, aspect, cx, cy, cz, tx, ty, tz, teinte, force]);

  useEffect(() => () => geo?.dispose(), [geo]);

  if (!utile || !geo) return null;
  return (
    <mesh geometry={geo} frustumCulled={false} renderOrder={-1}>
      <meshBasicMaterial
        vertexColors
        side={THREE.BackSide}
        toneMapped={false}
        fog={false}
        depthWrite={false}
        dithering
      />
    </mesh>
  );
}
