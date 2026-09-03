/**
 * Reliques — une par âge, prix propre, élevé, progressif.
 *
 * Prix = émission de l'âge / 1000 = a · T · époques / 1000.
 * Même rapport 16 : 9 : 4 : 1, trois zéros en moins.
 */

export const B_SUR_A = 0.5;
export const T_EPOQUE = 1008;

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
  /** Prix en eidôla — unique à cette relique. */
  prix: number;
  /** Récompense oscillante R(θ) = a + b·cos(θ). */
  recompense: (phase: number) => number;
};

export function prixRelique(age: AgeRelique): number {
  return (age.a * T_EPOQUE * age.epoques) / 1000;
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
