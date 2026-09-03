/**
 * Résonance d'ensemble — lecture, pas un bonus.
 * Même classe : destructif. Sinon la distance angulaire décide.
 * Rien n'est une table de sets.
 */

import { alignement, norme2, type Q } from "./cosmos.ts";
import { depaqueter } from "./objets.ts";

export type Polarite = "constructif" | "neutre" | "destructif";

export type Membre = {
  q: Q;
  classe: string;
};

export type LecturePaire = {
  i: number;
  j: number;
  polarite: Polarite;
  dot: bigint;
};

export type LectureEnsemble = {
  paires: LecturePaire[];
  nConstructif: number;
  nDestructif: number;
  nNeutre: number;
  /** Σ |dot| constructif − Σ |dot| destructif. Lecture. */
  tenue: bigint;
};

export function qDeMot(mot: number): Q {
  const q = depaqueter(mot);
  return [BigInt(q[0]), BigInt(q[1]), BigInt(q[2]), BigInt(q[3])];
}

export function polariteDe(dot: bigint, na: bigint, nb: bigint, memeClasse: boolean): Polarite {
  if (memeClasse) return "destructif";
  const d2 = dot * dot;
  const p = na * nb;
  if (p === 0n) return "neutre";
  if (d2 * 2n >= p) return "constructif";
  return "neutre";
}

export function paireDe(a: Membre, b: Membre, i: number, j: number): LecturePaire {
  const dot = alignement(a.q, b.q);
  const polarite = polariteDe(dot, norme2(a.q), norme2(b.q), a.classe === b.classe);
  return { i, j, polarite, dot };
}

export function resonanceDe(membres: readonly Membre[]): LectureEnsemble {
  const paires: LecturePaire[] = [];
  let nConstructif = 0;
  let nDestructif = 0;
  let nNeutre = 0;
  let tenue = 0n;
  for (let i = 0; i < membres.length; i++) {
    for (let j = i + 1; j < membres.length; j++) {
      const p = paireDe(membres[i]!, membres[j]!, i, j);
      paires.push(p);
      const mag = p.dot < 0n ? -p.dot : p.dot;
      if (p.polarite === "constructif") {
        nConstructif += 1;
        tenue += mag;
      } else if (p.polarite === "destructif") {
        nDestructif += 1;
        tenue -= mag;
      } else nNeutre += 1;
    }
  }
  return { paires, nConstructif, nDestructif, nNeutre, tenue };
}
