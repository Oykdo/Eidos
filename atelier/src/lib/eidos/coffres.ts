/**
 * Forme du coffre 3D — constantes d'audit.
 * Les formules restent ici et dans docs/SPEC_AUDIT_COFFRES.md.
 * La scène n'affiche aucune équation.
 *
 * Un seul coffre, au pic de la cloche. Sa palette est isochromatique : une
 * teinte, huit clartés, la teinte choisie par le palier du butin. Les
 * ornements s'ajoutent avec le palier. Jauge, hors feuille : rien ici ne
 * touche au carnet ni au mot des objets.
 */

import { ATOMES } from "./constantes.ts";
import { rangAffixe } from "./equipement.ts";
import type { Coffre, NomAge, ObjetPorte, Sortie } from "./types.ts";

// ---------------------------------------------------------------------------
// Paliers du butin
// ---------------------------------------------------------------------------
export const PALIERS_BUTIN = ["nu", "garni", "orne", "precieux"] as const;
export type PalierButin = (typeof PALIERS_BUTIN)[number];

/** Seuils de score → palier 1, 2, 3. */
export const SEUILS_BUTIN = [1, 4, 9] as const;

const POINTS_SCEAU: Record<NomAge, number> = { Kali: 1, Dvapara: 2, Treta: 3, Satya: 4 };

/**
 * Score entier, déterministe : objets, gemmes enchâssées, rang des affixes,
 * pierre philosophale, sceaux (âge). Aucune norme, aucun flottant.
 */
export function scoreButin(
  c: Pick<Coffre, "objets" | "philosophale">,
  sceaux: readonly NomAge[] = [],
): number {
  let s = 0;
  for (const o of c.objets ?? []) {
    s += 1;
    s += 2 * (o.gemmes?.length ?? 0);
    if (o.affixe) s += rangAffixe(o.affixe) - 1;
  }
  if (c.philosophale) s += 4;
  for (const a of sceaux) s += POINTS_SCEAU[a] ?? 0;
  return s;
}

export function palierDeScore(score: number): 0 | 1 | 2 | 3 {
  if (score >= SEUILS_BUTIN[2]) return 3;
  if (score >= SEUILS_BUTIN[1]) return 2;
  if (score >= SEUILS_BUTIN[0]) return 1;
  return 0;
}

export function palierButin(c: Pick<Coffre, "objets" | "philosophale">, sceaux: readonly NomAge[] = []): 0 | 1 | 2 | 3 {
  return palierDeScore(scoreButin(c, sceaux));
}

// ---------------------------------------------------------------------------
// Palettes isochromatiques : une teinte par palier, huit clartés
// ---------------------------------------------------------------------------
export type Palette8 = readonly [string, string, string, string, string, string, string, string];

/** Teinte (°) et saturation (%) de chaque palier. */
export const TEINTES_PALIER: readonly { nom: PalierButin; h: number; s: number }[] = [
  { nom: "nu", h: 215, s: 10 },        // acier
  { nom: "garni", h: 150, s: 30 },     // vert-de-gris
  { nom: "orne", h: 42, s: 65 },       // ambre-or
  { nom: "precieux", h: 275, s: 45 },  // améthyste
];

/** Clartés (%) des huit indices, du plus clair au plus sombre. */
export const CLARTES = [94, 84, 72, 60, 48, 36, 24, 12] as const;

export function hslVersHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  const c = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0").toUpperCase();
  return `#${c(f(0))}${c(f(8))}${c(f(4))}`;
}

/** Teinte dominante (°) d'un hex, pour l'audit. NaN si gris pur. */
export function teinteDeHex(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return NaN;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return ((h * 60) % 360 + 360) % 360;
}

export function paletteDePalier(palier: 0 | 1 | 2 | 3): Palette8 {
  const t = TEINTES_PALIER[palier]!;
  return CLARTES.map((l) => hslVersHex(t.h, t.s, l)) as unknown as Palette8;
}

export const PALETTES: readonly Palette8[] = [0, 1, 2, 3].map((p) => paletteDePalier(p as 0 | 1 | 2 | 3));

export function teinte(palette: Palette8, index: number): string {
  const i = ((index % 8) + 8) % 8;
  return palette[i]!;
}

// ---------------------------------------------------------------------------
// Le coffre, la cloche, la sphère
// ---------------------------------------------------------------------------
export const COFFRE = {
  position: [0, 0, 0] as const,
  scale: 1,
} as const;

/** Serrure, repère local du coffre (z avant, y milieu). Origine de la cage. */
export const SERRURE_LOCALE = [0, 0.15, 0.6] as const;
export const COUVERCLE_Y = 0.75;

/** z = exp(-(x² + y²)) — socle. */
export function gaussienne(x: number, y: number): number {
  return Math.exp(-(x * x + y * y));
}

export function cartesiens(r: number, theta: number, phi: number): { x: number; y: number; z: number } {
  const st = Math.sin(theta);
  return { x: r * st * Math.cos(phi), y: r * st * Math.sin(phi), z: r * Math.cos(theta) };
}

