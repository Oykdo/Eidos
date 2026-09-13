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
 * qu'un bloc existe. Une pièce ne réclame qu'un coffre par bloc (`tour.coffres`), et le
 * prend ENTIER : les t objets entrent dans `coffre.objets`, rien n'est perdu, aucun sac ne
 * borne un claim (décision A15, docs/FEUILLE_DE_ROUTE.md §3). L'ouverture rendue au joueur
 * (`Ouverture`) porte exactement ce que le juge a accepté — ni plus, ni moins.
 *
 * Figures, pas preuves : rien ici n'engage le carnet. Le tirage seul vit ici ; le juge
 * (`jugerClaim`) n'invente rien — la tête se vérifie par `temoin.ts` (XMSS) et la pièce par
 * `merkle.ts` (contre `utxoRoot`), exactement comme une ascension (`ancrage.ts`).
 * LIMITE : une pièce neuve peut réclamer tous les blocs passés qu'elle sait prouver ; rien ne
 * le borne hors « une pièce, un bloc ». La page n'offre que la tête suivie, et c'est une
 * politique d'interface, pas une règle. Voir spec §5.
 */

import { concat, fromHex, hexOf, sha256d, u32, utf8 } from "./hash.ts";
import { feuilleSortie, verifierPreuve, type PreuvePortable, type SortieMin } from "./merkle.ts";
import { objetDepuisGraine } from "./objets.ts";
import { habille } from "./equipement.ts";
import { SIGNATURES, type Signature } from "./signatures.ts";
import { verifierTeteReseau, type TeteReseau } from "./temoin.ts";
import type { Coffre, NomAge, ObjetPorte } from "./types.ts";

export const SPEC_COFFRE = "eidos-coffre/1";
export const TAG_COFFRE = utf8(SPEC_COFFRE);
export const TIERS = 9;

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

/**
 * La muse d'un tier — une lecture (spec §3) : neuf tiers pour neuf muses, du plus commun
 * (1, Thalie, ⊕) au plus rare (9, Uranie, ★). SIGNATURES va d'Uranie (0) à Thalie (8),
 * donc le tier t lit SIGNATURES[9 − t]. Rien de plus : le tier ne change ni le mot ni les axes.
 */
export function museDuTier(tier: number): Signature {
  if (!Number.isInteger(tier) || tier < 1 || tier > TIERS)
    throw new Error(`tier ${tier} hors 1..${TIERS}`);
  return SIGNATURES[TIERS - tier]!;
}

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

/**
 * L'ouverture : ce qu'un claim accepté rend au joueur, et rien d'autre. Jamais persistée —
 * elle vit le temps d'être montrée ; les objets, eux, sont déjà dans `coffre.objets`.
 */
export type Ouverture = {
  cle: string;
  idBloc: string;
  hauteur: number;
  graine: string;
  tier: number;
  objets: ObjetPorte[];
};

export type Reclamation =
  | { ok: true; coffre: Coffre; ouverture: Ouverture }
  | { ok: false; motif: string };

/** Deux objets portés sont le même s'ils ont même mot, même hauteur et même teinte. */
export function memeObjet(a: ObjetPorte, b: ObjetPorte): boolean {
  return a.mot === b.mot && a.hauteur === b.hauteur && a.nonce === b.nonce;
}

/**
 * Réclamer pour de vrai : juge le claim, puis pose les t objets dans `coffre.objets` et la clé
 * dans `coffre.tour.coffres`. Le coffre est pris entier ; il n'est pas modifié en cas de refus.
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
  return {
    ok: true,
    coffre: {
      ...c,
      objets: [...c.objets, ...tire.objets],
      tour: { ...c.tour, coffres: [...deja, v.cle] },
    },
    ouverture: {
      cle: v.cle,
      idBloc: v.idBloc,
      hauteur: claim.tete.hauteur,
      graine: tire.graine,
      tier: tire.tier,
      objets: tire.objets,
    },
  };
}
