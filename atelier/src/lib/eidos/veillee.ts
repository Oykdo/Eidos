/**
 * La Veillée — une clé ne signe qu'une fois, et c'est la vie.
 *
 * Un run de veillée entre avec un **arbre de 64 feuilles WOTS+** (XMSS de
 * hauteur 6, même construction que la clé d'un validateur : federation.py
 * `CleValidateur`, vérifiée ici par xmss.ts). Chaque geste qui compte —
 * franchir (fin de salle), parler (l'hôte), ouvrir (creuser, une alcôve),
 * prendre (un occupant) — signe un message avec la feuille suivante ; rien ne
 * se re-signe. L'arbre vide avant le sommet, c'est la fin : `epuise`. Il n'y
 * a pas de point de vie ; il y a un compte qui ne remonte jamais.
 *
 * La veillée du jour est **identique pour tous** : le parcours (pendule.ts)
 * dérive de `graineDuJour = SHA-256d("eidos-veillee/1" ‖ id_bloc)`, où le bloc
 * est le PREMIER bloc du jour civil UTC — ce qui se prouve avec deux têtes
 * signées (la veille, le jour) sans rejouer la chaîne : `tete.prev` est la
 * tête de la veille et leurs jours diffèrent. Et elle **compte** parce qu'elle
 * est ancrée comme une ascension (ancrage.ts) : une pièce non dépensée,
 * prouvée contre la racine UTXO d'une tête **du même jour** (`teteAncre`, au
 * plus tôt le bloc du jour : celle où l'on ouvre, en pratique, car `etat.json`
 * ne publie que le carnet courant). L'arbre, lui, est **au coffre** :
 * `graineArbre = SHA-256d(tag ‖ maître ‖ id_bloc ‖ txid ‖ rang)`, sa racine
 * est engagée dans chaque message. Même bloc + même pièce + même coffre ⇒
 * même arbre : deux appareils signeraient la même feuille deux fois, et un
 * juge qui voit deux gestes d'indice égal refuse le run — c'est la règle du
 * validateur, appliquée au joueur.
 *
 * Message du geste i : SHA-256d(tag ‖ racine ‖ i ‖ étape ‖ étage ‖ geste ‖ arg
 * ‖ mot ‖ message précédent), le premier « précédent » étant la graine du
 * jour : une chaîne, donc un ordre ; un indice, donc un budget.
 *
 * Une veillée peut aussi être **libre** : le jour et ses salles, l'arbre et
 * ses feuilles, mais aucune pièce — comme une ascension libre, c'est une
 * lecture. Elle ne s'exporte pas, le juge la refuse, le classement l'ignore ;
 * l'arbre dérive du maître et du bloc du jour seulement. Le coffre d'atelier
 * y joue ; un coffre sans pièce aussi.
 *
 * Ce que le juge établit sans rejouer : la tête du jour et celle de la veille
 * (XMSS contre federation.json), la pièce (Merkle contre utxo_root), chaque
 * geste (WOTS+ contre la racine de l'arbre, indices 0, 1, 2… sans trou), le
 * parcours (le pendule recalculé sur les gestes « franchir »). Ce qu'il
 * n'établit pas : que la pièce est au joueur — cela se prouve en la dépensant.
 *
 * LIMITE : la jauge du jeu (ce que « parler » ou « ouvrir » a donné) reste
 * hors de ce fichier et hors preuve. Ici on ne juge que le budget et l'ordre.
 * Le score (salles × 64 + gestes de butin) est une lecture, pas une loi.
 */

import { feuilleSortie, verifierPreuve, type PreuvePortable, type SortieMin } from "./merkle.ts";
import { concat, fromHex, hexOf, sha256, sha256d, u32, utf8 } from "./hash.ts";
import {
  CHOIX,
  ETAPES,
  etageDe,
  penduleInitial,
  spawnDe,
  transition,
  TAG_PENDULE,
  type Choix,
  type Etape,
  type Spawn,
} from "./pendule.ts";
import { verifierTeteReseau, type FederationPublique, type TeteReseau } from "./temoin.ts";
import {
  TYPE_ARBRE,
  TYPE_LTREE,
  TYPE_OTS,
  adrs,
  arbreL,
  clePublique,
  grainePublique,
  randHash,
  signerWots,
} from "./wots.ts";
import { verifierMss, type SignatureXmss } from "./xmss.ts";

