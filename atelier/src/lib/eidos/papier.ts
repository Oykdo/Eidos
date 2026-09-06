/**
 * Papier — 32 mini-grilles × 64 signes, trois cartons (Sel, Mercure, Soufre).
 *
 * Un octet = une grille 2×2 incomplète : la case remplie (2 bits) et le
 * signe parmi 64 (6 bits). 32 grilles = 32 octets = 256 bits.
 * Shamir GF(256) 2-of-3 : deux cartons reconstruisent, un seul ne dépense pas.
 * Rangée de 4 signes : SHA-256d de la part (3 octets). Le JSON ne change pas.
 */

import { CARACTERES } from "./chymie.ts";
import { concat, sha256, sha256d, utf8 } from "./hash.ts";

export const N_GRILLES = 32;
export const COTE = 2;
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

const TAG = utf8("eidos-papier/2");

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  const xtime = (a: number) => ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 255;
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

/** Case remplie 0..3 = 2 bits de poids fort ; signe 0..63 = 6 bits. */
export type Grille = { pos: 0 | 1 | 2 | 3; code: number };

export function grilleDeOctet(b: number): Grille {
  const v = b & 255;
  return { pos: ((v >> 6) & 3) as 0 | 1 | 2 | 3, code: v & 63 };
}

export function octetDeGrille(g: Grille): number {
  return ((g.pos & 3) << 6) | (g.code & 63);
}

export type Carte = {
  prima: Prima;
  grilles: Grille[];
  controle: number[];
  part: Uint8Array;
};

export function carteDe(secret: Uint8Array, prima: Prima): Carte {
  const part = partDe(secret, prima.x);
  const grilles = Array.from({ length: N_GRILLES }, (_, i) => grilleDeOctet(part[i]!));
  const controle = encoderCtrl(sha256d(part).slice(0, 3));
  return { prima, grilles, controle, part };
}

export function lirePart(carte: Pick<Carte, "prima" | "grilles" | "controle">): Uint8Array {
  if (carte.grilles.length !== N_GRILLES) throw new Error("32 grilles");
  const part = new Uint8Array(N_GRILLES);
  for (let i = 0; i < N_GRILLES; i++) part[i] = octetDeGrille(carte.grilles[i]!);
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
