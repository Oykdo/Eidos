/**
 * Coffre horaire — un coffre par bloc, une pièce par claim (docs/SPEC_COFFRE_HORAIRE.md).
 * Port à l'octet de labo/coffre_horaire.py ; la parité tient par la famille `coffre`
 * de vecteurs.json (vecteurs.test.ts).
 *
 *   graine = SHA-256d("eidos-coffre/1" ‖ id_bloc(32) ‖ txid(32) ‖ rang(4))
 *   tier   = 1 + zéros de tête du premier octet ∈ 1..9   (1/2, 1/4 … 1/256, 1/256)
 *   objets = tier OBJETS RÉELS : h_j = SHA-256d(graine ‖ j(1)), puis objetDepuisGraine + habille,
 *            exactement comme un tirage de bloc (inventaire.ts). Âge par tier.
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
import { feuilleSortie, verifierPreuve, type PreuvePortable, type SortieMin } from "./merkle.ts";
import { objetDepuisGraine } from "./objets.ts";
import { habille } from "./equipement.ts";
import { verifierTeteReseau, type TeteReseau } from "./temoin.ts";
import type { Coffre, NomAge, ObjetPorte } from "./types.ts";

export const SPEC_COFFRE = "eidos-coffre/1";
export const TAG_COFFRE = utf8(SPEC_COFFRE);
export const TIERS = 9;
/** Les 27 places du sac (veillee-tour.SAC_PLACES) ; répété ici pour rester sans dépendance de jeu. */
export const SAC_COFFRE = 27;

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
] as const satisfies readonly NomAge[];

/** P(tier = t) : 2^−t pour t = 1..8, 2^−8 pour t = 9. Somme exactement 1. */
export const PROBA_TIER: readonly number[] = [
  ...Array.from({ length: 8 }, (_, i) => 2 ** -(i + 1)),
  2 ** -8,
];

export type CoffreTire = { graine: string; tier: number; objets: ObjetPorte[] };

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

export function coffreDe(
  idBlocHex: string,
  piece: Pick<SortieMin, "txid" | "rang">,
  hauteur = 0,
): CoffreTire {
  const g = graineCoffre(idBlocHex, piece);
  const tier = tierDe(g);
  const age = AGES_COFFRE[tier - 1]!;
  const objets: ObjetPorte[] = [];
  for (let j = 0; j < tier; j++) {
    const h = sha256d(concat(g, u8(j)));
    const o = objetDepuisGraine(h, age);
    objets.push(
      habille(
        {
          mot: o.mot,
          archetype: o.archetype,
          age: o.age,
          nonce: ((h[8]! << 8) | h[9]!) & 65535,
          hauteur,
        },
        h[10]!,
      ),
    );
  }
  return { graine: hexOf(g), tier, objets };
}

/** La clé d'un claim : une pièce, un bloc. */
export function cleClaim(idBlocHex: string, piece: Pick<SortieMin, "txid" | "rang">): string {
  return `${piece.txid}:${piece.rang}@${idBlocHex}`;
}

export type Reclame = { coffre: CoffreTire; pris: ObjetPorte[]; perdus: number };

/**
 * Réclamer : refuse si (pièce, bloc) a déjà servi, sinon remplit le sac et compte le surplus.
 * `sac` n'est pas modifié — l'appelant décide quoi en faire (l'extraction est ailleurs).
 */
export function reclamer(
  idBlocHex: string,
  piece: Pick<SortieMin, "txid" | "rang">,
  sacRempli: number,
  deja: ReadonlySet<string>,
  hauteur = 0,
): Reclame | { erreur: string } {
  const cle = cleClaim(idBlocHex, piece);
  if (deja.has(cle)) return { erreur: `coffre déjà réclamé pour cette pièce à ce bloc` };
  const coffre = coffreDe(idBlocHex, piece, hauteur);
  const place = Math.max(0, SAC_COFFRE - sacRempli);
  const pris = coffre.objets.slice(0, place);
  return { coffre, pris, perdus: coffre.objets.length - pris.length };
}

// ---------------------------------------------------------------------------
// Le juge : ce qui doit être vrai pour qu'un coffre soit réclamé.
// Rien de neuf — la tête par temoin.ts (XMSS), la pièce par merkle.ts, comme une ascension.

export type Claim = { tete: TeteReseau; piece: SortieMin; preuve: PreuvePortable };
export type VerdictClaim = { ok: true; idBloc: string; cle: string } | { ok: false; motif: string };

/**
 * Juge un claim, dans l'ordre où ça coûte le moins cher : déjà réclamé, puis la pièce contre la
 * racine, puis la signature de la tête. Le juge NE DIT PAS que la pièce est au joueur — cela se
 * prouve en la dépensant, comme pour une ascension (spec §6).
 */
export function jugerClaim(
  claim: Claim,
  federation: Parameters<typeof verifierTeteReseau>[1],
  deja: ReadonlySet<string>,
): VerdictClaim {
  const { tete, piece, preuve } = claim;
  const cle = cleClaim(tete.idBloc, piece);
  if (deja.has(cle)) return { ok: false, motif: "coffre déjà réclamé pour cette pièce à ce bloc" };
  if (preuve.racine !== tete.utxoRoot)
    return { ok: false, motif: "la preuve ne porte pas sur la racine de cette tête" };
  if (preuve.feuille !== hexOf(feuilleSortie(piece)))
    return { ok: false, motif: "la feuille n'est pas celle de cette pièce" };
  if (!verifierPreuve(preuve)) return { ok: false, motif: "chemin Merkle invalide" };
  const v = verifierTeteReseau(tete, federation);
  if (!v.ok) return { ok: false, motif: `tête refusée (${v.motif})` };
  return { ok: true, idBloc: tete.idBloc, cle };
}

export type Reclamation =
  | { ok: true; coffre: Coffre; pris: ObjetPorte[]; perdus: number; tier: number }
  | { ok: false; motif: string };

/**
 * Réclamer pour de vrai : juge le claim, puis pose les objets dans `coffre.objets` et la clé
 * dans `coffre.tour.coffres`. Le sac (27) borne la prise ; le surplus est perdu, comme une veillée.
 * Le coffre n'est pas modifié en cas de refus.
 */
export function reclamerDansCoffre(
  c: Coffre,
  claim: Claim,
  federation: Parameters<typeof verifierTeteReseau>[1],
): Reclamation {
  const deja = new Set(c.tour.coffres ?? []);
  const v = jugerClaim(claim, federation, deja);
  if (!v.ok) return { ok: false, motif: v.motif };
  const tire = coffreDe(v.idBloc, claim.piece, claim.tete.hauteur);
  const pris = tire.objets.slice(0, Math.max(0, SAC_COFFRE));
  return {
    ok: true,
    tier: tire.tier,
    pris,
    perdus: tire.objets.length - pris.length,
    coffre: {
      ...c,
      objets: [...c.objets, ...pris],
      tour: { ...c.tour, coffres: [...deja, v.cle] },
    },
  };
}