export const SPEC_VEILLEE = "eidos-veillee/1";
export const TAG_VEILLEE = utf8(SPEC_VEILLEE);
export const TAG_ARBRE = utf8("eidos-veillee/1/arbre");
export const TAG_GESTE = utf8("eidos-veillee/1/geste");
export const HAUTEUR_VEILLEE = 6;
export const FEUILLES = 1 << HAUTEUR_VEILLEE; // 64 — les soixante-quatre œufs
export const SECONDES_PAR_JOUR = 86_400;
/** 26 fins de salle mènent au sommet : 27 salles. */
export const FRANCHIR_AU_SOMMET = ETAPES - 1;

export const GESTES = ["franchir", "parler", "ouvrir", "prendre"] as const;
export type GesteId = (typeof GESTES)[number];

function u8(n: number): Uint8Array {
  return new Uint8Array([n & 255]);
}

// ---------------------------------------------------------------------------
// L'arbre de feuilles : federation.CleValidateur, porté — signé ici, vérifié par xmss.ts
// ---------------------------------------------------------------------------
export type ArbreFeuilles = {
  graine: Uint8Array;
  grainePub: Uint8Array;
  hauteur: number;
  racine: Uint8Array;
  /** niveaux[0] = feuilles … niveaux[hauteur] = [racine] */
  niveaux: Uint8Array[][];
};

/** Graine de la clé WOTS+ i : SHA-256(graine ‖ "ots" ‖ i), comme federation._graine_ots. */
export function graineOts(graine: Uint8Array, i: number): Uint8Array {
  return sha256(concat(graine, utf8("ots"), u32(i)));
}

function feuille(graine: Uint8Array, grainePub: Uint8Array, i: number): Uint8Array {
  const pk = clePublique(graineOts(graine, i), grainePub, adrs(TYPE_OTS, { a: i }));
  return arbreL(pk, grainePub, adrs(TYPE_LTREE, { a: i }));
}

/** 2^hauteur feuilles, arbre de Merkle tweaké (ADRS d'arbre par hauteur et indice). */
export function construireArbre(graine: Uint8Array, hauteur = HAUTEUR_VEILLEE): ArbreFeuilles {
  if (graine.length !== 32) throw new Error("graine de 32 octets attendue");
  if (!Number.isInteger(hauteur) || hauteur < 1 || hauteur > 20) throw new Error("hauteur 1..20");
  const grainePub = grainePublique(graine);
  const n = 1 << hauteur;
  const feuilles: Uint8Array[] = [];
  for (let i = 0; i < n; i++) feuilles.push(feuille(graine, grainePub, i));
  const niveaux: Uint8Array[][] = [feuilles];
  let k = 0;
  while (niveaux[niveaux.length - 1]!.length > 1) {
    const bas = niveaux[niveaux.length - 1]!;
    const haut: Uint8Array[] = [];
    for (let i = 0; i < bas.length / 2; i++) {
      haut.push(randHash(bas[2 * i]!, bas[2 * i + 1]!, grainePub, adrs(TYPE_ARBRE, { b: k, c: i })));
    }
    niveaux.push(haut);
    k += 1;
  }
  return { graine, grainePub, hauteur, racine: niveaux[niveaux.length - 1]![0]!, niveaux };
}

export function cheminDe(arbre: ArbreFeuilles, i: number): Uint8Array[] {
  const chemin: Uint8Array[] = [];
  let idx = i;
  for (const niveau of arbre.niveaux.slice(0, -1)) {
    chemin.push(niveau[idx ^ 1]!);
    idx >>= 1;
  }
  return chemin;
}

