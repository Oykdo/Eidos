/**
 * Lignée d'un objet — comment une chose change de mains sans que la chaîne
 * sache qu'elle existe.
 *
 * Un objet d'Eidos n'est pas un enregistrement, c'est une **dérivation** :
 * `objetDepuisGraine` le recalcule d'une graine publique. Le carnet ne porte
 * donc nulle part « cet objet est à Untel », et la possession est locale —
 * ce qui suffit tant qu'on joue seul, et ne suffit plus dès qu'on échange.
 *
 * La règle, tirée de `docs/ETUDE_ECHANGE_OBJETS.md` §7.1, option (d) :
 * **un objet est tenu par une sortie, et changer de mains c'est dépenser
 * cette sortie vers une autre.**
 *
 *     origine    = sha256d(TAG ‖ id_bloc(32) ‖ txid(32) ‖ rang(4) ‖ j(1))
 *     maillon_0  = origine
 *     maillon_k  = sha256d(TAG ‖ maillon_{k−1} ‖ txid_k(32) ‖ rang_k(4))
 *
 * où `txid_k` est **la transaction qui dépense la sortie du maillon k−1**.
 * C'est cette dernière clause qui ferme le trou, et elle vaut d'être dite
 * lentement : la duplication échouerait parce que deux lignées valides issues
 * de la même origine exigeraient de **dépenser deux fois la même sortie**. Le
 * nœud l'interdit déjà — c'est la double dépense, pas une règle nouvelle. Une
 * lignée bifurque donc exactement là où la chaîne bifurquerait : nulle part.
 *
 * **Plusieurs objets dans une transaction.** Rien n'oblige un échange à ne
 * porter qu'une chose : les maillons de plusieurs objets peuvent citer le
 * même `txid_k` avec des `rang_k` différents. Une sortie coûte 28 octets,
 * un témoin WOTS+ en coûte 2 177 — donner N objets tient donc dans **un
 * créneau et 28·N octets**, la même arithmétique que le groupement du
 * robinet (`noeud.py`, `construire_paiements`).
 *
 * **Ce que ce module ne fait pas, et c'est voulu.** Il ne parle pas au réseau
 * et ne vérifie aucune tête : les deux questions qui exigent la chaîne —
 * « cette transaction est-elle dans un bloc ? » et « cette sortie est-elle
 * encore vive ? » — sont **passées en paramètres**. Le juge reste ainsi une
 * fonction pure, rejouable, testable sans réseau, et l'appelant reste maître
 * de ce qu'il a vérifié. C'est le même partage que `bataille.ts` et `ia.ts`.
 *
 * LIMITE : **l'export grandit avec les échanges.** Un objet à N échanges
 * porte N corps de transaction et N preuves d'inclusion. La borne sur N —
 * plafond, point de reprise signé, ou rien — n'est pas tranchée
 * (`ETUDE_ECHANGE_OBJETS.md` §7.2), et ce module ne la tranche pas : il
 * mesure le coût (`octetsLignee`) pour que la décision se prenne sur un
 * chiffre.
 *
 * LIMITE : **aucune atomicité.** La lignée prouve le transfert, jamais le
 * troc. Rien ne garantit qu'un vendeur soit payé ; l'accord reste hors chaîne.
 *
 * LIMITE : **on peut brûler un objet sans le vouloir.** Si le tenant dépense
 * la sortie sans qu'aucun maillon ne prenne la suite, l'objet est perdu. C'est
 * assumé : c'est exactement ce qui empêche de le dupliquer.
 */

import { concat, fromHex, hexOf, sha256d, u32, utf8 } from "./hash.ts";

export const SPEC_OBJET = "eidos-objet/1";
export const TAG_OBJET = utf8(SPEC_OBJET);

/** `VERSION(4) n_in(2) [txid(32) vout(4)]* n_out(2) [addr(20) atomes(8)]*` */
export const OCTETS_ENTREE = 32 + 4;
export const OCTETS_SORTIE = 20 + 8;

/**
 * D'où vient un objet : le coffre horaire qu'on a réclamé. Le triplet
 * (bloc, pièce, rang) est déjà unique par construction — `jugerClaim` refuse
 * qu'un même coffre soit réclamé deux fois — et `j` distingue les objets
 * d'un même coffre.
 */
