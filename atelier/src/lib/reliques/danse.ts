/**
 * Danses — une par muse. Une transformation de l'espace appliquée avant la
 * forme, identité à phase 0, période 2π. Même code que `danse()` dans
 * relique.frag.glsl : ici la référence CPU, là le rendu.
 *
 *   0 Uranie      ★ nutation : l'axe des sphères oscille en X puis en Z
 *   1 Polymnie    ♄ précession : l'anneau bascule
 *   2 Euterpe     ♃ tempo : pulsation verticale à double cadence
 *   3 Érato       ♂ culbute : rotation autour de l'axe (1, 1, 0)
 *   4 Melpomène   ☉ flamme : étirement vertical qui monte et retombe
 *   5 Terpsichore ♀ ronde : un tour complet par période
 *   6 Calliope    ☿ vis sans fin : tourne à l'envers et ondule
 *   7 Clio        ☽ phases : le croissant bascule
 *   8 Thalie      ⊕ rebond : écrasement puis étirement
 *
 * Figures, pas preuves : la danse ne change rien à ce que la relique engage.
 */

import type { SignatureId } from "../eidos/signatures.ts";

export type Vec3 = readonly [number, number, number];

export const DANSES: Record<SignatureId, { fr: string; en: string }> = {
  uranie: { fr: "nutation", en: "nutation" },
  saturne: { fr: "précession de l'anneau", en: "ring precession" },
  jupiter: { fr: "tempo", en: "tempo" },
  mars: { fr: "culbute", en: "tumble" },
  soleil: { fr: "flamme", en: "flame" },
  venus: { fr: "ronde", en: "round dance" },
  mercure: { fr: "vis sans fin", en: "endless screw" },
  lune: { fr: "phases", en: "phases" },
  terre: { fr: "rebond", en: "bounce" },
};

export const PERIODE_DANSE_S = 11.3;

function rotXZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * p[0] - s * p[2], p[1], s * p[0] + c * p[2]];
}
function rotYZ(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p[0], c * p[1] - s * p[2], s * p[1] + c * p[2]];
}
function rotXY(p: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c * p[0] - s * p[1], s * p[0] + c * p[1], p[2]];
}
/** Rodrigues : rotation d'angle a autour de l'axe unitaire k. */
function rotAxe(v: Vec3, k: Vec3, a: number): Vec3 {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cx = k[1] * v[2] - k[2] * v[1];
  const cy = k[2] * v[0] - k[0] * v[2];
  const cz = k[0] * v[1] - k[1] * v[0];
  return [
    v[0] * c + cx * s + k[0] * kv * (1 - c),
    v[1] * c + cy * s + k[1] * kv * (1 - c),
    v[2] * c + cz * s + k[2] * kv * (1 - c),
  ];
}

const AXE_ERATO: Vec3 = [Math.SQRT1_2, Math.SQRT1_2, 0];

export function danse(p: Vec3, fam: number, phase: number): Vec3 {
  const s = Math.sin(phase);
  const h = (1 - Math.cos(phase)) / 2;
  switch (fam) {
    case 0:
      return rotXY(rotYZ(p, 0.25 * s), 0.18 * Math.sin(2 * phase));
    case 1:
      return rotYZ(p, 0.35 * s);
    case 2: {
      const k = 1 + 0.12 * Math.sin(2 * phase);
      const w = Math.sqrt(k);
      return [p[0] * w, p[1] / k, p[2] * w];
    }
    case 3:
      return rotAxe(p, AXE_ERATO, 0.4 * s);
    case 4: {
      const k = 1 + 0.15 * h;
      return [p[0], p[1] / k, p[2]];
    }
    case 5:
      return rotXZ(p, phase);
    case 6:
      return rotXZ([p[0], p[1] - 0.05 * s, p[2]], -phase);
    case 7:
      return rotXZ(p, 0.6 * s);
    default: {
      const k = 1 + 0.12 * s;
      const w = Math.sqrt(k);
      return [p[0] * w, (p[1] + 0.04 * s * s) / k, p[2] * w];
    }
  }
}

/** Les danses qui étirent l'espace (2, 4, 8) ne conservent pas la distance :
 *  on rétrécit le pas de marche d'autant. */
export function facteurDanse(fam: number): number {
  return fam === 2 || fam === 4 || fam === 8 ? 0.85 : 1;
}