/** Signe avec la feuille i. Le compteur n'est pas ici : la veillée le tient (gestes.length). */
export function signerFeuille(arbre: ArbreFeuilles, i: number, msg32: Uint8Array): SignatureXmss {
  if (!Number.isInteger(i) || i < 0 || i >= 1 << arbre.hauteur) throw new Error("feuille hors de l'arbre");
  const wots = signerWots(graineOts(arbre.graine, i), arbre.grainePub, adrs(TYPE_OTS, { a: i }), msg32);
  return { indice: i, wots, chemin: cheminDe(arbre, i) };
}

// ---------------------------------------------------------------------------
// Le jour
// ---------------------------------------------------------------------------
export function jourDe(ts: number): number {
  return Math.floor(ts / SECONDES_PAR_JOUR);
}

/** `tete` est le premier bloc de son jour si sa tête précédente est de la veille. */
export function estPremierDuJour(
  tete: Pick<TeteReseau, "hauteur" | "prev" | "ts">,
  veille: Pick<TeteReseau, "hauteur" | "idBloc" | "ts">,
): { ok: true; jour: number } | { ok: false; motif: string } {
  if (tete.prev !== veille.idBloc) return { ok: false, motif: "la veille n'est pas la tête précédente" };
  if (tete.hauteur !== veille.hauteur + 1) return { ok: false, motif: "hauteurs non consécutives" };
  if (tete.ts <= veille.ts) return { ok: false, motif: "ts non croissant" };
  if (jourDe(veille.ts) >= jourDe(tete.ts)) return { ok: false, motif: "pas le premier bloc du jour" };
  return { ok: true, jour: jourDe(tete.ts) };
}

/** La graine du parcours : le bloc du jour, rien d'autre — la même pour tous. */
export function graineDuJour(idBlocHex: string): Uint8Array {
  return sha256d(concat(TAG_VEILLEE, fromHex(idBlocHex)));
}

/** La graine de l'arbre : le coffre, le bloc du jour, la pièce d'ancrage — ou « libre ». Secrète comme le maître. */
export function graineArbre(maitre: string, idBlocHex: string, piece: Pick<SortieMin, "txid" | "rang"> | null): Uint8Array {
  const ancre = piece ? concat(fromHex(piece.txid), u32(piece.rang)) : utf8("libre");
  return sha256d(concat(TAG_ARBRE, utf8(maitre), fromHex(idBlocHex), ancre));
}

// ---------------------------------------------------------------------------
// L'état d'une veillée
// ---------------------------------------------------------------------------
export type Geste = {
  g: GesteId;
  /** salle courante 0..26 au moment du geste */
  etape: number;
  /** étage de cette salle */
  etage: number;
  /** franchir : indice du choix (monter 0, lire 1, offrir 2) ; sinon case, occupant ou hôte */
  arg: number;
  /** franchir : mot de l'objet porté ; sinon 0 */
  mot: number;
};

export type SignatureHex = { indice: number; wots: string; chemin: string[] };
export type GesteSigne = Geste & { i: number; msg: string; sig: SignatureHex };

export type Fin = "sommet" | "epuise" | "porte" | "abandon";

/** Ce qui fait compter une veillée : une pièce non dépensée, prouvée contre une tête du même jour. */
export type AncreVeillee = {
  /** la tête du même jour contre laquelle la pièce est prouvée (hauteur ≥ tete) */
  teteAncre: TeteReseau;
  piece: SortieMin;
  preuve: PreuvePortable;
};

export type Veillee = {
  v: 1;
  spec: typeof SPEC_VEILLEE;
  jour: number;
  tete: TeteReseau;
  veille: TeteReseau;
  /** null : veillée libre — une lecture, rien ne s'exporte, rien ne se juge */
  ancre: AncreVeillee | null;
  racine: string;
  grainePub: string;
  hauteur: number;
  gestes: GesteSigne[];
  fin: Fin | null;
};

export type Parcours = { etape: number; p: number; etage: number; spawn: Spawn; etapes: Etape[] };

