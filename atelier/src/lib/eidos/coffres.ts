/**
 * Forme des coffres 3D — constantes d'audit.
 * Les formules restent ici et dans docs/SPEC_AUDIT_COFFRES.md.
 * La scène n'affiche aucune équation.
 */

import { ATOMES } from "./constantes.ts";
import type { Sortie } from "./types.ts";

export const PALETTE_FOND = [
  "#FFFFFF",
  "#E8F4FF",
  "#C5E4FF",
  "#8FCBFF",
  "#4AA3F0",
  "#1E6FCB",
  "#0B4A96",
  "#062A5A",
] as const;

export const PALETTE_AVANT = [
  "#FFF4D4",
  "#F0D48A",
  "#C9A227",
  "#B8860B",
  "#8A5A12",
  "#6B3F0A",
  "#3D2408",
  "#1A1006",
] as const;

export type Palette8 = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export const COFFRE_AVANT = {
  id: "avant" as const,
  position: [0, 0.42, 1.55] as const,
  scale: 1,
  palette: PALETTE_AVANT,
};

export const COFFRE_FOND = {
  id: "fond" as const,
  position: [0, 1.12, -0.15] as const,
  scale: 0.62,
  palette: PALETTE_FOND,
};

/** z = exp(-(x² + y²)) — socle. */
export function gaussienne(x: number, y: number): number {
  return Math.exp(-(x * x + y * y));
}

export function cartesiens(r: number, theta: number, phi: number): {
  x: number;
  y: number;
  z: number;
} {
  const st = Math.sin(theta);
  return {
    x: r * st * Math.cos(phi),
    y: r * st * Math.sin(phi),
    z: r * Math.cos(theta),
  };
}

/**
 * Somme polaire de e^{-r²} r dr dθ.
 * Contrôle d'audit : tend vers π. N'apparaît pas à l'écran.
 */
export function integraleGaussienne(nr = 256, nphi = 256): number {
  const dr = 8 / nr;
  const dphi = (2 * Math.PI) / nphi;
  let s = 0;
  for (let i = 0; i < nr; i++) {
    const r = (i + 0.5) * dr;
    const anneau = Math.exp(-r * r) * r * dr * dphi * nphi;
    s += anneau;
  }
  return s;
}

export function teinte(palette: Palette8, index: number): string {
  const i = ((index % 8) + 8) % 8;
  return palette[i]!;
}

export function soldeAtomes(sorties: readonly Pick<Sortie, "montant">[]): number {
  return sorties.reduce((s, o) => s + o.montant, 0);
}

/**
 * Amplitude de la cloche depuis le solde du carnet (atomes).
 * 0 → 0.28 ; 1 eidôlon → ~0.72 ; croît en log10, plafonné à 1.85.
 */
export function amplitudeDuSolde(atomes: number): number {
  const n = Number.isFinite(atomes) && atomes > 0 ? atomes : 0;
  const e = n / ATOMES;
  return Math.min(1.85, 0.28 + Math.log10(1 + e) * 0.72);
}

/** R entier : 7² = 49. P = (2,3,6) est sur la sphère. */
export const SPHERE_R = 7;
export const SPHERE_P = [2, 3, 6] as const;

export const ORNEMENT_TEINTE = {
  coquille: "#4AA3F0",
  equator: "#3e8e6e",
  meridien: "#3A6EA5",
  axe: "#C6CBD1",
  rayon: "#C9A227",
  point: "#FFF4D4",
} as const;

export type KindOrnement = keyof typeof ORNEMENT_TEINTE;
export type VoxelOrnement = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly kind: KindOrnement;
};

function poser(
  m: Map<string, VoxelOrnement>,
  x: number,
  y: number,
  z: number,
  kind: KindOrnement,
) {
  const k = `${x},${y},${z}`;
  const prev = m.get(k);
  const rang: Record<KindOrnement, number> = {
    coquille: 0,
    equator: 1,
    meridien: 2,
    axe: 3,
    rayon: 4,
    point: 5,
  };
  if (!prev || rang[kind] >= rang[prev.kind]) m.set(k, { x, y, z, kind });
}

function bresenham3(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const dz = Math.abs(z1 - z0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  const sz = z0 < z1 ? 1 : -1;
  let x = x0;
  let y = y0;
  let z = z0;
  pts.push([x, y, z]);
  if (dx >= dy && dx >= dz) {
    let p1 = 2 * dy - dx;
    let p2 = 2 * dz - dx;
    for (let i = 0; i < dx; i++) {
      x += sx;
      if (p1 >= 0) {
        y += sy;
        p1 -= 2 * dx;
      }
      if (p2 >= 0) {
        z += sz;
        p2 -= 2 * dx;
      }
      p1 += 2 * dy;
      p2 += 2 * dz;
      pts.push([x, y, z]);
    }
  } else if (dy >= dx && dy >= dz) {
    let p1 = 2 * dx - dy;
    let p2 = 2 * dz - dy;
    for (let i = 0; i < dy; i++) {
      y += sy;
      if (p1 >= 0) {
        x += sx;
        p1 -= 2 * dy;
      }
      if (p2 >= 0) {
        z += sz;
        p2 -= 2 * dy;
      }
      p1 += 2 * dx;
      p2 += 2 * dz;
      pts.push([x, y, z]);
    }
  } else {
    let p1 = 2 * dy - dz;
    let p2 = 2 * dx - dz;
    for (let i = 0; i < dz; i++) {
      z += sz;
      if (p1 >= 0) {
        y += sy;
        p1 -= 2 * dz;
      }
      if (p2 >= 0) {
        x += sx;
        p2 -= 2 * dz;
      }
      p1 += 2 * dy;
      p2 += 2 * dx;
      pts.push([x, y, z]);
    }
  }
  return pts;
}

/**
 * Ornement (r, θ, φ) — grands cercles, axes, rayon vers P.
 * Entiers uniquement. P² = R².
 */
export function voxelsOrnementSpherique(): VoxelOrnement[] {
  const R = SPHERE_R;
  const R2 = R * R;
  const m = new Map<string, VoxelOrnement>();
  const lim = R + 2;
  for (let x = -lim; x <= lim; x++) {
    for (let y = -lim; y <= lim; y++) {
      for (let z = -lim; z <= lim; z++) {
        const s = x * x + y * y + z * z;
        const coq = Math.abs(s - R2) <= R;
        if (coq && z === 0) poser(m, x, y, z, "equator");
        else if (coq && (x === 0 || y === 0)) poser(m, x, y, z, "meridien");
        else if (coq && Math.abs(z) === 3) poser(m, x, y, z, "coquille");
      }
    }
  }
  for (let t = -lim; t <= lim; t++) {
    if (t !== 0) {
      poser(m, t, 0, 0, "axe");
      poser(m, 0, t, 0, "axe");
      poser(m, 0, 0, t, "axe");
    }
  }
  for (const [x, y, z] of bresenham3(0, 0, 0, SPHERE_P[0], SPHERE_P[1], SPHERE_P[2])) {
    if (x === 0 && y === 0 && z === 0) continue;
    poser(m, x, y, z, "rayon");
  }
  const [px, py, pz] = SPHERE_P;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2) {
          poser(m, px + dx, py + dy, pz + dz, "point");
        }
      }
    }
  }
  return [...m.values()];
}

