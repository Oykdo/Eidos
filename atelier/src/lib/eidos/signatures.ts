/**
 * Signatures planétaires — lecture des 64 empilements.
 * Ce n'est pas un 5ᵉ glyphe, pas un 32ᵉ symbole, pas un secteur de l'arbre.
 * Neuf manières de tenir le temps, avec les quatre figures déjà là.
 */

import { FIGURES } from "./constantes.ts";
import { codeDuGroupe } from "./glyphs.ts";

export type SignatureId =
  "uranie" | "saturne" | "jupiter" | "mars" | "soleil" | "venus" | "mercure" | "lune" | "terre";

export type Signature = {
  id: SignatureId;
  astre: string;
  muse: string;
  etages: [number, number, number];
};

/** Descente d'Uranie (fixes) à Thalie (terre). 9 ≠ 33. */
export const SIGNATURES: readonly Signature[] = [
  { id: "uranie", astre: "★", muse: "Uranie", etages: [0, 0, 0] },
  { id: "saturne", astre: "♄", muse: "Polymnie", etages: [3, 0, 0] },
  { id: "jupiter", astre: "♃", muse: "Euterpe", etages: [1, 1, 0] },
  { id: "mars", astre: "♂", muse: "Érato", etages: [3, 3, 3] },
  { id: "soleil", astre: "☉", muse: "Melpomène", etages: [1, 1, 1] },
  { id: "venus", astre: "♀", muse: "Terpsichore", etages: [1, 3, 1] },
  { id: "mercure", astre: "☿", muse: "Calliope", etages: [1, 2, 3] },
  { id: "lune", astre: "☽", muse: "Clio", etages: [2, 2, 2] },
  { id: "terre", astre: "⊕", muse: "Thalie", etages: [0, 0, 3] },
];

/** Trois étages = tria prima. Pas trois signes nouveaux. */
export const TRIA_PRIMA = [
  { etage: 0, id: "sel", figure: 1 },
  { etage: 1, id: "mercure", figure: 2 },
  { etage: 2, id: "soufre", figure: 3 },
] as const;

export function figuresDe(s: Signature): string {
  return s.etages.map((k) => FIGURES[k]!).join("");
}

export function codeDe(s: Signature): number {
  return codeDuGroupe(s.etages);
}
