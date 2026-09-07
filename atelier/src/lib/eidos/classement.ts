/**
 * Le classement des veillées — des preuves relues, jamais un serveur.
 *
 * Une preuve `eidos-veillee/1` déposée dans `veillees/` (un fichier par
 * preuve, nommé `<jour>-<txid 8 hex>-<rang>.json`, inscrit dans `index.json`
 * par une PR : l'ordre du dépôt est public) est **jugée dans le navigateur de
 * chacun** (`jugerVeillee`, sans rejeu, sans serveur), puis classée :
 * score = salles × 64 + butin (`scoreVeillee`), décroissant ; à score égal,
 * moins de feuilles brûlées d'abord ; puis la pièce, puis le jour. Une pièce
 * n'ancre qu'une veillée par jour : de deux preuves valides sur la même
 * (jour, pièce), la **première reçue** est classée, l'autre est écartée comme
 * doublon. Une preuve refusée par le juge, ou libre (sans pièce), n'est pas
 * classée ; son motif est rendu à côté, jamais tu.
 *
 * Les **fantômes d'une salle** sont les classés dont le parcours (les étapes
 * recalculées par le juge sur les gestes « franchir ») est passé par cet
 * étage : leur épithète (fantomes.ts) et le nombre de feuilles qu'ils avaient
 * encore en y arrivant — recompté depuis les gestes, jamais déclaré.
 *
 * `lireVeillees` lit `index.json` puis chaque fichier depuis le dépôt brut, et
 * refuse ce qui ne se parse pas, ce qui porte un nom hors convention, et ce
 * dont le nom ne dit pas la preuve qu'il contient.
 *
 * Figures, pas preuves : un rang, une épithète, un nombre de feuilles « qu'on
 * avait encore » sont des lectures d'une preuve vraie ; seule la preuve
 * engage, et le juge ne sait pas si la pièce est encore au joueur — cela se
 * prouve en la dépensant.
 *
 * LIMITE : rien n'est mis en cache et rien n'est cru — chaque lecteur rejuge
 * chaque preuve (64 signatures WOTS+ au plus par preuve), de façon synchrone ;
 * à quelques centaines de preuves, la page prendra des secondes. Un fichier de
 * l'index inscrit deux fois est lu deux fois et écarté une fois comme doublon.
 * Le juge accepte toute tête signée : une veillée ancrée sur un bloc orphelin
 * (le « murmure » de la bible, §4.1) est classée comme une autre — comparer
 * ses têtes à la chaîne lue (chaine-reseau.ts) reste à faire.
 */

import { fantomeDe, type Fantome } from "./fantomes.ts";
import type { Langue } from "./objets-lexique.ts";
import type { Etape } from "./pendule.ts";
import type { FederationPublique } from "./temoin.ts";
import { FEUILLES, jugerVeillee, parserVeillee, scoreVeillee, type Fin, type GesteId, type Veillee } from "./veillee.ts";

export const VEILLEES_URL = "https://raw.githubusercontent.com/Oykdo/Eidos/main/veillees/";
export const INDEX_VEILLEES = "index.json";

// ---------------------------------------------------------------------------
// Classer
// ---------------------------------------------------------------------------
export type OptionsClassement = {
  /** la hauteur de la tête suivie : un bloc d'un autre âge fait un écho (fantomes.ts) ; par défaut, celle du bloc du jour */
  hauteurCourante?: number;
  langue?: Langue;
};

export type Classee = {
  /** 1 pour le premier */
  rang: number;
  jour: number;
  /** « txid:rang » de la pièce d'ancrage */
  piece: string;
  salles: number;
  butin: number;
  /** feuilles brûlées */
  feuilles: number;
  fin: Fin;
  score: number;
  /** l'étage de la dernière salle atteinte : la dernière étape du verdict */
  etageFinal: number;
  /** la hauteur du bloc du jour */
  hauteurBloc: number;
  /** le parcours recalculé par le juge */
  etapes: Etape[];
  /** les gestes dans l'ordre : de quoi recompter les feuilles à chaque étape */
  gestes: GesteId[];
  fantome: Fantome;
};

export type Refusee = {
  /** position dans l'ordre reçu, 0 pour la première */
  n: number;
  /** tel que la preuve le déclare : rien n'est vérifié d'une refusée */
  jour: number;
  /** « txid:rang » tel que la preuve le déclare ; null pour une libre */
  piece: string | null;
  motif: string;
};