/** Rejoue le pendule sur les gestes « franchir » : où l'on est, par où l'on est passé. */
export function parcoursDe(v: Pick<Veillee, "tete" | "gestes">): Parcours {
  const graine = graineDuJour(v.tete.idBloc);
  let p = penduleInitial(graine);
  let etape = 0;
  let etage = 0;
  let h = sha256d(concat(TAG_PENDULE, graine, u8(0), u8(0), u8(p)));
  let spawn = spawnDe(h, p);
  const etapes: Etape[] = [{ i: 0, p, e: 0, s: spawn }];
  for (const g of v.gestes) {
    if (g.g !== "franchir") continue;
    const t = transition(graine, etape, p, etage, CHOIX[g.arg]!, g.mot);
    p = t.p;
    h = t.h;
    etape += 1;
    etage = etageDe(etape, p);
    spawn = spawnDe(h, p);
    etapes.push({ i: etape, p, e: etage, s: spawn });
  }
  return { etape, p, etage, spawn, etapes };
}

export function feuillesRestantes(v: Pick<Veillee, "gestes" | "hauteur">): number {
  return (1 << v.hauteur) - v.gestes.length;
}

export function messageGeste(racine: Uint8Array, i: number, g: Geste, precedent: Uint8Array): Uint8Array {
  return sha256d(
    concat(
      TAG_GESTE,
      racine,
      u32(i),
      u8(g.etape),
      u8(g.etage),
      u8(GESTES.indexOf(g.g)),
      u32(g.arg >>> 0),
      u32(g.mot >>> 0),
      precedent,
    ),
  );
}

/** L'ancre est une tête du même jour, au plus tôt le bloc du jour. */
export function ancreDuJour(
  tete: Pick<TeteReseau, "hauteur" | "ts">,
  teteAncre: Pick<TeteReseau, "hauteur" | "ts">,
): { ok: true } | { ok: false; motif: string } {
  if (jourDe(teteAncre.ts) !== jourDe(tete.ts)) return { ok: false, motif: "l'ancre n'est pas du jour" };
  if (teteAncre.hauteur < tete.hauteur) return { ok: false, motif: "l'ancre précède le bloc du jour" };
  return { ok: true };
}

/** Ouvre la veillée du jour : la tête du jour et celle de la veille, l'arbre, et l'ancre —
 *  la pièce et sa preuve contre `teteAncre` (une tête du même jour, par défaut le bloc du
 *  jour) — ou `null` : une veillée libre, une lecture. */
export function ouvrirVeillee(
  arbre: ArbreFeuilles,
  tete: TeteReseau,
  veille: TeteReseau,
  ancre: { piece: SortieMin; preuve: PreuvePortable; teteAncre?: TeteReseau } | null,
): Veillee | { erreur: string } {
  if (arbre.hauteur !== HAUTEUR_VEILLEE) return { erreur: `arbre de hauteur ${HAUTEUR_VEILLEE} attendu` };
  const j = estPremierDuJour(tete, veille);
  if (!j.ok) return { erreur: j.motif };
  let ancree: AncreVeillee | null = null;
  if (ancre) {
    const teteAncre = ancre.teteAncre ?? tete;
    const an = ancreDuJour(tete, teteAncre);
    if (!an.ok) return { erreur: an.motif };
    if (hexOf(feuilleSortie(ancre.piece)) !== ancre.preuve.feuille) return { erreur: "la feuille ne correspond pas à la pièce" };
    if (!verifierPreuve(ancre.preuve)) return { erreur: "chemin rompu" };
    if (ancre.preuve.racine !== teteAncre.utxoRoot) return { erreur: "pièce étrangère à la tête d'ancrage" };
    const { txid, rang, adresse, montant } = ancre.piece;
    ancree = { teteAncre, piece: { txid, rang, adresse, montant }, preuve: ancre.preuve };
  }
  return {
    v: 1,
    spec: SPEC_VEILLEE,
    jour: j.jour,
    tete,
    veille,
    ancre: ancree,
    racine: hexOf(arbre.racine),
    grainePub: hexOf(arbre.grainePub),
    hauteur: arbre.hauteur,
    gestes: [],
    fin: null,
  };
}

export type Refus = { erreur: "finie" | "vide" | "arbre" | "choix" | "arg" };

