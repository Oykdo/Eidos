/**
 * Coffre horaire — un coffre par bloc, une pièce par claim (docs/SPEC_COFFRE_HORAIRE.md).
 * Port à l'octet de labo/coffre_horaire.py ; la parité tient par la famille `coffre`
 * de vecteurs.json (vecteurs.test.ts).
 *
 *   graine = SHA-256d("eidos-coffre/1" ‖ id_bloc(32) ‖ txid(32) ‖ rang(4))
 *   tier   = 1 + zéros de tête du premier octet ∈ 1..9   (1/2, 1/4 … 1/256, 1/256)
 *   objets = tier objets ; h_j = SHA-256d(graine ‖ j(1)) ; genre = GENRES_DON[h_j[0] mod 8] ;
 *            âge par tier ; nonce = h_j[1..4] gros-boutiste
 *
 * L'horloge est la tête signée, jamais l'horloge de la machine : un coffre existe parce
 * qu'un bloc existe. Une pièce ne réclame qu'un coffre par bloc (`dejaReclame`).
 *
 * Figures, pas preuves : rien ici n'engage le carnet. Ce module NE VÉRIFIE PAS le claim —
 * la tête se vérifie par `temoin.ts` (XMSS) et la pièce par `merkle.ts` (contre `utxoRoot`),
 * exactement comme une ascension (`ancrage.ts`). Le tirage seul vit ici.
 * LIMITE : une pièce neuve peut réclamer les blocs passés d'un coup ; seul le sac (27 places)
 * borne la rafale. Voir spec §5 — la fenêtre d'un jour est écrite, pas adoptée.
 */

import { concat, fromHex, hexOf, sha256d, u32, utf8 } from "./hash.ts";
import type { SortieMin } from "./merkle.ts";

export const SPEC_COFFRE = "eidos-coffre/1";
export const TAG_COFFRE = utf8(SPEC_COFFRE);
export const TIERS = 9;
/** Les 27 places du sac (veillee-tour.SAC_PLACES) ; répété ici pour rester sans dépendance de jeu. */
export const SAC_COFFRE = 27;

/** La même table que le don du pendule : élixir ×3, pierre ×2, gemme ×2, lair ×1. */
export const GENRES_COFFRE = [
  "elixir",
  "elixir",
  "pierre",
  "gemme",
  "lair",
  "elixir",
  "pierre",
  "gemme",
] as const;
export type GenreCoffre = (typeof GENRES_COFFRE)[number];

export const AGES_COFFRE = [
  "Kali",
  "Kali",
  "Kali",
  "Dvapara",
  "Dvapara",
  "Treta",
  "Treta",
  "Satya",
  "Satya",
] as const;
export type AgeCoffre = (typeof AGES_COFFRE)[number];

/** P(tier = t) : 2^−t pour t = 1..8, 2^−8 pour t = 9. Somme exactement 1. */
export const PROBA_TIER: readonly number[] = [
  ...Array.from({ length: 8 }, (_, i) => 2 ** -(i + 1)),
  2 ** -8,
];

export type ObjetCoffre = { genre: GenreCoffre; age: AgeCoffre; nonce: number };
export type Coffre = { graine: string; tier: number; objets: ObjetCoffre[] };

function u8(n: number): Uint8Array {
  return new Uint8Array([n & 255]);
}

export function graineCoffre(
  idBlocHex: string,
  piece: Pick<SortieMin, "txid" | "rang">,
): Uint8Array {
  return sha256d(
    concat(TAG_COFFRE, fromHex(idBlocHex), fromHex(piece.txid), u32(piece.rang >>> 0)),
  );
}

/** Zéros de tête du premier octet, +1 : 255 → 1, 0 → 9. */
export function tierDe(graine: Uint8Array): number {
  const b = graine[0]!;
  return 1 + (b === 0 ? 8 : 8 - (32 - Math.clz32(b)));
}

export function coffreDe(idBlocHex: string, piece: Pick<SortieMin, "txid" | "rang">): Coffre {
  const g = graineCoffre(idBlocHex, piece);
  const tier = tierDe(g);
  const objets: ObjetCoffre[] = [];
  for (let j = 0; j < tier; j++) {
    const h = sha256d(concat(g, u8(j)));
    objets.push({
      genre: GENRES_COFFRE[h[0]! % GENRES_COFFRE.length]!,
      age: AGES_COFFRE[tier - 1]!,
      nonce: ((h[1]! << 24) >>> 0) + (h[2]! << 16) + (h[3]! << 8) + h[4]!,
    });
  }
  return { graine: hexOf(g), tier, objets };
}

/** La clé d'un claim : une pièce, un bloc. */
export function cleClaim(idBlocHex: string, piece: Pick<SortieMin, "txid" | "rang">): string {
  return `${piece.txid}:${piece.rang}@${idBlocHex}`;
}

export type Reclame = { coffre: Coffre; pris: ObjetCoffre[]; perdus: number };

/**
 * Réclamer : refuse si (pièce, bloc) a déjà servi, sinon remplit le sac et compte le surplus.
 * `sac` n'est pas modifié — l'appelant décide quoi en faire (l'extraction est ailleurs).
 */
export function reclamer(
  idBlocHex: string,
  piece: Pick<SortieMin, "txid" | "rang">,
  sacRempli: number,
  deja: ReadonlySet<string>,
): Reclame | { erreur: string } {
  const cle = cleClaim(idBlocHex, piece);
  if (deja.has(cle)) return { erreur: `coffre déjà réclamé pour cette pièce à ce bloc` };
  const coffre = coffreDe(idBlocHex, piece);
  const place = Math.max(0, SAC_COFFRE - sacRempli);
  const pris = coffre.objets.slice(0, place);
  return { coffre, pris, perdus: coffre.objets.length - pris.length };
}