export type Classement = { classees: Classee[]; refusees: Refusee[] };

export function refDePiece(piece: { txid: string; rang: number }): string {
  return `${piece.txid}:${piece.rang}`;
}

/** Ce que la feuille UTXO engage du rang : un u32. Au-delà, `u32` replie (0,5 → 0, 2³² → 0) :
 *  le juge verrait la même feuille sous deux références, et la règle « une pièce, une veillée
 *  par jour » aurait deux clés. On refuse la référence, on ne la normalise pas. */
const RANG_MAX = 0xffff_ffff;
const TXID = /^[0-9a-f]{64}$/;

/** null si la référence de la pièce est canonique ; sinon le motif du refus. */
function motifPiece(piece: { txid: string; rang: number }): string | null {
  if (typeof piece.txid !== "string" || !TXID.test(piece.txid)) {
    return `pièce mal formée : txid ${String(piece.txid).slice(0, 16)}… — 64 hexadécimales minuscules attendues`;
  }
  if (!Number.isInteger(piece.rang) || piece.rang < 0 || piece.rang > RANG_MAX) {
    return `pièce mal formée : rang ${piece.rang} — un entier 0..${RANG_MAX} attendu`;
  }
  return null;
}

/** Score décroissant, puis feuilles brûlées croissantes, puis pièce, puis jour : un ordre total. */
export function comparer(
  a: Pick<Classee, "score" | "feuilles" | "piece" | "jour">,
  b: Pick<Classee, "score" | "feuilles" | "piece" | "jour">,
): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.feuilles !== b.feuilles) return a.feuilles - b.feuilles;
  if (a.piece !== b.piece) return a.piece < b.piece ? -1 : 1;
  return a.jour - b.jour;
}

/** Juge chaque preuve, écarte les refusées et les doublons (la première valide reçue l'emporte), trie, numérote. */
export function classer(preuves: readonly Veillee[], fed: FederationPublique, options: OptionsClassement = {}): Classement {
  const langue = options.langue ?? "fr";
  const valides: Omit<Classee, "rang">[] = [];
  const refusees: Refusee[] = [];
  const premieres = new Map<string, number>();
  preuves.forEach((v, n) => {
    const piece = v.ancre ? refDePiece(v.ancre.piece) : null;
    const mal = v.ancre ? motifPiece(v.ancre.piece) : null;
    if (mal !== null) {
      refusees.push({ n, jour: v.jour, piece, motif: mal });
      return;
    }
    const j = jugerVeillee(v, fed);
    if (!j.ok || piece === null) {
      refusees.push({ n, jour: v.jour, piece, motif: j.ok ? "veillée libre : une lecture, rien à classer" : j.motif });
      return;
    }
    const cle = `${j.jour}/${piece}`;
    const premiere = premieres.get(cle);
    if (premiere !== undefined) {
      refusees.push({ n, jour: j.jour, piece, motif: `doublon : la pièce ${piece} a déjà sa veillée du jour ${j.jour} (preuve ${premiere})` });
      return;
    }
    premieres.set(cle, n);
    const etageFinal = j.etapes[j.etapes.length - 1]!.e;
    const hauteurBloc = v.tete.hauteur;
    valides.push({
      jour: j.jour,
      piece,
      salles: j.salles,
      butin: j.butin,
      feuilles: j.feuilles,
      fin: j.fin,
      score: scoreVeillee(j),
      etageFinal,
      hauteurBloc,
      etapes: j.etapes,
      gestes: v.gestes.map((g) => g.g),
      fantome: fantomeDe({ fin: j.fin, etageFinal, hauteurBloc }, options.hauteurCourante ?? hauteurBloc, langue),
    });
  });
  valides.sort(comparer);
  return { classees: valides.map((c, k) => ({ ...c, rang: k + 1 })), refusees };
}

// ---------------------------------------------------------------------------
// Les fantômes d'une salle
// ---------------------------------------------------------------------------
/** Feuilles restantes à l'arrivée à l'étape k : 64 moins les gestes signés jusqu'au k-ième « franchir » inclus ; null si l'étape n'est pas atteinte. */
export function feuillesALEtape(gestes: readonly GesteId[], k: number): number | null {
  if (k === 0) return FEUILLES;
  let franchis = 0;
  for (let i = 0; i < gestes.length; i++) {
    if (gestes[i] === "franchir" && ++franchis === k) return FEUILLES - (i + 1);
  }
  return null;
}