export type Origine = {
  readonly idBloc: string;
  readonly txid: string;
  readonly rang: number;
  readonly j: number;
};

/**
 * Un changement de mains. `core` est le corps canonique de la transaction qui
 * prend la suite : le porter prouve à la fois son `txid` (qui en est le
 * `sha256d`) et **ce qu'elle dépense**, sans rien demander au réseau.
 */
export type Maillon = {
  readonly core: string;
  readonly rang: number;
};

export type Lignee = {
  readonly origine: Origine;
  readonly maillons: readonly Maillon[];
};

/** Une sortie, telle que la lignée la désigne. */
export type Tenue = { readonly txid: string; readonly rang: number };

export class RejetLignee extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejetLignee";
  }
}

function exigerHex(s: string, octets: number, quoi: string): Uint8Array {
  if (typeof s !== "string" || s.length !== octets * 2 || !/^[0-9a-f]*$/.test(s))
    throw new RejetLignee(`${quoi} : ${s?.length ?? 0} caractères au lieu de ${octets * 2} hexadécimaux`);
  return fromHex(s);
}

function exigerRang(n: number, quoi: string): void {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff)
    throw new RejetLignee(`${quoi} ${n} au lieu d'un rang de 0 à 65535`);
}

/** Le maillon zéro : l'objet tel qu'il est né du coffre réclamé. */
export function origineDe(o: Origine): string {
  const bloc = exigerHex(o.idBloc, 32, "id de bloc");
  const txid = exigerHex(o.txid, 32, "txid d'origine");
  exigerRang(o.rang, "rang d'origine");
  if (!Number.isInteger(o.j) || o.j < 0 || o.j > 255)
    throw new RejetLignee(`rang dans le coffre ${o.j} au lieu de 0 à 255`);
  return hexOf(sha256d(concat(TAG_OBJET, bloc, txid, u32(o.rang), new Uint8Array([o.j]))));
}

/** Le maillon suivant. `txid` doit être celui qui dépense la sortie tenue. */
export function maillonSuivant(precedent: string, txid: string, rang: number): string {
  const p = exigerHex(precedent, 32, "maillon précédent");
  const t = exigerHex(txid, 32, "txid du maillon");
  exigerRang(rang, "rang du maillon");
  return hexOf(sha256d(concat(TAG_OBJET, p, t, u32(rang))));
}

/**
 * Le corps d'une transaction, relu. On n'en garde que ce que le juge
 * interroge : ce qu'elle dépense, et combien de sorties elle porte.
 */
export type CoreLu = {
  readonly txid: string;
  readonly entrees: readonly Tenue[];
  readonly nSorties: number;
};

/** Relit un corps sérialisé. Refuse tout ce qui ne se relit pas à l'octet. */
export function lireCore(hex: string): CoreLu {
  if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-f]*$/.test(hex))
    throw new RejetLignee("corps de transaction : hexadécimal attendu");
  const b = fromHex(hex);
  const vue = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 0;
  const lire16 = (): number => {
    if (i + 2 > b.length) throw new RejetLignee("corps tronqué");
    const v = vue.getUint16(i);
    i += 2;
    return v;
  };
  if (b.length < 8) throw new RejetLignee("corps tronqué");
  i = 4; // VERSION(4) : le juge ne s'en sert pas, `serTx` la contrôle déjà
  const nIn = lire16();
  const entrees: Tenue[] = [];
  for (let k = 0; k < nIn; k++) {
    if (i + OCTETS_ENTREE > b.length) throw new RejetLignee("corps tronqué dans les entrées");
    entrees.push({ txid: hexOf(b.slice(i, i + 32)), rang: vue.getUint32(i + 32) });
    i += OCTETS_ENTREE;
  }
  const nSorties = lire16();
  if (i + nSorties * OCTETS_SORTIE !== b.length)
    throw new RejetLignee(
      `corps de ${b.length} octets au lieu de ${i + nSorties * OCTETS_SORTIE} annoncés`,
    );
  return { txid: hexOf(sha256d(b)), entrees, nSorties };
}

/**
 * Tous les maillons d'une lignée, du zéro au dernier. Une **lecture** : elle
 * ne vérifie ni les dépenses ni la chaîne, seulement l'arithmétique.
 */
