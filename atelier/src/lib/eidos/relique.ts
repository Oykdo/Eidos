/**
 * Reliques — une par âge, prix propre, progressif, abordable.
 *
 * Prix = émission de l'âge / 1 000 000 = a · T · époques / 1e6.
 * Même rapport 16 : 9 : 4 : 1. Kali ≈ 2,10 ; Satya ≈ 33,55.
 * Un robinet (1) n'y suffit pas : miner, puis acheter.
 */

import { ATOMES } from "./constantes.ts";
import { sha256, utf8 } from "./hash.ts";

export const B_SUR_A = 0.5;
export const T_EPOQUE = 1008;
/** Ancien diviseur 1 000 (dizaines de milliers). Trop haut pour l'essai. */
export const DIVISEUR_PRIX = 1_000_000;

export type NomAge = "Satya" | "Treta" | "Dvapara" | "Kali";

export type AgeRelique = {
  nom: NomAge;
  nomAffiche: string;
  a: number;
  epoques: number;
};

/** Aligné sur eonis.py / genesis.json. */
export const AGES_RELIQUE: AgeRelique[] = [
  { nom: "Satya", nomAffiche: "Satya", a: 40, epoques: 832 },
  { nom: "Treta", nomAffiche: "Trétâ", a: 30, epoques: 624 },
  { nom: "Dvapara", nomAffiche: "Dvâpara", a: 20, epoques: 416 },
  { nom: "Kali", nomAffiche: "Kali", a: 10, epoques: 208 },
];

export type Lumen = {
  age: AgeRelique;
  a: number;
  b: number;
  ratio: number;
  aire: number;
  /** Prix en eidôla. */
  prix: number;
  /** Prix en atomes — entier, pour le glouton. */
  prixAtomes: number;
  /** Récompense oscillante R(θ) = a + b·cos(θ). */
  recompense: (phase: number) => number;
};

export function prixRelique(age: AgeRelique): number {
  return (age.a * T_EPOQUE * age.epoques) / DIVISEUR_PRIX;
}

export function prixReliqueAtomes(age: AgeRelique): number {
  return age.a * T_EPOQUE * age.epoques * (ATOMES / DIVISEUR_PRIX);
}

export function formaterPrix(n: number): string {
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function lumenDe(age: AgeRelique): Lumen {
  const a = age.a;
  const b = a * B_SUR_A;
  return {
    age,
    a,
    b,
    ratio: B_SUR_A,
    aire: Math.PI * a * b,
    prix: prixRelique(age),
    prixAtomes: prixReliqueAtomes(age),
    recompense: (phase: number) => a + b * Math.cos(phase),
  };
}

export function lumens(): Lumen[] {
  return AGES_RELIQUE.map(lumenDe);
}

export function echelleRelique(l: Lumen): number {
  return l.a / AGES_RELIQUE[0]!.a;
}

/** Vérifie que chaque âge a un prix distinct et que la suite décroît. */
export function prixSontProgressifs(liste = lumens()): boolean {
  if (liste.length < 2) return false;
  const vus = new Set<number>();
  for (let i = 0; i < liste.length; i++) {
    const p = liste[i]!.prix;
    if (p <= 0 || vus.has(p)) return false;
    vus.add(p);
    if (i > 0 && p >= liste[i - 1]!.prix) return false;
  }
  return true;
}

export function estNomAge(s: string): s is NomAge {
  return s === "Satya" || s === "Treta" || s === "Dvapara" || s === "Kali";
}

/** Adresse de versement — hachage, pas une courbe. La relique n'est pas une UTXO. */
export function adresseRelique(nom: NomAge): Uint8Array {
  return sha256(utf8(`eidos-relique/1/${nom}`)).slice(0, 20);
}