export type FantomeDeSalle = {
  rang: number;
  jour: number;
  piece: string;
  /** l'étape à laquelle le parcours a atteint la salle */
  etape: number;
  /** feuilles qu'il avait encore en arrivant */
  feuilles: number;
  fantome: Fantome;
};

/** Les classés passés par cet étage, par rang ; l'épithète relue à la hauteur et dans la langue données. Une lecture. */
export function fantomesDeSalle(classees: readonly Classee[], etage: number, hauteurCourante: number, langue: Langue): FantomeDeSalle[] {
  const out: FantomeDeSalle[] = [];
  for (const c of classees) {
    const k = c.etapes.findIndex((e) => e.e === etage);
    if (k < 0) continue;
    const feuilles = feuillesALEtape(c.gestes, k);
    if (feuilles === null) continue;
    out.push({
      rang: c.rang,
      jour: c.jour,
      piece: c.piece,
      etape: k,
      feuilles,
      fantome: fantomeDe({ fin: c.fin, etageFinal: c.etageFinal, hauteurBloc: c.hauteurBloc }, hauteurCourante, langue),
    });
  }
  return out.sort((a, b) => a.rang - b.rang);
}

// ---------------------------------------------------------------------------
// Lire le dépôt
// ---------------------------------------------------------------------------
const NOM_FICHIER = /^[0-9]{1,8}-[0-9a-f]{8}-[0-9]{1,5}\.json$/;

/** `<jour>-<txid 8 hex>-<rang>.json` : le nom d'une preuve dans veillees/ ; null pour une veillée libre. */
export function nomDeFichier(v: Pick<Veillee, "jour" | "ancre">): string | null {
  if (!v.ancre) return null;
  return `${v.jour}-${v.ancre.piece.txid.slice(0, 8)}-${v.ancre.piece.rang}.json`;
}

type FetchJson = (url: string) => Promise<{ ok: boolean; status?: number; json(): Promise<unknown> }>;

export type RefusLecture = { fichier: string; motif: string };
export type LectureVeillees = { preuves: Veillee[]; refus: RefusLecture[] };

async function lireUne(fetchImpl: FetchJson, base: string, entree: unknown): Promise<{ preuve: Veillee } | RefusLecture> {
  const fichier = typeof entree === "string" ? entree : String(entree);
  if (typeof entree !== "string" || !NOM_FICHIER.test(entree)) {
    return { fichier, motif: "nom refusé : <jour>-<txid 8 hex>-<rang>.json attendu" };
  }
  let brut: unknown;
  try {
    const r = await fetchImpl(base + entree);
    if (!r.ok) return { fichier, motif: `injoignable (${r.status ?? "?"})` };
    brut = await r.json();
  } catch (e) {
    return { fichier, motif: `illisible : ${e instanceof Error ? e.message : String(e)}` };
  }
  const v = parserVeillee(JSON.stringify(brut));
  if ("erreur" in v) return { fichier, motif: v.erreur };
  const nom = nomDeFichier(v);
  if (nom === null) return { fichier, motif: "veillée libre : sans pièce, rien à classer" };
  if (nom !== entree) return { fichier, motif: `le nom ne dit pas la preuve (${nom} attendu)` };
  return { preuve: v };
}

/** Lit `index.json` (un tableau de noms) puis chaque fichier, dans l'ordre du dépôt ; index injoignable → erreur. */
export async function lireVeillees(
  fetchImpl: FetchJson = (u) => fetch(u, { cache: "no-store" }),
  base = VEILLEES_URL,
): Promise<LectureVeillees | { erreur: string }> {
  let index: unknown;
  try {
    const r = await fetchImpl(base + INDEX_VEILLEES);
    if (!r.ok) return { erreur: `index injoignable (${r.status ?? "?"})` };
    index = await r.json();
  } catch (e) {
    return { erreur: `réseau injoignable : ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!Array.isArray(index)) return { erreur: "index.json : un tableau de noms de fichiers attendu" };
  const lectures = await Promise.all(index.map((f) => lireUne(fetchImpl, base, f)));
  const preuves: Veillee[] = [];
  const refus: RefusLecture[] = [];
  for (const l of lectures) {
    if ("preuve" in l) preuves.push(l.preuve);
    else refus.push(l);
  }
  return { preuves, refus };
}
