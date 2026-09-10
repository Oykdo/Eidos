/**
 * La veillée dans la Tour — les gestes reliés aux actes, une feuille chacun.
 *
 * veillee.ts tient le budget et la preuve ; ici on les branche sur la Tour
 * telle qu'elle existe : parler = honorer l'hôte (hotes.ts), creuser = un coup
 * de bêche (fouilles.ts), ouvrir l'alcôve (secrets.ts), prendre = la capsule
 * (capsules.ts), franchir = la fin de salle du pendule (ascension.ts). La règle
 * est toujours la même : **l'acte d'abord, la feuille ensuite, et seulement si
 * l'acte a eu lieu**. Un hôte absent, une case déjà creusée, une capsule qui
 * n'existe pas ne brûlent rien ; une prise qui échappe ou se brise a eu lieu,
 * elle coûte sa feuille. Une porte fermée n'est pas franchie : la veillée
 * s'arrête en `porte` sans feuille.
 *
 * **Le sac.** Ce qu'une veillée rapporte — dons, trouvailles, coffrets,
 * captures, élixirs d'écho — n'entre pas au coffre au geste : il va dans un
 * sac de quatre-vingt-une places (trois par salle, la dalle entière), noté dans
 * la jauge. Le sommet, une
 * porte fermée ou l'effacement volontaire **versent** le sac au coffre ;
 * l'arbre épuisé **le perd** : les gestes restent dans la preuve, les objets
 * ne reviennent pas. C'est le dilemme de la parcimonie : brûler la dernière
 * feuille coûte le butin. Un sac plein refuse les gestes de butin, jamais
 * franchir. Ce qu'on porte vient du coffre ; ce qu'on trouve va au sac.
 *
 * Le parcours est celui de l'ascension (jauge `tour.ascension`), commencée
 * avec la **graine du jour** : même étage, même case pour tous. La veillée
 * (`tour.veillee`) porte la preuve et l'**indice réservé** : avant de signer
 * la feuille i, l'indice passe à i + 1 et se note dans la jauge, comme
 * `CompteurMSS` chez un validateur. Un coffre relu d'une jauge plus ancienne
 * (deux appareils, une sauvegarde d'avant) ne peut pas resigner une feuille
 * déjà brûlée dans cette session : `reserver` refuse. L'arbre se reconstruit
 * depuis le maître du coffre à la demande, jamais stocké.
 *
 * Le coffre d'atelier a une graine publique : sa veillée est une démonstration,
 * elle se joue et ne s'exporte pas. Une veillée **libre** (sans pièce) se joue
 * dans tout coffre, atelier compris : les mêmes salles, le même arbre de
 * feuilles, mais une lecture — rien ne s'exporte, rien ne se juge.
 *
 * LIMITE : la réserve d'indice hors jauge est un registre de session
 * (`Map` par racine) ; le store la fait passer par localStorage. Entre deux
 * appareils, seul le juge tranche (deux gestes d'indice égal = run refusé).
 * Effacer une veillée en cours (sans l'abandonner) perd son sac.
 */

import {
  commencerDansCoffre,
  finDeSalleDansCoffre,
  type Ancre,
} from "./ascension.ts";
import { prendreDansCoffre, type PrendreKo, type PrendreOk } from "./capsules.ts";
import { fouillerCaseDansCoffre, type FouilleKo, type FouilleOk } from "./fouilles.ts";
import { hexOf } from "./hash.ts";
import { honorerDansCoffre, type Honorer } from "./hotes.ts";
import { tourDe } from "./jauge.ts";
import type { PreuvePortable, SortieMin } from "./merkle.ts";
import { CHOIX, ETAPES, type Choix } from "./pendule.ts";
import { agesScelles, sceauxDuCoffre, type EntreeMonde } from "./sceaux.ts";
import { ouvrirAlcove, type AlcoveKo, type AlcoveOk } from "./secrets.ts";
import type { TeteReseau } from "./temoin.ts";
import { DALLE_N } from "./tour.ts";
import type { Coffre, ObjetPorte } from "./types.ts";
import {
  arreterVeillee,
  construireArbre,
  feuillesRestantes,
  graineArbre,
  graineDuJour,
  ouvrirVeillee,
  parcoursDe,
  signerGeste,
  type ArbreFeuilles,
  type GesteId,
  type Veillee,
} from "./veillee.ts";

