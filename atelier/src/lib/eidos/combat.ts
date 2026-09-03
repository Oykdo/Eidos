/**
 * Stats de combat — lecture du mot, pas un second invariant.
 *
 * Somme = COMBAT_BUDGET. Un objet extrême n'est pas plus fort :
 * il est plus spécialisé. L'archétype permute les axes (affinité),
 * il ne multiplie rien. L'âge n'entre pas : c'est une géographie.
 *
 * fer        attaque
 * cuirasse   défense
 * flux       initiative
 * souffle    portée / reprise
 */

import { depaqueter, type Objet } from "./objets.ts";
import type { SignatureId } from "./signatures.ts";

export const COMBAT_BUDGET = 64;

export const COMBAT_AXES = ["fer", "cuirasse", "flux", "souffle"] as const;
export type AxeCombat = (typeof COMBAT_AXES)[number];

export type Combat = {
  fer: number;
  cuirasse: number;
  flux: number;
  souffle: number;
  somme: number;
  pointe: AxeCombat;
};

/** Composante 0..3 → axe. Permutation d'affinité, pas un bonus. */
const PERM: Record<SignatureId, readonly [AxeCombat, AxeCombat, AxeCombat, AxeCombat]> = {
  uranie: ["souffle", "flux", "cuirasse", "fer"],
  saturne: ["cuirasse", "souffle", "fer", "flux"],
  jupiter: ["fer", "cuirasse", "souffle", "flux"],
  mars: ["fer", "flux", "cuirasse", "souffle"],
  soleil: ["souffle", "fer", "flux", "cuirasse"],
  venus: ["flux", "souffle", "fer", "cuirasse"],
  mercure: ["flux", "fer", "souffle", "cuirasse"],
  lune: ["cuirasse", "flux", "souffle", "fer"],
  terre: ["cuirasse", "fer", "flux", "souffle"],
};

function allouer(poids: readonly number[]): number[] {
  const s = poids[0]! + poids[1]! + poids[2]! + poids[3]! || 1;
  const exact = poids.map((p) => (p * COMBAT_BUDGET) / s);
  const base = exact.map((x) => Math.floor(x));
  const reste = COMBAT_BUDGET - (base[0]! + base[1]! + base[2]! + base[3]!);
  const ordre = [0, 1, 2, 3].sort((a, b) => {
    const fa = exact[a]! - base[a]!;
    const fb = exact[b]! - base[b]!;
    if (fb !== fa) return fb - fa;
    return a - b;
  });
  const out = base.slice();
  for (let k = 0; k < reste; k++) out[ordre[k]!]! += 1;
  return out;
}

export function combatDe(o: Objet): Combat {
  const q = depaqueter(o.mot);
  const poids = [Math.abs(q[0]!), Math.abs(q[1]!), Math.abs(q[2]!), Math.abs(q[3]!)];
  const parts = allouer(poids);
  const perm = PERM[o.archetype];
  const c: Combat = {
    fer: 0,
    cuirasse: 0,
    flux: 0,
    souffle: 0,
    somme: COMBAT_BUDGET,
    pointe: perm[0]!,
  };
  for (let i = 0; i < 4; i++) c[perm[i]!] = parts[i]!;
  let best = -1;
  for (const axe of COMBAT_AXES) {
    if (c[axe] > best) {
      best = c[axe];
      c.pointe = axe;
    }
  }
  return c;
}
