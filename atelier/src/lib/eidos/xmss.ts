/**
 * eidos.xmss — vérification d'une signature de validateur, port de
 * federation.verifier_mss. Aucune signature ici : l'atelier ne forge pas.
 *
 * sig = (indice, signature WOTS+, chemin). La feuille est reconstruite depuis
 * la signature (clé WOTS+ à l'adresse OTS `indice`, arbre L à l'adresse L
 * `indice`), puis remontée : le parent à la hauteur k+1, d'indice i, hache à
 * l'adresse d'arbre (hauteur k, indice i). Racine et graine publique sont la
 * clé publique du validateur (federation.json).
 */

import { equalBytes } from "./hash.ts";
import {
  OCTETS_SIG,
  TYPE_ARBRE,
  TYPE_LTREE,
  TYPE_OTS,
  adrs,
  arbreL,
  cleDepuisSignature,
  randHash,
} from "./wots.ts";

export type SignatureXmss = {
  indice: number;
  wots: Uint8Array;
  chemin: Uint8Array[];
};

export function verifierMss(
  racine: Uint8Array,
  grainePub: Uint8Array,
  hauteur: number,
  msg32: Uint8Array,
  sig: SignatureXmss,
): boolean {
  const { indice, wots, chemin } = sig;
  if (!Number.isInteger(indice) || indice < 0 || indice >= 2 ** hauteur) return false;
  if (chemin.length !== hauteur || wots.length !== OCTETS_SIG) return false;
  if (racine.length !== 32 || grainePub.length !== 32) return false;
  const pk = cleDepuisSignature(wots, grainePub, adrs(TYPE_OTS, { a: indice }), msg32);
  if (pk === null) return false;
  let n = arbreL(pk, grainePub, adrs(TYPE_LTREE, { a: indice }));
  let idx = indice;
  for (let k = 0; k < chemin.length; k++) {
    const frere = chemin[k]!;
    if (frere.length !== 32) return false;
    const parent = idx >> 1;
    const ad = adrs(TYPE_ARBRE, { b: k, c: parent });
    n = idx % 2 === 0 ? randHash(n, frere, grainePub, ad) : randHash(frere, n, grainePub, ad);
    idx = parent;
  }
  return equalBytes(n, racine);
}