export type VeilleeDuCoffre = {
  v: Veillee;
  /** premier indice de feuille jamais signé : écrit avant de rendre la signature */
  indiceReserve: number;
  /** le butin de la veillée, en attente du versement (sommet, porte, effacement) */
  sac: ObjetPorte[];
};

/**
 * Le sac : trois fois les étapes, soit 81 places — la dalle entière, 9².
 * Une place par salle (27) datait d'une dalle à moitié pleine et d'un
 * parcours de vingt-sept salles ; les salles dégagées rendent trois fois
 * plus, et un sac qui déborde refuse le butin sans qu'on ait rien décidé.
 */
export const SAC_PLACES = 3 * ETAPES;

/** L'alcôve n'a pas de case : son argument est hors de la dalle. */
export const ARG_ALCOVE = DALLE_N * DALLE_N;

export type RefusVeillee = {
  ok: false;
  code: "aucune" | "finie" | "vide" | "reserve" | "atelier" | "libre" | "sac" | "acte" | "ascension";
  motif: string;
  /** le refus de l'acte lui-même, quand c'est lui qui refuse */
  acte?: Honorer | FouilleOk | FouilleKo | AlcoveOk | AlcoveKo | PrendreOk | PrendreKo;
};

export type GesteOk = {
  ok: true;
  coffre: Coffre;
  geste: GesteId;
  feuilles: number;
  fin: Veillee["fin"];
  /** objets entrés au sac par ce geste */
  ajoutes: ObjetPorte[];
  /** objets versés au coffre si ce geste a fini la veillée (sommet, porte) */
  verses: ObjetPorte[];
  /** objets perdus si ce geste a épuisé l'arbre */
  perdus: ObjetPorte[];
};

// ---------------------------------------------------------------------------
// L'arbre et la réserve
// ---------------------------------------------------------------------------
const arbres = new Map<string, ArbreFeuilles>();

/** L'arbre de la veillée du coffre, reconstruit depuis le maître ; mis en cache par racine. */
export function arbreDuCoffre(c: Pick<Coffre, "maitre">, v: Veillee): ArbreFeuilles | null {
  const hit = arbres.get(v.racine);
  if (hit) return hit;
  const a = construireArbre(graineArbre(c.maitre, v.tete.idBloc, v.ancre?.piece ?? null));
  if (hexOf(a.racine) !== v.racine) return null;
  arbres.set(v.racine, a);
  return a;
}

export type Reserver = (racine: string, indice: number) => boolean;

const reserves = new Map<string, number>();

/** Registre de session : accepte l'indice i s'il est ≥ au dernier réservé, et le note. */
export const reserverEnSession: Reserver = (racine, i) => {
  const dernier = reserves.get(racine) ?? 0;
  if (i < dernier) return false;
  reserves.set(racine, i + 1);
  return true;
};

export function oublierReserves(): void {
  reserves.clear();
  arbres.clear();
}

// ---------------------------------------------------------------------------
// Ouvrir, lire
// ---------------------------------------------------------------------------
export function veilleeDe(c: Pick<Coffre, "tour">): VeilleeDuCoffre | null {
  return tourDe(c).veillee ?? null;
}

export function enVeillee(c: Pick<Coffre, "tour">): boolean {
  const w = veilleeDe(c);
  return w !== null && w.v.fin === null;
}

export function sacPlein(w: Pick<VeilleeDuCoffre, "sac">): boolean {
  return w.sac.length >= SAC_PLACES;
}

/**
 * Ouvre la veillée du jour dans le coffre : l'arbre depuis le maître, la preuve
 * de veillée, et l'ascension commencée avec la graine du jour (la même pour tous).
 * `ancre` null : une veillée libre — les mêmes salles, aucune pièce, une lecture.
 */
