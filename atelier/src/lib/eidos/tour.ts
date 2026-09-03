/**
 * Tour — 255 coupes dans SU(2). Pas 255 paliers.
 * La ville est le coffre. Ici on explore l'invariant, on n'y ajoute rien.
 * Graine : SHA-256d(tag ‖ étage). Shoemake entier = quadrupleDepuis.
 * Même classe sur un palier : résonance destructive. Aucun HP.
 */

import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { quadrupleDepuis, type Q } from "./cosmos.ts";
import { SIGNATURES, type Signature, type SignatureId } from "./signatures.ts";
import { resonanceDe, type LectureEnsemble } from "./resonance.ts";

export const TAG_TOUR = utf8("eidos-tour/1");
export const ETAGES = 255;
export const DALLE_N = 9;

export function etageDe(n: number): number {
  return ((n % ETAGES) + ETAGES) % ETAGES;
}

/** Terre au sol, Uranie au faîte. Bandes : étage × 9 / 255. */
export function biomeDe(etage: number): Signature {
  const e = etageDe(etage);
  const bande = Math.min(8, Math.floor((e * 9) / ETAGES));
  return SIGNATURES[8 - bande]!;
}

export function graineEtage(etage: number): Uint8Array {
  return sha256d(concat(TAG_TOUR, u32(etageDe(etage))));
}

/** Coupe de l'espace : un quaternion de norme ATOMES. */
export function coupeDe(etage: number): Q {
  return quadrupleDepuis(graineEtage(etage));
}

export type Occupant = {
  k: number;
  q: Q;
  classe: SignatureId;
};

export function occupantsDe(etage: number): Occupant[] {
  const g = graineEtage(etage);
  const n = 1 + (g[0]! % 3);
  const classe = biomeDe(etage).id;
  const out: Occupant[] = [];
  for (let k = 0; k < n; k++) {
    out.push({
      k,
      q: quadrupleDepuis(sha256d(concat(g, u32(k)))),
      classe,
    });
  }
  return out;
}

export function dalleDe(etage: number): boolean[][] {
  const g = graineEtage(etage);
  const m: boolean[][] = [];
  let i = 0;
  for (let y = 0; y < DALLE_N; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < DALLE_N; x++) {
      const b = g[i >> 3]!;
      row.push(((b >> (i & 7)) & 1) === 1);
      i += 1;
    }
    m.push(row);
  }
  return m;
}

export function resonanceEtage(etage: number): LectureEnsemble {
  return resonanceDe(occupantsDe(etage).map((o) => ({ q: o.q, classe: o.classe })));
}

/** Jauge — hors feuille. */
export const TEINTE_BIOME: Record<SignatureId, string> = {
  uranie: "#e8e6e1",
  saturne: "#8a847c",
  jupiter: "#c9a227",
  mars: "#a33b2a",
  soleil: "#e2c36a",
  venus: "#b56b7a",
  mercure: "#7a8a9a",
  lune: "#c5c0b5",
  terre: "#4a5a48",
};
