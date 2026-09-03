/**
 * Reliques — cavités elliptiques d'époque.
 *
 * Ce n'est pas un 32ᵉ glyphe, pas de la biologie, pas une règle de consensus.
 * Le lumen d'un âge a pour axes a et b = a/2 (déjà dans R(h) = a + b·cos(…)).
 * L'aire π·a·b se mesure. Le ratio ne grandit pas : il est 1/2 pour les quatre âges.
 */

export const B_SUR_A = 0.5;

export type NomAge = "Satya" | "Treta" | "Dvapara" | "Kali";

export type AgeRelique = {
  nom: NomAge;
  nomAffiche: string;
  a: number;
  epoques: number;
};

/** Doit rester aligné sur eonis.ts / genesis.json. */
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
};

export function lumenDe(age: AgeRelique): Lumen {
  const a = age.a;
  const b = a * B_SUR_A;
  return {
    age,
    a,
    b,
    ratio: B_SUR_A,
    aire: Math.PI * a * b,
  };
}

export function lumens(): Lumen[] {
  return AGES_RELIQUE.map(lumenDe);
}

/** Échelle 3D : Satya = 1, les autres suivent a. */
export function echelleRelique(l: Lumen): number {
  return l.a / AGES_RELIQUE[0]!.a;
}