export function ouvrirVeilleeDansCoffre(
  c: Coffre,
  tete: TeteReseau,
  veille: TeteReseau,
  ancre: { piece: SortieMin; preuve: PreuvePortable; teteAncre?: TeteReseau } | null,
): { ok: true; coffre: Coffre; v: Veillee } | RefusVeillee {
  if (enVeillee(c)) return { ok: false, code: "finie", motif: "une veillée est déjà en cours dans ce coffre" };
  const arbre = construireArbre(graineArbre(c.maitre, tete.idBloc, ancre?.piece ?? null));
  const v = ouvrirVeillee(arbre, tete, veille, ancre);
  if ("erreur" in v) return { ok: false, code: "acte", motif: v.erreur };
  arbres.set(v.racine, arbre);
  const ancreAscension: Ancre | null = v.ancre
    ? { tete: v.ancre.teteAncre, piece: v.ancre.piece, preuve: v.ancre.preuve }
    : null;
  const base = commencerDansCoffre(c, ancreAscension, graineDuJour(tete.idBloc));
  const t = tourDe(base);
  return { ok: true, v, coffre: { ...base, tour: { ...t, veillee: { v, indiceReserve: 0, sac: [] } } } };
}

// ---------------------------------------------------------------------------
// Le sac
// ---------------------------------------------------------------------------
/** Ce que l'acte a ajouté au coffre passe au sac ; le coffre garde ce qu'il avait. */
function auSac(avant: Coffre, apres: Coffre, sac: readonly ObjetPorte[]): { coffre: Coffre; sac: ObjetPorte[]; ajoutes: ObjetPorte[] } {
  const anciens = new Set(avant.objets ?? []);
  const ajoutes = (apres.objets ?? []).filter((o) => !anciens.has(o));
  if (ajoutes.length === 0) return { coffre: apres, sac: [...sac], ajoutes };
  return {
    coffre: { ...apres, objets: (apres.objets ?? []).filter((o) => anciens.has(o)) },
    sac: [...sac, ...ajoutes],
    ajoutes,
  };
}

/** Le sac entre au coffre. */
function verser(c: Coffre, w: VeilleeDuCoffre): { coffre: Coffre; verses: ObjetPorte[] } {
  const t = tourDe(c);
  return {
    coffre: { ...c, objets: [...(c.objets ?? []), ...w.sac], tour: { ...t, veillee: { ...w, sac: [] } } },
    verses: w.sac,
  };
}

/** Le sac est perdu : les gestes restent dans la preuve, les objets ne reviennent pas. */
function perdre(c: Coffre, w: VeilleeDuCoffre): { coffre: Coffre; perdus: ObjetPorte[] } {
  const t = tourDe(c);
  return { coffre: { ...c, tour: { ...t, veillee: { ...w, sac: [] } } }, perdus: w.sac };
}

/** À la fin d'une veillée : sommet et porte versent, épuisé perd, en cours ne fait rien. */
function clore(c: Coffre): { coffre: Coffre; verses: ObjetPorte[]; perdus: ObjetPorte[] } {
  const w = veilleeDe(c);
  if (!w || w.v.fin === null) return { coffre: c, verses: [], perdus: [] };
  if (w.v.fin === "epuise") {
    const p = perdre(c, w);
    return { coffre: p.coffre, verses: [], perdus: p.perdus };
  }
  const v = verser(c, w);
  return { coffre: v.coffre, verses: v.verses, perdus: [] };
}

// ---------------------------------------------------------------------------
// Signer un geste, après l'acte
// ---------------------------------------------------------------------------
function pret(c: Coffre, butin: boolean): { w: VeilleeDuCoffre; arbre: ArbreFeuilles } | RefusVeillee {
  const w = veilleeDe(c);
  if (!w) return { ok: false, code: "aucune", motif: "aucune veillée dans ce coffre" };
  if (w.v.fin !== null) return { ok: false, code: "finie", motif: `veillée finie (${w.v.fin})` };
  if (feuillesRestantes(w.v) <= 0) return { ok: false, code: "vide", motif: "arbre vide : plus une feuille" };
  if (butin && sacPlein(w)) return { ok: false, code: "sac", motif: `sac plein (${SAC_PLACES} places) : franchir, ou s'effacer` };
  const arbre = arbreDuCoffre(c, w.v);
  if (!arbre) return { ok: false, code: "reserve", motif: "l'arbre du coffre n'est pas celui de la veillée" };
  return { w, arbre };
}

