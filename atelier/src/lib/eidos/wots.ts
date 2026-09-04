/**
 * eidos.wots — WOTS+ et arbre L, port de wots.py, octet pour octet.
 *
 * n = 32, w = 16, len = 67 (RFC 8391). SHA-256 seulement, chaque maillon
 * tweaké par une graine publique et une adresse de hachage ADRS (32 o) :
 *   F(K, M)   = SHA-256(toByte(0, 32) ‖ K ‖ M)
 *   H(K, M)   = SHA-256(toByte(1, 32) ‖ K ‖ M)
 *   PRF(K, M) = SHA-256(toByte(3, 32) ‖ K ‖ M)
 *
 * Clé à usage unique dérivée d'une graine de 32 octets :
 *   graine_pub = SHA-256(graine ‖ "pub")
 *   sk_i       = PRF(graine, ADRS(chaîne = i))
 *   pk_i       = chaîne(sk_i, 0, 15)
 *   racine     = arbre L des 67 pk_i
 *   adresse    = SHA-256(graine_pub ‖ racine)[:20]
 *   empreinte  = SHA-256(graine_pub ‖ racine)
 *
 * Le vérificateur reconstruit la clé publique depuis la signature : le témoin
 * ne porte que graine_pub (32 o) et la signature (2 144 o). Une clé ne signe
 * QU'UNE FOIS — la règle vit dans le carnet, pas ici.
 */

import { concat, equalBytes, sha256, u32, utf8 } from "./hash.ts";

export const N = 32;
export const W = 16;
export const LEN1 = 64;
export const LEN2 = 3;
export const LEN = LEN1 + LEN2;
export const OCTETS_SIG = LEN * N; // 2 144
export const OCTETS_GRAINE = 32;
export const OCTETS_TEMOIN = OCTETS_GRAINE + OCTETS_SIG; // 2 176

export const TYPE_OTS = 0;
export const TYPE_LTREE = 1;
export const TYPE_ARBRE = 2;

const PAD_F = new Uint8Array(32);
const PAD_H = new Uint8Array(32);
PAD_H[31] = 1;
const PAD_PRF = new Uint8Array(32);
PAD_PRF[31] = 3;
const PUB = utf8("pub");

export type Temoin = { grainePub: Uint8Array; sig: Uint8Array };

/** layer(4) tree(8) type(4) a(4) b(4) c(4) keyAndMask(4). */
export function adrs(
  type: number,
  champs: { couche?: number; arbre?: number; a?: number; b?: number; c?: number; masque?: number } = {},
): Uint8Array {
  const ad = new Uint8Array(32);
  ad.set(u32(champs.couche ?? 0), 0);
  ad.set(u32(champs.arbre ?? 0), 8); // 8 octets, poids fort nul
  ad.set(u32(type), 12);
  ad.set(u32(champs.a ?? 0), 16);
  ad.set(u32(champs.b ?? 0), 20);
  ad.set(u32(champs.c ?? 0), 24);
  ad.set(u32(champs.masque ?? 0), 28);
  return ad;
}

function avec(ad: Uint8Array, offset: number, valeur: number): Uint8Array {
  const o = new Uint8Array(ad);
  o.set(u32(valeur), offset);
  return o;
}

function F(cle: Uint8Array, m: Uint8Array): Uint8Array {
  return sha256(concat(PAD_F, cle, m));
}
function H(cle: Uint8Array, m: Uint8Array): Uint8Array {
  return sha256(concat(PAD_H, cle, m));
}
function PRF(cle: Uint8Array, m: Uint8Array): Uint8Array {
  return sha256(concat(PAD_PRF, cle, m));
}

function xor(a: Uint8Array, b: Uint8Array): Uint8Array {
  const o = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) o[i] = a[i]! ^ b[i]!;
  return o;
}

/** Applique F de `depart` à `depart + pas − 1`, clé et masque dérivés de
 *  (graine publique, ADRS) à chaque maillon. `ad` porte déjà la chaîne. */
export function chaine(
  x: Uint8Array,
  depart: number,
  pas: number,
  grainePub: Uint8Array,
  ad: Uint8Array,
): Uint8Array {
  let v = x;
  for (let j = depart; j < depart + pas; j++) {
    const adJ = avec(avec(ad, 24, j), 28, 0);
    const cle = PRF(grainePub, adJ);
    const bm = PRF(grainePub, avec(adJ, 28, 1));
    v = F(cle, xor(v, bm));
  }
  return v;
}

export function randHash(
  gauche: Uint8Array,
  droite: Uint8Array,
  grainePub: Uint8Array,
  ad: Uint8Array,
): Uint8Array {
  const cle = PRF(grainePub, avec(ad, 28, 0));
  const bm0 = PRF(grainePub, avec(ad, 28, 1));
  const bm1 = PRF(grainePub, avec(ad, 28, 2));
  return H(cle, concat(xor(gauche, bm0), xor(droite, bm1)));
}

/** 64 quartets puis 3 chiffres de somme de contrôle (Σ(15 − m) << 4). */
export function baseW(msg32: Uint8Array): number[] {
  const chiffres: number[] = [];
  for (const o of msg32) {
    chiffres.push(o >> 4, o & 15);
  }
  let csum = 0;
  for (const m of chiffres) csum += W - 1 - m;
  csum <<= 4;
  const c0 = (csum >> 8) & 255;
  const c1 = csum & 255;
  chiffres.push(c0 >> 4, c0 & 15, c1 >> 4);
  return chiffres;
}

