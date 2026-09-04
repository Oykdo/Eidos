/**
 * Ancrage d'une ascension — ce qu'une armée de machines ne multiplie pas.
 *
 * Un run « libre » vit dans la jauge : il ne vaut rien à personne, un bot peut
 * en jouer mille. Un run qui **compte** (sceaux, portes, trophée d'ascension)
 * est ancré sur deux choses publiques et rares :
 *   - la tête signée du réseau (un bloc, une heure) ;
 *   - une pièce non dépensée à cette tête, prouvée contre la racine UTXO.
 * La graine du run en dérive : même bloc + même pièce ⇒ même run, quel que
 * soit le coffre, la machine ou le navigateur. Rejouer ne rapporte rien ;
 * multiplier les machines ne rapporte rien ; il faut multiplier les pièces,
 * et les pièces viennent de la chaîne — émission bornée, robinet budgété et
 * limité par auteur, reliques cachées dans le monde.
 *
 * L'ascension s'exporte et se juge sans rejouer la chaîne : tête vérifiée
 * (XMSS contre federation.json), pièce prouvée (Merkle contre utxo_root),
 * run recalculé depuis la graine et les choix, trace comparée. Ce qui n'est
 * PAS prouvé ici : que la pièce appartient au joueur. Cela se prouve en la
 * dépensant (une clé ne signe qu'une fois) — voir §« compter » de la spec.
 */

import { fromHex, hexOf, sha256d, u32, utf8, concat } from "./hash.ts";
import { feuilleSortie, preuveReseau, serialiser, verifierPreuve, type PreuvePortable, type SortieMin } from "./merkle.ts";
import { CHOIX, ETAPES, run, type Choix, type Etape } from "./pendule.ts";
import { verifierTeteReseau, type FederationPublique, type TemoinReseau, type TeteReseau } from "./temoin.ts";

export const SPEC_ASCENSION = "eidos-ascension/1";
export const TAG_ANCRAGE = utf8(SPEC_ASCENSION);

/** Graine d'un run ancré : le bloc et la pièce, rien du coffre. */
export function graineAncree(idBlocHex: string, piece: Pick<SortieMin, "txid" | "rang">): Uint8Array {
  return sha256d(concat(TAG_ANCRAGE, fromHex(idBlocHex), fromHex(piece.txid), u32(piece.rang)));
}

/** Empreinte d'un parcours : ce que l'on compare, pas ce que l'on croit. */
export function traceDe(etapes: readonly Etape[]): string {
  return hexOf(sha256d(utf8(etapes.map((x) => `${x.p}:${x.e}:${x.s.x}:${x.s.y}`).join(" "))));
}

export type Ascension = {
  v: 1;
  spec: typeof SPEC_ASCENSION;
  tete: TeteReseau;
  piece: SortieMin;
  preuve: PreuvePortable;
  choix: Choix[];
  mots: number[];
  trace: string;
};

/** Fabrique une ascension ancrée sur la tête suivie et une pièce publiée. */
export function fabriquerAscension(
  reseau: TemoinReseau,
  ref: string,
  choix: readonly Choix[],
  mots: readonly number[],
): Ascension | { erreur: string } {
  if (!reseau.verdict.ok) return { erreur: "tête du réseau non vérifiée" };
  if (choix.length !== ETAPES - 1 || mots.length !== ETAPES - 1) return { erreur: `${ETAPES - 1} choix et ${ETAPES - 1} objets portés attendus` };
  const piece = reseau.sorties.find((s) => `${s.txid}:${s.rang}` === ref);
  if (!piece) return { erreur: "pièce absente de l'état publié à cette tête" };
  const p = preuveReseau(reseau.sorties, ref);
  if (!p || p.racine !== reseau.tete.utxoRoot) return { erreur: "preuve introuvable ou étrangère à la tête" };
  const graine = graineAncree(reseau.tete.idBloc, piece);
  const etapes = run(graine, (i) => choix[i]!, (i) => mots[i]!);
  return {
    v: 1,
    spec: SPEC_ASCENSION,
    tete: reseau.tete,
    piece: { txid: piece.txid, rang: piece.rang, adresse: piece.adresse, montant: piece.montant },
    preuve: serialiser(p),
    choix: [...choix],
    mots: [...mots],
    trace: traceDe(etapes),
  };
}

export type VerdictAscension = { ok: true; etapes: Etape[]; hauteur: number } | { ok: false; motif: string };

/** Juge sans rejouer la chaîne : tête, pièce, puis le run recalculé. */
export function jugerAscension(a: Ascension, fed: FederationPublique): VerdictAscension {
  if (a.v !== 1 || a.spec !== SPEC_ASCENSION) return { ok: false, motif: "pas une ascension eidos-ascension/1" };
  const v = verifierTeteReseau(a.tete, fed);
  if (!v.ok) return { ok: false, motif: `tête refusée (${v.motif})` };
  if (hexOf(feuilleSortie(a.piece)) !== a.preuve.feuille) return { ok: false, motif: "la feuille ne correspond pas à la pièce" };
  if (!verifierPreuve(a.preuve)) return { ok: false, motif: "chemin rompu" };
  if (a.preuve.racine !== a.tete.utxoRoot) return { ok: false, motif: "pièce étrangère à la tête" };
  if (a.choix.length !== ETAPES - 1 || a.mots.length !== ETAPES - 1) return { ok: false, motif: "choix ou objets portés incomplets" };
  if (!a.choix.every((c) => (CHOIX as readonly string[]).includes(c))) return { ok: false, motif: "choix inconnu" };
  if (!a.mots.every((m) => Number.isInteger(m) && m >= 0 && m <= 0xffff_ffff)) return { ok: false, motif: "objet porté hors du mot" };
  const etapes = run(graineAncree(a.tete.idBloc, a.piece), (i) => a.choix[i]!, (i) => a.mots[i]!);
  if (traceDe(etapes) !== a.trace) return { ok: false, motif: "trace différente : le parcours déclaré n'est pas celui de la graine" };
  return { ok: true, etapes, hauteur: a.tete.hauteur };
}

export function serialiserAscension(a: Ascension): string {
  return JSON.stringify(a);
}

const HEX32 = /^[0-9a-f]{64}$/;

export function parserAscension(raw: string): Ascension | { erreur: string } {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { erreur: "JSON invalide" };
  }
  if (!o || o.v !== 1 || o.spec !== SPEC_ASCENSION) return { erreur: "pas une ascension eidos-ascension/1" };
  const t = o.tete as Record<string, unknown> | undefined;
  if (!t || typeof t.idBloc !== "string" || !HEX32.test(t.idBloc) || typeof t.utxoRoot !== "string" || !Array.isArray(t.chemin)) {
    return { erreur: "tête mal formée" };
  }
  const p = o.piece as Record<string, unknown> | undefined;
  if (!p || typeof p.txid !== "string" || !HEX32.test(p.txid) || typeof p.rang !== "number" || typeof p.adresse !== "string" || typeof p.montant !== "number") {
    return { erreur: "pièce mal formée" };
  }
  const pr = o.preuve as Record<string, unknown> | undefined;
  if (!pr || pr.v !== 1 || typeof pr.feuille !== "string" || typeof pr.racine !== "string" || !Array.isArray(pr.freres)) {
    return { erreur: "preuve mal formée" };
  }
  if (!Array.isArray(o.choix) || !Array.isArray(o.mots) || typeof o.trace !== "string" || !HEX32.test(o.trace)) {
    return { erreur: "choix, objets ou trace absents" };
  }
  return o as unknown as Ascension;
}
