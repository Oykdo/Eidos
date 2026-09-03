/**
 * Six lois — gelées. La géométrie est le jeu.
 * ||q||² = ATOMES, pas 1. Aucun flottant dans l'invariant.
 * Un objet ne mute pas. Un palier ne multiplie pas la norme.
 */

import { ATOMES, FIGURES } from "./constantes.ts";
import {
  CELLULES_DOXA,
  CLASSES,
  NORME,
  REGIMES,
  norme2,
  type Q,
} from "./cosmos.ts";
import { COMBAT_BUDGET } from "./combat.ts";
import { ETAGES } from "./tour.ts";
import { POSTE_JOUR } from "./poste.ts";
import { isqrt } from "./objets.ts";

export const LOIS = [
  "conservation",
  "groupe",
  "doxa",
  "sceau",
  "epoques",
  "resonance",
] as const;

export type Loi = (typeof LOIS)[number];

export const INTEGRITE = {
  norme: ATOMES,
  budget: COMBAT_BUDGET,
  classes: CLASSES.length,
  regimes: REGIMES.length,
  cellules: CELLULES_DOXA,
  etagesTour: ETAGES,
  posteJour: POSTE_JOUR,
} as const;

if (NORME !== BigInt(ATOMES)) throw new Error("NORME ≠ ATOMES");

export function celluleDoxa(classe: string, regime: string): string {
  return `${classe}×${regime}`;
}

/**
 * Lecture mécanique — jauge, régénérable.
 * Le sceau-hache reste l'identité ; celui-ci se lit.
 * Figure i = min(3, 4 |q_i| / |q|).
 */
export function glypheLecture(q: Q): string {
  const n = isqrt(norme2(q));
  if (n === 0n) return FIGURES[0]!.repeat(4);
  return [0, 1, 2, 3]
    .map((i) => {
      const a = q[i]! < 0n ? -q[i]! : q[i]!;
      const k = Number((a * 4n) / n);
      return FIGURES[Math.max(0, Math.min(3, k))]!;
    })
    .join("");
}