export function grainePublique(graine: Uint8Array): Uint8Array {
  return sha256(concat(graine, PUB));
}

function adChaine(adOts: Uint8Array, i: number): Uint8Array {
  const ad = new Uint8Array(32);
  ad.set(adOts.subarray(0, 20), 0);
  ad.set(u32(i), 20);
  return ad;
}

function sk(graine: Uint8Array, adOts: Uint8Array, i: number): Uint8Array {
  return PRF(graine, adChaine(adOts, i));
}

export function clePublique(graine: Uint8Array, grainePub: Uint8Array, adOts: Uint8Array): Uint8Array[] {
  const pk: Uint8Array[] = [];
  for (let i = 0; i < LEN; i++) {
    pk.push(chaine(sk(graine, adOts, i), 0, W - 1, grainePub, adChaine(adOts, i)));
  }
  return pk;
}

export function signerWots(
  graine: Uint8Array,
  grainePub: Uint8Array,
  adOts: Uint8Array,
  msg32: Uint8Array,
): Uint8Array {
  if (msg32.length !== N) throw new Error("message de 32 octets attendu");
  const chiffres = baseW(msg32);
  const sig = new Uint8Array(OCTETS_SIG);
  for (let i = 0; i < LEN; i++) {
    sig.set(chaine(sk(graine, adOts, i), 0, chiffres[i]!, grainePub, adChaine(adOts, i)), i * N);
  }
  return sig;
}

/** Termine les chaînes : la clé publique que cette signature implique. */
export function cleDepuisSignature(
  sig: Uint8Array,
  grainePub: Uint8Array,
  adOts: Uint8Array,
  msg32: Uint8Array,
): Uint8Array[] | null {
  if (sig.length !== OCTETS_SIG || msg32.length !== N) return null;
  const chiffres = baseW(msg32);
  const pk: Uint8Array[] = [];
  for (let i = 0; i < LEN; i++) {
    const m = chiffres[i]!;
    pk.push(chaine(sig.subarray(i * N, (i + 1) * N), m, W - 1 - m, grainePub, adChaine(adOts, i)));
  }
  return pk;
}

export function arbreL(pk: Uint8Array[], grainePub: Uint8Array, adL: Uint8Array): Uint8Array {
  let noeuds = pk.slice();
  let hauteur = 0;
  while (noeuds.length > 1) {
    const suivant: Uint8Array[] = [];
    for (let i = 0; i < Math.floor(noeuds.length / 2); i++) {
      const ad = new Uint8Array(32);
      ad.set(adL.subarray(0, 20), 0);
      ad.set(u32(hauteur), 20);
      ad.set(u32(i), 24);
      suivant.push(randHash(noeuds[2 * i]!, noeuds[2 * i + 1]!, grainePub, ad));
    }
    if (noeuds.length % 2 === 1) suivant.push(noeuds[noeuds.length - 1]!);
    noeuds = suivant;
    hauteur += 1;
  }
  return noeuds[0]!;
}

// ---------------------------------------------------------------------------
// Clé à usage unique d'une transaction (ADRS OTS 0, arbre L 0)
// ---------------------------------------------------------------------------
export const AD_OTS_TX = adrs(TYPE_OTS);
export const AD_L_TX = adrs(TYPE_LTREE);

export function racine(graine: Uint8Array): { grainePub: Uint8Array; racine: Uint8Array } {
  const grainePub = grainePublique(graine);
  return { grainePub, racine: arbreL(clePublique(graine, grainePub, AD_OTS_TX), grainePub, AD_L_TX) };
}

export function adresse(grainePub: Uint8Array, racineL: Uint8Array): Uint8Array {
  return sha256(concat(grainePub, racineL)).subarray(0, 20);
}

export function empreinte(grainePub: Uint8Array, racineL: Uint8Array): Uint8Array {
  return sha256(concat(grainePub, racineL));
}

export function adresseDeGraine(graine: Uint8Array): Uint8Array {
  const r = racine(graine);
  return adresse(r.grainePub, r.racine);
}

export function empreinteDeGraine(graine: Uint8Array): Uint8Array {
  const r = racine(graine);
  return empreinte(r.grainePub, r.racine);
}

export function signer(graine: Uint8Array, msg32: Uint8Array): Temoin {
  const grainePub = grainePublique(graine);
  return { grainePub, sig: signerWots(graine, grainePub, AD_OTS_TX, msg32) };
}

export function racineDepuisTemoin(temoin: Temoin, msg32: Uint8Array): Uint8Array | null {
  if (temoin.grainePub.length !== OCTETS_GRAINE) return null;
  const pk = cleDepuisSignature(temoin.sig, temoin.grainePub, AD_OTS_TX, msg32);
  if (pk === null) return null;
  return arbreL(pk, temoin.grainePub, AD_L_TX);
}

export function verifier(adresse20: Uint8Array, msg32: Uint8Array, temoin: Temoin): boolean {
  const r = racineDepuisTemoin(temoin, msg32);
  return r !== null && equalBytes(adresse(temoin.grainePub, r), adresse20);
}