function signer(
  c: Coffre,
  w: VeilleeDuCoffre,
  arbre: ArbreFeuilles,
  geste: { g: GesteId; arg: number; mot?: number },
  reserver: Reserver,
): { coffre: Coffre; v: Veillee } | RefusVeillee {
  const i = w.v.gestes.length;
  if (w.indiceReserve > i) {
    return { ok: false, code: "reserve", motif: `feuille ${i} déjà réservée (jauge relue d'avant le geste ${w.indiceReserve - 1})` };
  }
  if (!reserver(w.v.racine, i)) {
    return { ok: false, code: "reserve", motif: `feuille ${i} déjà signée dans cette session : jauge ancienne` };
  }
  // la réserve est notée avant la signature : indiceReserve = i + 1 dans la jauge rendue
  const v = signerGeste(w.v, arbre, geste);
  if ("erreur" in v) return { ok: false, code: v.erreur === "vide" ? "vide" : "acte", motif: `signature refusée (${v.erreur})` };
  const t = tourDe(c);
  return { coffre: { ...c, tour: { ...t, veillee: { ...w, v, indiceReserve: i + 1 } } }, v };
}

/** Acte fait, objets au sac, feuille signée, fin close s'il y a lieu. */
function geste(
  c: Coffre,
  p: { w: VeilleeDuCoffre; arbre: ArbreFeuilles },
  apres: Coffre,
  g: { g: GesteId; arg: number; mot?: number },
  reserver: Reserver,
): GesteOk | RefusVeillee {
  const s0 = auSac(c, apres, p.w.sac);
  const s = signer(s0.coffre, { ...p.w, sac: s0.sac }, p.arbre, g, reserver);
  if ("ok" in s) return s;
  const fin = clore(s.coffre);
  return {
    ok: true,
    coffre: fin.coffre,
    geste: g.g,
    feuilles: feuillesRestantes(s.v),
    fin: s.v.fin,
    ajoutes: s0.ajoutes,
    verses: fin.verses,
    perdus: fin.perdus,
  };
}

/** Parler : honorer l'hôte de la salle courante, puis brûler une feuille. */
export function parlerDansCoffre(c: Coffre, monde: readonly EntreeMonde[] | null, reserver: Reserver = reserverEnSession): GesteOk | RefusVeillee {
  const p = pret(c, true);
  if ("ok" in p) return p;
  const etage = tourDe(c).etage;
  const ages = agesScelles(sceauxDuCoffre(monde, c), c);
  const h = honorerDansCoffre(c, etage, { ages });
  if (!h.ok) return { ok: false, code: "acte", motif: `l'hôte ne s'honore pas (${h.code})`, acte: h };
  return geste(c, p, h.coffre, { g: "parler", arg: etage }, reserver);
}

/** Creuser la case (x, y) de la salle courante, puis brûler une feuille. */
export function creuserDansCoffre(c: Coffre, x: number, y: number, reserver: Reserver = reserverEnSession): GesteOk | RefusVeillee {
  const p = pret(c, true);
  if ("ok" in p) return p;
  const etage = tourDe(c).etage;
  const f = fouillerCaseDansCoffre(c, etage, x, y);
  if (!f.ok) return { ok: false, code: "acte", motif: `la case ne se creuse pas (${f.code})`, acte: f };
  return geste(c, p, f.coffre, { g: "ouvrir", arg: x * DALLE_N + y }, reserver);
}

/** Ouvrir l'alcôve de la salle courante, puis brûler une feuille. */
export function ouvrirAlcoveDansCoffre(c: Coffre, reserver: Reserver = reserverEnSession): GesteOk | RefusVeillee {
  const p = pret(c, true);
  if ("ok" in p) return p;
  const a = ouvrirAlcove(c, tourDe(c).etage);
  if (!a.ok) return { ok: false, code: "acte", motif: `pas d'alcôve à ouvrir (${a.code})`, acte: a };
  return geste(c, p, a.coffre, { g: "ouvrir", arg: ARG_ALCOVE }, reserver);
}

/**
 * Prendre l'occupant k avec la capsule d'indice i. Une prise qui échappe ou se
 * brise a eu lieu : elle coûte sa feuille ; une capsule ou un occupant absents, non.
 */
export function capturerDansCoffre(c: Coffre, k: number, i: number, reserver: Reserver = reserverEnSession): (GesteOk & { prise: PrendreOk | PrendreKo }) | RefusVeillee {
  const p = pret(c, true);
  if ("ok" in p) return p;
  const r = prendreDansCoffre(c, tourDe(c).etage, k, i);
  if (!r.ok && (r.code === "capsule" || r.code === "occupant" || r.code === "pris")) {
    return { ok: false, code: "acte", motif: `rien à prendre (${r.code})`, acte: r };
  }
  const g = geste(c, p, r.coffre, { g: "prendre", arg: k }, reserver);
  if (!g.ok) return g;
  return { ...g, prise: r };
}

