/**
 * Pierres — les 64 signes chymiques, un par glyphe.
 *
 * Une pierre tourne déjà une pièce (T/S). Une gemme s'enchâsse déjà.
 * Craft et enchantement citant un signe précis : la règle n'est pas gelée.
 * Ce fichier est le catalogue. Pas de puissance, pas de recette.
 *
 * INTERDIT : dériver une graine ou une clé de ces signes (LOI_GLYPHES).
 */

import { CARACTERES, type Caractere } from "./chymie.ts";
import { codeDuGroupe } from "./glyphs.ts";
import { glypheDe } from "./lecture.ts";
import type { Objet } from "./objets.ts";
import type { SignatureId } from "./signatures.ts";
import type { NomAge } from "./types.ts";

export type Pierre = Caractere & { readonly code: number };

export const PIERRES: readonly Pierre[] = CARACTERES.map((c, code) => ({
  ...c,
  code,
})) as readonly Pierre[];

export function pierreDeCode(code: number): Pierre {
  return PIERRES[code & 63]!;
}

export function codePierre(o: {
  mot: number;
  archetype: string;
  age: NomAge;
}): number {
  const obj: Objet = {
    mot: o.mot >>> 0,
    archetype: o.archetype as SignatureId,
    age: o.age,
  };
  return codeDuGroupe(glypheDe(obj));
}

export function pierreDeObjet(o: {
  mot: number;
  archetype: string;
  age: NomAge;
}): Pierre {
  return pierreDeCode(codePierre(o));
}

export function nomPierre(
  o: { mot: number; archetype: string; age: NomAge },
  locale: "fr" | "en",
): string {
  const p = pierreDeObjet(o);
  return locale === "fr" ? p.fr : p.en;
}
