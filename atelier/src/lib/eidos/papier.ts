/**
 * Papier — trois cartons de bingo incomplet (Sel, Mercure, Soufre).
 *
 * La graine (32 o) se partage en 2-of-3, Shamir GF(256). Les cartons
 * s'en déduisent : même coffre, mêmes papiers. Le JSON eidos.carnet
 * ne change pas. Une carte ne dépense pas ; deux reconstruisent.
 *
 * Grille 7×7, six cases vides (le carton incomplet), 43 signes = la part,
 * plus une rangée de 4 signes de contrôle (SHA-256d des 32 o, 3 octets).
 */

import { CARACTERES, decoderChymie, encoderChymie } from "./chymie.ts";
import { concat, sha256, sha256d, utf8 } from "./hash.ts";

export const COTE = 7;
export const CELLULES = COTE * COTE;
export const VIDES = 6;
export const SIGNS_PART = 43;
export const SIGNS_CTRL = 4;

export type PrimaId = "sel" | "mercure" | "soufre";

export type Prima = {
  id: PrimaId;
  x: 1 | 2 | 3;
  fr: string;
  en: string;
  uni: string;
};

export const TRIA: readonly Prima[] = [
  { id: "sel", x: 1, fr: "Sel", en: "Salt", uni: "🜔" },
  { id: "mercure", x: 2, fr: "Mercure", en: "Mercury", uni: "☿" },
  { id: "soufre", x: 3, fr: "Soufre", en: "Sulfur", uni: "🜍" },
] as const;

/** Six trous, positions 0..48, gelées. 49 − 6 = 43. */
export const TROUS: Record<PrimaId, readonly number[]> = {
  sel: [0, 6, 21, 24, 42, 48],
  mercure: [10, 16, 18, 30, 32, 38],
  soufre: [3, 15, 19, 28, 34, 45],
};

const TAG = utf8("eidos-papier/1");

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  const xtime = (a: number) => ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 255;
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x ^= xtime(x);
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]!;
})();

function add(a: number, b: number): number {
  return (a ^ b) & 255;
}

function mul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a]! + LOG[b]!]!;
}

function inv(a: number): number {
  if (a === 0) throw new Error("inv(0)");
  return EXP[255 - LOG[a]!]!;
}

function div(a: number, b: number): number {
  return mul(a, inv(b));
}

export function gfMul(a: number, b: number): number {
  return mul(a & 255, b & 255);
}

function pente(secret: Uint8Array): Uint8Array {
  return sha256(concat(TAG, secret));
}

export function partDe(secret: Uint8Array, x: 1 | 2 | 3): Uint8Array {
  if (secret.length !== 32) throw new Error("graine de 32 octets");
  const a1 = pente(secret);
  const y = new Uint8Array(32);
  for (let i = 0; i < 32; i++) y[i] = add(secret[i]!, mul(a1[i]!, x));
  return y;
}

export function assembler(parts: { x: 1 | 2 | 3; y: Uint8Array }[]): Uint8Array {
  if (parts.length < 2) throw new Error("deux parts");
  const a = parts[0]!;
  const b = parts[1]!;
  if (a.x === b.x) throw new Error("deux cartons distincts");
  if (a.y.length !== 32 || b.y.length !== 32) throw new Error("part de 32 octets");
  const dx = add(a.x, b.x);
  const s = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    const a1 = div(add(a.y[i]!, b.y[i]!), dx);
    s[i] = add(a.y[i]!, mul(a1, a.x));
  }
  return s;
}

export function encoderCtrl(o3: Uint8Array): number[] {
  if (o3.length !== 3) throw new Error("contrôle de 3 octets");
  let bits = "";
  for (const b of o3) bits += b.toString(2).padStart(8, "0");
  const out: number[] = [];
  for (let i = 0; i < 24; i += 6) out.push(parseInt(bits.slice(i, i + 6), 2));
  return out;
}

export function decoderCtrl(codes: number[]): Uint8Array {
  if (codes.length !== SIGNS_CTRL) throw new Error("4 signes de contrôle");
  let bits = "";
  for (const c of codes) bits += (c & 63).toString(2).padStart(6, "0");
  const o = new Uint8Array(3);
  for (let i = 0; i < 3; i++) o[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  return o;
}

export function positionsDonnees(id: PrimaId): number[] {
  const trou = new Set(TROUS[id]);
  const p: number[] = [];
  for (let i = 0; i < CELLULES; i++) if (!trou.has(i)) p.push(i);
  return p;
}

export type Cellule = { i: number; code: number | null };

export type Carte = {
  prima: Prima;
  cellules: Cellule[];
  controle: number[];
  part: Uint8Array;
};

export function carteDe(secret: Uint8Array, prima: Prima): Carte {
  const part = partDe(secret, prima.x);
  const codes = encoderChymie(part);
  if (codes.length !== SIGNS_PART) throw new Error("43 signes");
  const pos = positionsDonnees(prima.id);
  if (pos.length !== SIGNS_PART) throw new Error("43 cases");
  const cellules: Cellule[] = Array.from({ length: CELLULES }, (_, i) => ({ i, code: null }));
  for (let k = 0; k < pos.length; k++) cellules[pos[k]!] = { i: pos[k]!, code: codes[k]! };
  const controle = encoderCtrl(sha256d(part).slice(0, 3));
  return { prima, cellules, controle, part };
}

export function lirePart(carte: Pick<Carte, "prima" | "cellules" | "controle">): Uint8Array {
  const pos = positionsDonnees(carte.prima.id);
  const codes: number[] = [];
  for (const i of pos) {
    const c = carte.cellules[i]?.code;
    if (c === null || c === undefined) throw new Error("case vide au mauvais endroit");
    codes.push(c);
  }
  const part = decoderChymie(codes, 32);
  const ctrl = decoderCtrl(carte.controle);
  const attendu = sha256d(part).slice(0, 3);
  if (ctrl[0] !== attendu[0] || ctrl[1] !== attendu[1] || ctrl[2] !== attendu[2]) {
    throw new Error("contrôle : un signe a bougé");
  }
  return part;
}

export function reconstruire(a: Carte, b: Carte): Uint8Array {
  return assembler([
    { x: a.prima.x, y: lirePart(a) },
    { x: b.prima.x, y: lirePart(b) },
  ]);
}

export function papiersDe(secret: Uint8Array): Carte[] {
  return TRIA.map((p) => carteDe(secret, p));
}

export function signeDe(code: number) {
  return CARACTERES[code & 63]!;
}
