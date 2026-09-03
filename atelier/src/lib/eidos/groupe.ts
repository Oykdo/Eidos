/**
 * Groupe SU(2) — chemins, orbites, parade.
 * L'état de combat est éphémère : on le jette. Rien n'est gravé.
 * Aucun flottant. Aucun objet nouveau.
 */

import {
  alignement,
  conjugue,
  norme2,
  produit,
  type Q,
} from "./cosmos.ts";

/** |Re p| / |p| = |Re q| / |q|  — même angle, même classe de conjugaison. */
export function memeOrbite(p: Q, q: Q): boolean {
  return p[0] * p[0] * norme2(q) === q[0] * q[0] * norme2(p);
}

/** Même rayon : p = λ q, λ > 0. */
export function memeRayon(p: Q, q: Q): boolean {
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (p[i]! * q[j]! !== p[j]! * q[i]!) return false;
    }
  }
  return alignement(p, q) > 0n;
}

export function cheminsEquivalents(a: Q, b: Q, c: Q, d: Q): boolean {
  return memeRayon(produit(a, b), produit(c, d));
}

export function produitChemin(qs: readonly Q[]): Q {
  if (qs.length === 0) return [1n, 0n, 0n, 0n];
  let acc = qs[0]!;
  for (let i = 1; i < qs.length; i++) acc = produit(acc, qs[i]!);
  return acc;
}

/** Le chemin appartient à l'orbite visée — pas une table de recettes. */
export function dansOrbite(chemin: readonly Q[], cible: Q): boolean {
  return memeOrbite(produitChemin(chemin), cible);
}

/** g q ḡ : même orbite que q. Le craft inverse est le conjugué. */
export function conjuguerPar(g: Q, q: Q): Q {
  return produit(produit(g, q), conjugue(g));
}

/**
 * |alignement| / (|etat| |ancre|) ≥ cosNum/cosDen.
 * Origine : cosNum = 0, ne décroche jamais.
 */
export function tientAxe(etat: Q, ancre: Q, cosNum: bigint, cosDen: bigint): boolean {
  const d = alignement(etat, ancre);
  return d * d * cosDen * cosDen >= cosNum * cosNum * norme2(etat) * norme2(ancre);
}

export const COS_SUPREME = 92n;
export const COS_ELITE = 87n;
export const COS_DEN = 100n;
