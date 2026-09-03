/**
 * Objets de coffre — spec v0.
 *
 * N'importe pas la genèse. N'invente pas de puissance.
 * Entiers uniquement dans l'invariant. Le flottant est de l'affichage.
 *
 * On-chain : une UTXO, une racine Merkle de 32 o. Une sig Lamport pour tout
 * le coffre, quel que soit le nombre d'objets. Les ~4 octets utiles tiennent
 * dans eidos.carnet. Une entrée Lamport coûte 24 Ko : ne pas signer objet par objet.
 *
 * Jauge (teinte, nom, position d'inventaire) : hors feuille, régénérable.
 *
 * INTERDIT :
 *  - dériver une graine, un nonce ou une clé de l'alphabet glyptique
 *  - modifier eonis, genesis, LOI_GLYPHES, les 9 codes du chœur
 *  - un flottant dans la feuille, la racine, le mot
 *  - multiplier la *puissance* par un palier d'émission ; le rang multiplie
 *    le nombre de tirages, jamais la norme
 *
 * mot u32 :
 *  bits 31-30  indice de la composante omise (0..3)
 *  bits 29-20  c0, 10 bits
 *  bits 19-10  c1, 10 bits
 *  bits  9- 0  c2, 10 bits
 *  512 = zéro. Signe : v − 512 ∈ [−512, 511].
 *  Canon : première composante stockée non nulle ≥ 512. q et −q : même mot.
 */

import { encoderGlyphes } from "./glyphs.ts";
import { concat, hexOf, sha256d, u32, utf8 } from "./hash.ts";
import { merkleRoot } from "./merkle.ts";
import type { NomAge } from "./relique.ts";
import { SIGNATURES, type SignatureId } from "./signatures.ts";

export const TAG_OBJET = utf8("eidos-objet/1");
export const TAG_TIRAGE = utf8("eidos-tirage/1");

/** ≈ 512√2. 10 bits signés couvrent [−1/√2, 1/√2]. */
export const Q_SCALE = 724;

export type Objet = {
  readonly mot: number;
  readonly archetype: SignatureId;
  readonly age: NomAge;
};

const AGES: readonly NomAge[] = ["Satya", "Treta", "Dvapara", "Kali"];

export function octetAge(age: NomAge): number {
  const i = AGES.indexOf(age);
  return i < 0 ? 0 : i;
}

export function ageDeOctet(n: number): NomAge {
  return AGES[n & 3] ?? "Satya";
}

export function rangArchetype(id: SignatureId): number {
  const i = SIGNATURES.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}

export function archetypeDeRang(n: number): SignatureId {
  return SIGNATURES[((n % 9) + 9) % 9]!.id;
}

function masque10(n: number): number {
  return n & 1023;
}

function packMot(omise: number, c0: number, c1: number, c2: number): number {
  const [a, b, c] = canon3(masque10(c0), masque10(c1), masque10(c2));
  return ((((omise & 3) << 30) | (a << 20) | (b << 10) | c) >>> 0);
}

function canon3(c0: number, c1: number, c2: number): [number, number, number] {
  const t = [c0, c1, c2];
  for (const x of t) {
    if (x !== 512) {
      if (x < 512) return [masque10(1024 - c0), masque10(1024 - c1), masque10(1024 - c2)];
      break;
    }
  }
  return [c0, c1, c2];
}

export function deconstruireMot(mot: number): {
  omise: number;
  c: [number, number, number];
} {
  const m = mot >>> 0;
  return {
    omise: (m >>> 30) & 3,
    c: [(m >>> 20) & 1023, (m >>> 10) & 1023, m & 1023],
  };
}

export function canoniserMot(mot: number): number {
  const { omise, c } = deconstruireMot(mot);
  return packMot(omise, c[0], c[1], c[2]);
}

/** Racine entière : floor(sqrt(n)), binaire, pas Math.sqrt. */
export function isqrt(n: bigint): bigint {
  if (n <= 0n) return 0n;
  let x0 = n;
  let x1 = (x0 + 1n) / 2n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + n / x0) / 2n;
  }
  return x0;
}

/**
 * Dépaquetage pour l'affichage / le craft. Pas une preuve.
 * q entier, |q|² ≈ Q_SCALE².
 */