/** Un geste : une feuille brûlée. Étape et étage sont lus dans le parcours, jamais déclarés. */
export function signerGeste(
  v: Veillee,
  arbre: ArbreFeuilles,
  geste: { g: GesteId; arg: number; mot?: number },
): Veillee | Refus {
  if (v.fin !== null) return { erreur: "finie" };
  if (hexOf(arbre.racine) !== v.racine) return { erreur: "arbre" };
  if (feuillesRestantes(v) <= 0) return { erreur: "vide" };
  if (!Number.isInteger(geste.arg) || geste.arg < 0 || geste.arg > 0xffff_ffff) return { erreur: "arg" };
  const mot = geste.g === "franchir" ? (geste.mot ?? 0) >>> 0 : 0;
  if (geste.g === "franchir" && geste.arg >= CHOIX.length) return { erreur: "choix" };
  const parcours = parcoursDe(v);
  const g: Geste = { g: geste.g, etape: parcours.etape, etage: parcours.etage, arg: geste.arg, mot };
  const i = v.gestes.length;
  const precedent = i === 0 ? graineDuJour(v.tete.idBloc) : fromHex(v.gestes[i - 1]!.msg);
  const msg = messageGeste(arbre.racine, i, g, precedent);
  const sig = signerFeuille(arbre, i, msg);
  const signe: GesteSigne = {
    ...g,
    i,
    msg: hexOf(msg),
    sig: { indice: sig.indice, wots: hexOf(sig.wots), chemin: sig.chemin.map(hexOf) },
  };
  const gestes = [...v.gestes, signe];
  const franchis = gestes.filter((x) => x.g === "franchir").length;
  let fin: Fin | null = null;
  if (franchis >= FRANCHIR_AU_SOMMET) fin = "sommet";
  else if (gestes.length >= 1 << v.hauteur) fin = "epuise";
  return { ...v, gestes, fin };
}

/** Une porte fermée ou un abandon arrêtent la veillée ; la preuve reste exportable. */
export function arreterVeillee(v: Veillee, fin: "porte" | "abandon"): Veillee {
  if (v.fin !== null) return v;
  return { ...v, fin };
}

// ---------------------------------------------------------------------------
// Juger sans rejouer
// ---------------------------------------------------------------------------
export type VerdictVeillee =
  | { ok: true; jour: number; fin: Fin; salles: number; feuilles: number; butin: number; etapes: Etape[] }
  | { ok: false; motif: string };

