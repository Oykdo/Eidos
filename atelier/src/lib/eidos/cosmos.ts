/**
 * eidos-objets/1 — quaternions entiers, norme 10⁸.
 * Aucun flottant dans l'invariant. BigInt partout.
 * Le mot u32 de objets.ts reste l'affichage atelier ; ceci est le catalogue.
 */

import { concat, hexOf, sha256d, u32, utf8 } from "./hash.ts";

export const NORME = 100_000_000n;
export const RACINE = 10_000n;
export const GRAINE_COSMOS = utf8("eidos-objets-cosmos-v1");
export const TAG_GRIND = utf8("eidos-grind/1");

export type Q = readonly [bigint, bigint, bigint, bigint];

export const FACTEURS_2: readonly Q[] = [
  [1n, 1n, 0n, 0n],
  [1n, 0n, 1n, 0n],
  [1n, 0n, 0n, 1n],
  [0n, 1n, 1n, 0n],
  [0n, 1n, 0n, 1n],
  [0n, 0n, 1n, 1n],
];

export const FACTEURS_5: readonly Q[] = [
  [2n, 1n, 0n, 0n],
  [2n, 0n, 1n, 0n],
  [2n, 0n, 0n, 1n],
  [1n, 2n, 0n, 0n],
  [0n, 2n, 1n, 0n],
  [0n, 2n, 0n, 1n],
  [1n, 0n, 2n, 0n],
  [0n, 1n, 2n, 0n],
  [0n, 0n, 2n, 1n],
  [1n, 0n, 0n, 2n],
  [0n, 1n, 0n, 2n],
  [0n, 0n, 1n, 2n],
];

export const REGIMES = [
  "Vide",
  "Nebuleuse",
  "Pulsar",
  "Eclipse",
  "Comete",
  "Horizon",
  "Quasar",
] as const;

export type Regime = (typeof REGIMES)[number];

export function norme2(q: Q): bigint {
  return q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
}

export function canoniser(q: Q): Q {
  for (const x of q) {
    if (x !== 0n) return x > 0n ? q : ([-q[0], -q[1], -q[2], -q[3]] as Q);
  }
  return q;
}

export function produit(p: Q, q: Q): Q {
  const [a1, b1, c1, d1] = p;
  const [a2, b2, c2, d2] = q;
  return [
    a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2,
    a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2,
    a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2,
    a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2,
  ];
}

export function conjugue(q: Q): Q {
  return canoniser([q[0], -q[1], -q[2], -q[3]]);
}

export function composer(attaquant: Q, etat: Q): Q {
  return produit(attaquant, etat);
}

export function parer(attaquant: Q, etat: Q): Q {
  return produit(conjugue(attaquant), etat);
}

export function alignement(q: Q, ancre: Q): bigint {
  return q[0] * ancre[0] + q[1] * ancre[1] + q[2] * ancre[2] + q[3] * ancre[3];
}

/** dot² · NORME ≥ seuil² · |etat|² — aucune division. */
export function alignementTient(etat: Q, ancre: Q, seuil: bigint): boolean {
  const d = alignement(etat, ancre);
  return d * d * NORME >= seuil * seuil * norme2(etat);
}

export function isqrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  let x0 = n;
  let x1 = (x0 + 1n) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + n / x0) / 2n;
  }
  return x0;
}

/** Même ordre que objets.py : b décroissant, c décroissant, break après 1er d. */
export function troisCarres(r: bigint, maxReps = 48): [bigint, bigint, bigint][] {
  const out: [bigint, bigint, bigint][] = [];
  for (let b = isqrt(r); b >= 0n; b--) {
    const reste = r - b * b;
    for (let c = isqrt(reste); c >= 0n; c--) {
      const dd = reste - c * c;
      const d = isqrt(dd);
      if (d * d !== dd) continue;
      out.push([b, c, d]);
      break;
    }
    if (out.length >= maxReps) break;
  }
  return out;
}

export function* flot(graine: Uint8Array): Generator<number> {
  let etat = sha256d(graine);
  while (true) {
    for (let i = 0; i < 32; i += 4) {
      yield ((etat[i]! << 24) | (etat[i + 1]! << 16) | (etat[i + 2]! << 8) | etat[i + 3]!) >>> 0;
    }
    etat = sha256d(etat);
  }
}

export function quadrupleDepuis(graine: Uint8Array): Q {
  const g = flot(graine);
  let q: Q = [1n, 0n, 0n, 0n];
  for (let i = 0; i < 8; i++) {
    q = produit(q, FACTEURS_2[g.next().value! % FACTEURS_2.length]!);
  }
  for (let i = 0; i < 8; i++) {
    q = produit(q, FACTEURS_5[g.next().value! % FACTEURS_5.length]!);
  }
  if (norme2(q) !== NORME) throw new Error("norme");
  return canoniser(q);
}

function* spirale(n: number): Generator<number> {
  yield 0;
  for (let k = 1; k <= n; k++) {
    yield -k;
    yield k;
  }
}

export function impactDepuis(graine: Uint8Array, q0Vise: number): Q {
  const g = flot(graine);
  const biais = g.next().value!;
  const depart = q0Vise - (g.next().value! % 48);
  for (const d of spirale(400)) {
    const a = depart + d;
    if (a <= 0 || a >= Number(RACINE)) continue;
    const aa = BigInt(a);
    const reps = troisCarres(NORME - aa * aa);
    if (reps.length === 0) continue;
    const [b, c, d3] = reps[biais % reps.length]!;
    const signes = g.next().value!;
    const q: Q = [
      aa,
      signes & 1 ? b : -b,
      signes & 2 ? c : -c,
      signes & 4 ? d3 : -d3,
    ];
    if (norme2(q) !== NORME) throw new Error("impact");
    return canoniser(q);
  }
  throw new Error(`aucun impact q0 ~ ${q0Vise}`);
}

export function ascendant(i: number): number {
  return (3 * i) % 7;
}

export const CYCLE_FEDERATION = [0, 3, 6, 2, 5, 1, 4] as const;

/** Depuis l'ascendant de la cible : deux compositions par tour. */
export function coupsParTour(regimeAttaquant: Regime, regimeCible: Regime): 1 | 2 {
  const iCible = REGIMES.indexOf(regimeCible);
  const iAtt = REGIMES.indexOf(regimeAttaquant);
  if (iCible < 0 || iAtt < 0) return 1;
  return REGIMES[ascendant(iCible)] === regimeAttaquant ? 2 : 1;
}

/**
 * Grind ouvert, joueurs non plafonnés.
 * graine = SHA-256d( tag ‖ sig_lamport ‖ hash_bloc ‖ roll )
 * Chaque joueur a sa sig. Chaque tentative a son roll. Le validateur
 * ne choisit pas la sig ; le joueur ne choisit pas le bloc.
 */
export function graineGrind(
  sig: Uint8Array,
  hashBloc: Uint8Array,
  roll: number,
): Uint8Array {
  return sha256d(concat(TAG_GRIND, sig, hashBloc, u32(roll >>> 0)));
}

export function orientationGrind(
  sig: Uint8Array,
  hashBloc: Uint8Array,
  roll: number,
): Q {
  return quadrupleDepuis(graineGrind(sig, hashBloc, roll));
}

export function empreinteNoyau(rang: number, regime: string, classe: string, orientation: Q): string {
  const corps = JSON.stringify({
    classe,
    orientation: orientation.map((x) => Number(x)),
    rang,
    regime,
  });
  return hexOf(sha256d(utf8(corps)));
}
