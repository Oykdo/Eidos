/**
 * Occupance voxel — invariant d'un objet.
 * Entiers uniquement. La teinte (jauge) n'entre pas ici.
 * q et −q : même mot, mêmes voxels. L'orientation 3D (affichage) lit le quaternion.
 */

import { deconstruireMot, isqrt, type Objet } from "./objets.ts";
import type { SignatureId } from "./signatures.ts";

export const VOXEL_N = 12;

export type Voxel = { readonly x: number; readonly y: number; readonly z: number };

function p(i: number): number {
  return 2 * i - (VOXEL_N - 1);
}

function r2(x: number, y: number, z: number): number {
  return x * x + y * y + z * z;
}

function rad(x: number, z: number): number {
  return Number(isqrt(BigInt(x * x + z * z)));
}

function orient(x: number, y: number, z: number, omise: number): [number, number, number] {
  if (omise === 0) return [y, x, z];
  if (omise === 2) return [x, z, y];
  if (omise === 3) return [z, y, x];
  return [x, y, z];
}

function occupeFamille(
  id: SignatureId,
  x: number,
  y: number,
  z: number,
  fat: number,
  cut: number,
): boolean {
  const s = r2(x, y, z);
  switch (id) {
    case "uranie":
      return r2(x, y - 8, z) <= fat * 4 || s <= fat * 6 || r2(x, y + 8, z) <= fat * 4;
    case "saturne": {
      const d = rad(x, z) - 8;
      return s <= fat * 5 || d * d + y * y <= 3 + fat;
    }
    case "jupiter":
      return x * x + y * y * 2 + z * z <= fat * 10 || (Math.abs(y) <= 2 && rad(x, z) >= 6 && rad(x, z) <= 9);
    case "mars": {
      const oct = Math.abs(x) + Math.abs(y) + Math.abs(z) <= 8 + fat;
      const fente = Math.abs(x) + Math.abs(z) <= 1 + cut && Math.abs(y) <= 8;
      return oct && !fente;
    }
    case "soleil": {
      const coeur = s <= fat * 7;
      const d = rad(x, z) - 8;
      const anneau = d * d + y * y <= 2 + (fat >> 1);
      const pic = y >= 6 && x * x + z * z <= 3;
      return coeur || anneau || pic;
    }
    case "venus":
      return r2(x - 5, y, z) <= fat * 6 || r2(x + 5, y, z) <= fat * 6;
    case "mercure": {
      const tige = Math.abs(x) <= 2 && Math.abs(z) <= 2;
      const helice = Math.abs(((x + 11) + (z + 11) * 2 - (y + 11)) % 7) <= 1 && rad(x, z) >= 4 && rad(x, z) <= 8;
      return tige || helice;
    }
    case "lune":
      return s <= fat * 9 && r2(x - 5, y - 1, z - 2) > fat * 7 + cut * 2;
    default: {
      const dalle = y <= -6 && Math.abs(x) <= 8 && Math.abs(z) <= 8;
      const oeuf = r2(x, y - 1, z) <= fat * 6;
      return dalle || oeuf;
    }
  }
}

export function voxelsDe(o: Objet): Voxel[] {
  const { omise, c } = deconstruireMot(o.mot);
  const fat = 3 + (c[0] >> 8);
  const cut = c[1] >> 8;
  const nids = c[2] >> 8;
  const out: Voxel[] = [];
  for (let x = 0; x < VOXEL_N; x++) {
    for (let y = 0; y < VOXEL_N; y++) {
      for (let z = 0; z < VOXEL_N; z++) {
        const [ix, iy, iz] = orient(p(x), p(y), p(z), omise);
        if (occupeFamille(o.archetype, ix, iy, iz, fat, cut)) out.push({ x, y, z });
      }
    }
  }
  if (out.length === 0) out.push({ x: 6, y: 6, z: 6 });
  if (nids > 0) {
    const az = c[2] & 7;
    for (let i = 0; i < nids && i < 3; i++) {
      const a = az + i * 3;
      const vx = 6 + (((a * 5) % 7) - 3);
      const vz = 6 + (((a * 3) % 7) - 3);
      const vy = 6 + (i % 3) - 1;
      if (vx >= 0 && vx < VOXEL_N && vz >= 0 && vz < VOXEL_N && vy >= 0 && vy < VOXEL_N) {
        if (!out.some((v) => v.x === vx && v.y === vy && v.z === vz)) {
          out.push({ x: vx, y: vy, z: vz });
        }
      }
    }
  }
  return out;
}

export function empreinteVoxels(o: Objet): string {
  const vs = voxelsDe(o);
  const bits = new Uint8Array(Math.ceil((VOXEL_N * VOXEL_N * VOXEL_N) / 8));
  for (const v of vs) {
    const i = v.x + VOXEL_N * (v.y + VOXEL_N * v.z);
    bits[i >> 3]! |= 1 << (i & 7);
  }
  return Array.from(bits, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const METAUX_VOXEL: Record<Objet["age"], readonly [number, number, number]> = {
  Satya: [201, 162, 39],
  Treta: [62, 142, 110],
  Dvapara: [58, 110, 165],
  Kali: [168, 51, 42],
};

/** Jauge : décalage de teinte depuis le nonce. Hors invariant. */
export function rgbJauge(age: Objet["age"], nonce: number): [number, number, number] {
  const [r, g, b] = METAUX_VOXEL[age];
  const dr = ((nonce >> 8) & 31) - 15;
  const dg = ((nonce >> 3) & 31) - 15;
  const db = (nonce & 31) - 15;
  return [
    Math.max(0, Math.min(255, r + dr)),
    Math.max(0, Math.min(255, g + dg)),
    Math.max(0, Math.min(255, b + db)),
  ];
}