export function jugerVeillee(v: Veillee, fed: FederationPublique): VerdictVeillee {
  if (v.v !== 1 || v.spec !== SPEC_VEILLEE) return { ok: false, motif: "pas une veillée eidos-veillee/1" };
  if (v.hauteur !== HAUTEUR_VEILLEE) return { ok: false, motif: `arbre de hauteur ${HAUTEUR_VEILLEE} attendu` };
  if (v.fin === null) return { ok: false, motif: "veillée en cours" };
  const vt = verifierTeteReseau(v.tete, fed);
  if (!vt.ok) return { ok: false, motif: `tête du jour refusée (${vt.motif})` };
  const vv = verifierTeteReseau(v.veille, fed);
  if (!vv.ok) return { ok: false, motif: `tête de la veille refusée (${vv.motif})` };
  const j = estPremierDuJour(v.tete, v.veille);
  if (!j.ok) return { ok: false, motif: j.motif };
  if (j.jour !== v.jour) return { ok: false, motif: "jour déclaré ≠ jour du bloc" };
  if (!v.ancre) return { ok: false, motif: "veillée libre : une lecture, rien à juger" };
  const va = verifierTeteReseau(v.ancre.teteAncre, fed);
  if (!va.ok) return { ok: false, motif: `tête d'ancrage refusée (${va.motif})` };
  const an = ancreDuJour(v.tete, v.ancre.teteAncre);
  if (!an.ok) return { ok: false, motif: an.motif };
  if (hexOf(feuilleSortie(v.ancre.piece)) !== v.ancre.preuve.feuille) return { ok: false, motif: "la feuille ne correspond pas à la pièce" };
  if (!verifierPreuve(v.ancre.preuve)) return { ok: false, motif: "chemin rompu" };
  if (v.ancre.preuve.racine !== v.ancre.teteAncre.utxoRoot) return { ok: false, motif: "pièce étrangère à la tête d'ancrage" };
  if (!/^[0-9a-f]{64}$/.test(v.racine) || !/^[0-9a-f]{64}$/.test(v.grainePub)) {
    return { ok: false, motif: "racine ou graine publique mal formée" };
  }
  if (v.gestes.length > 1 << v.hauteur) return { ok: false, motif: "plus de gestes que de feuilles" };

  const racine = fromHex(v.racine);
  const gp = fromHex(v.grainePub);
  const graine = graineDuJour(v.tete.idBloc);
  let precedent = graine;
  let p = penduleInitial(graine);
  let etape = 0;
  let etage = 0;
  let h = sha256d(concat(TAG_PENDULE, graine, u8(0), u8(0), u8(p)));
  const etapes: Etape[] = [{ i: 0, p, e: 0, s: spawnDe(h, p) }];
  let butin = 0;
  for (let k = 0; k < v.gestes.length; k++) {
    const g = v.gestes[k]!;
    if (g.i !== k || g.sig.indice !== k) {
      return { ok: false, motif: `geste ${k} : indice ${g.sig.indice} — une feuille par geste, dans l'ordre` };
    }
    if (!GESTES.includes(g.g)) return { ok: false, motif: `geste ${k} : inconnu` };
    if (g.etape !== etape || g.etage !== etage) {
      return { ok: false, motif: `geste ${k} : déclaré à ${g.etape}/${g.etage}, le parcours est à ${etape}/${etage}` };
    }
    if (!Number.isInteger(g.arg) || g.arg < 0 || g.arg > 0xffff_ffff) return { ok: false, motif: `geste ${k} : arg hors borne` };
    if (!Number.isInteger(g.mot) || g.mot < 0 || g.mot > 0xffff_ffff) return { ok: false, motif: `geste ${k} : mot hors borne` };
    if (g.g === "franchir" && g.arg >= CHOIX.length) return { ok: false, motif: `geste ${k} : choix inconnu` };
    if (g.g !== "franchir" && g.mot !== 0) return { ok: false, motif: `geste ${k} : mot sans franchir` };
    const msg = messageGeste(racine, k, g, precedent);
    if (hexOf(msg) !== g.msg) return { ok: false, motif: `geste ${k} : message différent — la chaîne des gestes est rompue` };
    let sig: SignatureXmss;
    try {
      sig = { indice: g.sig.indice, wots: fromHex(g.sig.wots), chemin: g.sig.chemin.map(fromHex) };
    } catch {
      return { ok: false, motif: `geste ${k} : signature illisible` };
    }
    if (!verifierMss(racine, gp, v.hauteur, msg, sig)) return { ok: false, motif: `geste ${k} : signature refusée` };
    precedent = msg;
    if (g.g === "franchir") {
      const t = transition(graine, etape, p, etage, CHOIX[g.arg] as Choix, g.mot);
      p = t.p;
      h = t.h;
      etape += 1;
      etage = etageDe(etape, p);
      etapes.push({ i: etape, p, e: etage, s: spawnDe(h, p) });
    } else {
      butin += 1;
    }
  }
  const franchis = etape;
  if (v.fin === "sommet" && franchis !== FRANCHIR_AU_SOMMET) return { ok: false, motif: "sommet déclaré sans les 26 fins de salle" };
  if (v.fin !== "sommet" && franchis >= FRANCHIR_AU_SOMMET) return { ok: false, motif: "26 fins de salle : c'est le sommet" };
  if (v.fin === "epuise" && v.gestes.length !== 1 << v.hauteur) return { ok: false, motif: "épuisé déclaré avec des feuilles restantes" };
  if (v.fin !== "epuise" && v.fin !== "sommet" && v.gestes.length >= 1 << v.hauteur) {
    return { ok: false, motif: "arbre vide : c'est épuisé" };
  }
  return { ok: true, jour: v.jour, fin: v.fin, salles: franchis + 1, feuilles: v.gestes.length, butin, etapes };
}

/** Lecture : monter loin d'abord, faire beaucoup ensuite. 27 × 64 + 38 au plus. */
export function scoreVeillee(verdict: Pick<Extract<VerdictVeillee, { ok: true }>, "salles" | "butin">): number {
  return verdict.salles * FEUILLES + verdict.butin;
}