export function maillonsDe(l: Lignee): string[] {
  const out = [origineDe(l.origine)];
  let tenu: Tenue = { txid: l.origine.txid, rang: l.origine.rang };
  for (const m of l.maillons) {
    const lu = lireCore(m.core);
    out.push(maillonSuivant(out[out.length - 1]!, lu.txid, m.rang));
    tenu = { txid: lu.txid, rang: m.rang };
  }
  void tenu;
  return out;
}

/** La sortie qui tient l'objet aujourd'hui — celle qu'il faudra dépenser. */
export function tenueDe(l: Lignee): Tenue {
  const dernier = l.maillons[l.maillons.length - 1];
  if (dernier === undefined) return { txid: l.origine.txid, rang: l.origine.rang };
  return { txid: lireCore(dernier.core).txid, rang: dernier.rang };
}

/** Le maillon courant : l'identité de l'objet après tous ses échanges. */
export function maillonCourant(l: Lignee): string {
  const tous = maillonsDe(l);
  return tous[tous.length - 1]!;
}

/**
 * Ce que pèse une lignée, en octets de corps. C'est ce qui grandit avec les
 * échanges, et ce sur quoi la borne sur N devra se décider.
 */
export function octetsLignee(l: Lignee): number {
  return l.maillons.reduce((n, m) => n + m.core.length / 2, 0);
}

export type VerdictLignee =
  | { readonly ok: true; readonly maillon: string; readonly tenue: Tenue; readonly echanges: number }
  | { readonly ok: false; readonly motif: string };

/**
 * Ce que l'appelant doit avoir vérifié contre la chaîne, et que ce module
 * refuse de deviner :
 *   `inclus`      — ce txid est dans un bloc dont j'ai vérifié la tête ;
 *   `nonDepensee` — cette sortie est vive à la tête que je présente.
 */
export type Regard = {
  readonly inclus: (txid: string) => boolean;
  readonly nonDepensee: (t: Tenue) => boolean;
};

/**
 * Juge une lignée, dans l'ordre où ça coûte le moins cher : l'arithmétique
 * d'abord, la chaîne ensuite.
 *
 * Le juge NE DIT PAS que l'objet est au porteur — cela se prouve en dépensant
 * la sortie, exactement comme `jugerClaim` ne dit pas à qui est la pièce.
 */
export function jugerLignee(l: Lignee, regard: Regard): VerdictLignee {
  let maillon: string;
  try {
    maillon = origineDe(l.origine);
  } catch (e) {
    return { ok: false, motif: e instanceof Error ? e.message : "origine illisible" };
  }
  let tenue: Tenue = { txid: l.origine.txid, rang: l.origine.rang };

  for (let k = 0; k < l.maillons.length; k++) {
    const m = l.maillons[k]!;
    let lu: CoreLu;
    try {
      lu = lireCore(m.core);
    } catch (e) {
      return { ok: false, motif: `maillon ${k + 1} : ${e instanceof Error ? e.message : "corps illisible"}` };
    }
    // Le cœur de la règle : cette transaction doit DÉPENSER la sortie tenue.
    // Sans cette clause, deux lignées pourraient partir de la même origine.
    if (!lu.entrees.some((e) => e.txid === tenue.txid && e.rang === tenue.rang))
      return {
        ok: false,
        motif: `maillon ${k + 1} : la transaction ne dépense pas ${tenue.txid.slice(0, 16)}…:${tenue.rang}`,
      };
    if (m.rang >= lu.nSorties)
      return {
        ok: false,
        motif: `maillon ${k + 1} : rang ${m.rang} pour ${lu.nSorties} sortie(s)`,
      };
    if (!regard.inclus(lu.txid))
      return { ok: false, motif: `maillon ${k + 1} : ${lu.txid.slice(0, 16)}… n'est dans aucun bloc` };
    maillon = maillonSuivant(maillon, lu.txid, m.rang);
    tenue = { txid: lu.txid, rang: m.rang };
  }

  // L'objet est perdu si personne ne tient plus sa sortie : soit elle est
  // passée à un maillon qu'on ne montre pas, soit elle a été brûlée.
  if (!regard.nonDepensee(tenue))
    return { ok: false, motif: `la sortie finale ${tenue.txid.slice(0, 16)}…:${tenue.rang} est dépensée` };

  return { ok: true, maillon, tenue, echanges: l.maillons.length };
}