/** Somme polaire de e^{-r²} r dr dθ. Contrôle d'audit : tend vers π. */
export function integraleGaussienne(nr = 256, nphi = 256): number {
  const dr = 8 / nr;
  const dphi = (2 * Math.PI) / nphi;
  let s = 0;
  for (let i = 0; i < nr; i++) {
    const r = (i + 0.5) * dr;
    s += Math.exp(-r * r) * r * dr * dphi * nphi;
  }
  return s;
}

export function soldeAtomes(sorties: readonly Pick<Sortie, "montant">[]): number {
  return sorties.reduce((s, o) => s + o.montant, 0);
}

/** Amplitude de la cloche depuis le solde (atomes). 0 → 0.28 ; 1 eidôlon → ~0.72 ; log10, plafond 1.85. */
export function amplitudeDuSolde(atomes: number): number {
  const n = Number.isFinite(atomes) && atomes > 0 ? atomes : 0;
  return Math.min(1.85, 0.28 + Math.log10(1 + n / ATOMES) * 0.72);
}

// ---------------------------------------------------------------------------
// Ornements — par palier, tous en cellules entières
// ---------------------------------------------------------------------------
export const ORNEMENTS = ["tas", "ferrures", "cage", "couronne"] as const;
export type Ornement = (typeof ORNEMENTS)[number];

export const ORNEMENTS_PAR_PALIER: readonly (readonly Ornement[])[] = [
  [],
  ["tas"],
  ["tas", "ferrures"],
  ["tas", "ferrures", "cage", "couronne"],
];

export function ornementsDe(palier: 0 | 1 | 2 | 3): readonly Ornement[] {
  return ORNEMENTS_PAR_PALIER[palier]!;
}

export type Cellule = { x: number; y: number; z: number };

/** Tas sur le couvercle — au-dessus de y = 3. 10 cellules. */
export function voxelsTasCouvercle(): Cellule[] {
  const out: Cellule[] = [];
  for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) out.push({ x, y: 4, z });
  out.push({ x: 0, y: 5, z: 0 });
  return out;
}

/** Ferrures : les quatre arêtes verticales de la coque (x = ±4, z = ±3), y ∈ [−3, 3]. 28 cellules. */
export function voxelsFerrures(): Cellule[] {
  const out: Cellule[] = [];
  for (const x of [-4, 4]) for (const z of [-3, 3]) for (let y = -3; y <= 3; y++) out.push({ x, y, z });
  return out;
}

/** Couronne : anneau |x| + |z| = 2 posé sur le couvercle (y = 4). 8 cellules. */
export function voxelsCouronne(): Cellule[] {
  const out: Cellule[] = [];
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) if (Math.abs(x) + Math.abs(z) === 2) out.push({ x, y: 4, z });
  return out;
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
export type VoxelOrnement = { readonly x: number; readonly y: number; readonly z: number; readonly kind: KindOrnement };

function poser(m: Map<string, VoxelOrnement>, x: number, y: number, z: number, kind: KindOrnement) {
  const k = `${x},${y},${z}`;
  const prev = m.get(k);
  const rang: Record<KindOrnement, number> = { coquille: 0, equator: 1, meridien: 2, axe: 3, rayon: 4, point: 5 };
  if (!prev || rang[kind] >= rang[prev.kind]) m.set(k, { x, y, z, kind });
}

function bresenham3(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): [number, number, number][] {
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
      if (p1 >= 0) { y += sy; p1 -= 2 * dx; }
      if (p2 >= 0) { z += sz; p2 -= 2 * dx; }
      p1 += 2 * dy;
      p2 += 2 * dz;
      pts.push([x, y, z]);
    }
  } else if (dy >= dx && dy >= dz) {
    let p1 = 2 * dx - dy;
    let p2 = 2 * dz - dy;
    for (let i = 0; i < dy; i++) {
      y += sy;
      if (p1 >= 0) { x += sx; p1 -= 2 * dy; }
      if (p2 >= 0) { z += sz; p2 -= 2 * dy; }
      p1 += 2 * dx;
      p2 += 2 * dz;
      pts.push([x, y, z]);
    }
  } else {
    let p1 = 2 * dy - dz;
    let p2 = 2 * dx - dz;
    for (let i = 0; i < dz; i++) {
      z += sz;
      if (p1 >= 0) { y += sy; p1 -= 2 * dz; }
      if (p2 >= 0) { x += sx; p2 -= 2 * dz; }
      p1 += 2 * dy;
      p2 += 2 * dx;
      pts.push([x, y, z]);
    }
  }
  return pts;
}

/** Ornement (r, θ, φ) — grands cercles, axes, rayon vers P. Entiers uniquement. P² = R². */
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
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) <= 2) poser(m, px + dx, py + dy, pz + dz, "point");
      }
    }
  }
  return [...m.values()];
}

export type { ObjetPorte };