/**
 * Franchir : la fin de salle du pendule (choix décidé ou lu), puis la feuille.
 * Une porte fermée n'est pas franchie : la veillée s'arrête en `porte`, rien n'est
 * brûlé, le sac est versé. La 26ᵉ feuille de franchir est le sommet : l'ascension
 * est close avec elle et le sac versé.
 */
export function franchirDansCoffre(
  c: Coffre,
  monde: readonly EntreeMonde[] | null,
  decision: Choix | null = null,
  reserver: Reserver = reserverEnSession,
): (GesteOk & { etage: number }) | RefusVeillee {
  const p = pret(c, false);
  if ("ok" in p) return p;
  const avant = tourDe(c);
  const mot = avant.porte ?? 0;
  const r = finDeSalleDansCoffre(c, monde, decision);
  if (!r.ok) return { ok: false, code: "ascension", motif: `pas de salle à finir (${r.code})` };
  if (r.fin === "porte") {
    const t = tourDe(r.coffre);
    const v = arreterVeillee(p.w.v, "porte");
    const fin = clore({ ...r.coffre, tour: { ...t, veillee: { ...p.w, v } } });
    return {
      ok: true,
      coffre: fin.coffre,
      geste: "franchir",
      feuilles: feuillesRestantes(v),
      fin: "porte",
      etage: r.etage,
      ajoutes: [],
      verses: fin.verses,
      perdus: [],
    };
  }
  if (r.fin === "sommet") {
    return { ok: false, code: "ascension", motif: "la dernière salle n'a pas de fin à signer" };
  }
  const s0 = auSac(c, r.coffre, p.w.sac);
  const s = signer(s0.coffre, { ...p.w, sac: s0.sac }, p.arbre, { g: "franchir", arg: CHOIX.indexOf(r.choix), mot }, reserver);
  if ("ok" in s) return s;
  let coffre = s.coffre;
  const parcours = parcoursDe(s.v);
  if (parcours.etage !== r.etage) {
    return { ok: false, code: "ascension", motif: `parcours ${parcours.etage} ≠ ascension ${r.etage} : graines différentes` };
  }
  if (s.v.fin === "sommet") {
    const clos = finDeSalleDansCoffre(coffre, monde, null);
    if (clos.ok) coffre = clos.coffre;
  }
  const fin = clore(coffre);
  return {
    ok: true,
    coffre: fin.coffre,
    geste: "franchir",
    feuilles: feuillesRestantes(s.v),
    fin: s.v.fin,
    etage: r.etage,
    ajoutes: s0.ajoutes,
    verses: fin.verses,
    perdus: fin.perdus,
  };
}

/** S'effacer : la veillée s'arrête en `abandon`, le sac est versé, la preuve exportable telle quelle. */
export function abandonnerVeilleeDansCoffre(c: Coffre): Coffre {
  const w = veilleeDe(c);
  if (!w || w.v.fin !== null) return c;
  const t = tourDe(c);
  return clore({ ...c, tour: { ...t, veillee: { ...w, v: arreterVeillee(w.v, "abandon") } } }).coffre;
}

export function effacerVeilleeDansCoffre(c: Coffre): Coffre {
  const t = tourDe(c);
  return { ...c, tour: { ...t, veillee: null } };
}

/** La preuve exportable : finie, ancrée, et d'un coffre personnel (l'atelier joue, il n'exporte pas). */
export function exporterVeilleeDuCoffre(c: Pick<Coffre, "tour" | "nature">): Veillee | RefusVeillee {
  const w = veilleeDe(c);
  if (!w) return { ok: false, code: "aucune", motif: "aucune veillée" };
  if (w.v.fin === null) return { ok: false, code: "finie", motif: "veillée en cours" };
  if (!w.v.ancre) return { ok: false, code: "libre", motif: "veillée libre : une lecture, rien à exporter" };
  if (c.nature === "atelier") return { ok: false, code: "atelier", motif: "coffre d'atelier : une démonstration, rien à exporter" };
  return w.v;
}