export function depaqueter(mot: number): [number, number, number, number] {
  const { omise, c } = deconstruireMot(mot);
  const x = c[0]! - 512;
  const y = c[1]! - 512;
  const z = c[2]! - 512;
  const rest = BigInt(Q_SCALE * Q_SCALE - x * x - y * y - z * z);
  const w = Number(isqrt(rest < 0n ? 0n : rest));
  const q: [number, number, number, number] = [0, 0, 0, 0];
  let k = 0;
  for (let i = 0; i < 4; i++) {
    if (i === omise) q[i] = w;
    else q[i] = [x, y, z][k++]!;
  }
  return q;
}

export function paqueter(q: readonly [number, number, number, number]): number {
  let omise = 0;
  let best = -1;
  for (let i = 0; i < 4; i++) {
    const a = Math.abs(q[i]!);
    if (a > best) {
      best = a;
      omise = i;
    }
  }
  const stored: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === omise) continue;
    stored.push(Math.max(0, Math.min(1023, q[i]! + 512)));
  }
  return packMot(omise, stored[0]!, stored[1]!, stored[2]!);
}

/** q_A · q_B. Non commutatif. L'inverse est le conjugué (norme conservée). */
export function composer(a: number, b: number): number {
  const A = depaqueter(a);
  const B = depaqueter(b);
  const s = Q_SCALE;
  const w = (A[0] * B[0] - A[1] * B[1] - A[2] * B[2] - A[3] * B[3]) / s;
  const x = (A[0] * B[1] + A[1] * B[0] + A[2] * B[3] - A[3] * B[2]) / s;
  const y = (A[0] * B[2] - A[1] * B[3] + A[2] * B[0] + A[3] * B[1]) / s;
  const z = (A[0] * B[3] + A[1] * B[2] - A[2] * B[1] + A[3] * B[0]) / s;
  return paqueter([Math.trunc(w), Math.trunc(x), Math.trunc(y), Math.trunc(z)]);
}

export function conjuguer(mot: number): number {
  const q = depaqueter(mot);
  return paqueter([q[0], -q[1], -q[2], -q[3]]);
}

/** L1 des 3 composantes stockées. Même omise, sinon +1024. Pas un angle flottant. */
export function distanceMot(a: number, b: number): number {
  const A = deconstruireMot(a);
  const B = deconstruireMot(b);
  if (A.omise !== B.omise) return 1024;
  return (
    Math.abs(A.c[0] - B.c[0]) + Math.abs(A.c[1] - B.c[1]) + Math.abs(A.c[2] - B.c[2])
  );
}

export function feuilleObjet(o: Objet): Uint8Array {
  return sha256d(
    concat(
      TAG_OBJET,
      u32(canoniserMot(o.mot)),
      new Uint8Array([rangArchetype(o.archetype) & 255, octetAge(o.age)]),
    ),
  );
}

export function racineObjets(objets: readonly Objet[]): string {
  return hexOf(merkleRoot(objets.map((o) => feuilleObjet(o))));
}

/**
 * Sceau glyptique : encode la feuille. Unidirectionnel.
 * INTERDIT : en faire une KDF, une graine, une clé.
 */
export function sceauObjet(o: Objet): string {
  return encoderGlyphes(feuilleObjet(o));
}

/**
 * Tirage ouvert.
 * graine = SHA-256d( tag ‖ sig_lamport ‖ hash_bloc )
 * Le joueur ne choisit pas le bloc. Le validateur ne choisit pas la sig.
 * Hors ligne, signer plusieurs candidates et n'en diffuser qu'une reste possible
 * tant que le hash de bloc n'est pas fixé.
 */
export function graineTirage(sig: Uint8Array, hashBloc: Uint8Array): Uint8Array {
  return sha256d(concat(TAG_TIRAGE, sig, hashBloc));
}

export function objetDepuisGraine(graine: Uint8Array, age: NomAge): Objet {
  const u16 = (i: number) => (graine[i]! << 8) | graine[i + 1]!;
  const c0 = u16(0) >> 6;
  const c1 = u16(2) >> 6;
  const c2 = u16(4) >> 6;
  const omise = graine[6]! & 3;
  const mot = packMot(omise, c0, c1, c2);
  const archetype = archetypeDeRang(graine[7]! % 9);
  return { mot, archetype, age };
}

export function tirerObjet(sig: Uint8Array, hashBloc: Uint8Array, age: NomAge): Objet {
  return objetDepuisGraine(graineTirage(sig, hashBloc), age);
}

/** Le rang d'émission multiplie ceci, jamais la norme du mot. */
export function nombreTirages(poidsMille: number): number {
  if (poidsMille <= 0) return 1;
  return Math.max(1, Math.floor(poidsMille / 1000) || 1);
}