/** Les comptes d'une veillée, sans rien vérifier : ce qu'on lit, ancrée ou libre. */
export function lectureVeillee(v: Pick<Veillee, "gestes" | "hauteur" | "ancre" | "fin">): {
  salles: number;
  feuilles: number;
  butin: number;
  libre: boolean;
  fin: Fin | null;
} {
  const franchis = v.gestes.filter((g) => g.g === "franchir").length;
  return {
    salles: franchis + 1,
    feuilles: v.gestes.length,
    butin: v.gestes.length - franchis,
    libre: v.ancre === null,
    fin: v.fin,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
export function exporterVeillee(v: Veillee): Veillee | { erreur: string } {
  if (v.fin === null) return { erreur: "veillée en cours" };
  if (!v.ancre) return { erreur: "veillée libre : une lecture, rien à exporter" };
  return v;
}

export function serialiserVeillee(v: Veillee): string {
  return JSON.stringify(v);
}

const HEX32 = /^[0-9a-f]{64}$/;

function teteBienFormee(t: unknown): t is TeteReseau {
  const o = t as Record<string, unknown> | null;
  return (
    !!o &&
    typeof o.hauteur === "number" &&
    typeof o.ts === "number" &&
    typeof o.validateur === "number" &&
    typeof o.indice === "number" &&
    typeof o.signature === "string" &&
    Array.isArray(o.chemin) &&
    ["prev", "merkle", "utxoRoot", "idBloc"].every((k) => typeof o[k] === "string" && HEX32.test(o[k] as string))
  );
}

export function parserVeillee(raw: string): Veillee | { erreur: string } {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { erreur: "JSON invalide" };
  }
  if (!o || o.v !== 1 || o.spec !== SPEC_VEILLEE) return { erreur: "pas une veillée eidos-veillee/1" };
  if (!teteBienFormee(o.tete) || !teteBienFormee(o.veille)) return { erreur: "tête mal formée" };
  if (o.ancre !== null) {
    const a = o.ancre as Record<string, unknown> | undefined;
    if (!a || typeof a !== "object" || !teteBienFormee(a.teteAncre)) return { erreur: "ancre mal formée" };
    const p = a.piece as Record<string, unknown> | undefined;
    if (
      !p ||
      typeof p.txid !== "string" ||
      !HEX32.test(p.txid) ||
      typeof p.rang !== "number" ||
      typeof p.adresse !== "string" ||
      typeof p.montant !== "number"
    ) {
      return { erreur: "pièce mal formée" };
    }
    const pr = a.preuve as Record<string, unknown> | undefined;
    if (!pr || pr.v !== 1 || typeof pr.feuille !== "string" || typeof pr.racine !== "string" || !Array.isArray(pr.freres)) {
      return { erreur: "preuve mal formée" };
    }
  }
  if (typeof o.jour !== "number" || typeof o.racine !== "string" || typeof o.grainePub !== "string" || typeof o.hauteur !== "number") {
    return { erreur: "jour, racine, graine publique ou hauteur absents" };
  }
  if (!Array.isArray(o.gestes)) return { erreur: "gestes absents" };
  for (const g of o.gestes as Record<string, unknown>[]) {
    const s = g?.sig as Record<string, unknown> | undefined;
    if (
      !g ||
      typeof g.g !== "string" ||
      typeof g.i !== "number" ||
      typeof g.etape !== "number" ||
      typeof g.etage !== "number" ||
      typeof g.arg !== "number" ||
      typeof g.mot !== "number" ||
      typeof g.msg !== "string" ||
      !HEX32.test(g.msg) ||
      !s ||
      typeof s.indice !== "number" ||
      typeof s.wots !== "string" ||
      !Array.isArray(s.chemin)
    ) {
      return { erreur: "geste mal formé" };
    }
  }
  const fin = o.fin;
  if (fin !== null && fin !== "sommet" && fin !== "epuise" && fin !== "porte" && fin !== "abandon") return { erreur: "fin inconnue" };
  return o as unknown as Veillee;
}
