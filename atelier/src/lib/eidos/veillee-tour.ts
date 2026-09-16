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
 * sac de quatre-vingt-une places (neuf par salle, la dalle entière), noté dans
 * la jauge. Le sommet, une
 * porte fermée ou l'effacement volontaire **versent** le sac au coffre ;
 * l'arbre épuisé **le perd** : les gestes restent dans la preuve, les objets
 * ne reviennent pas. C'est le dilemme de la parcimonie : brûler la dernière
 * feuille coûte le butin. Un sac plein refuse les gestes de butin, jamais
 * franchir. Ce qu'on porte vient du coffre ; ce qu'on trouve va au sac.
 *
 * **La bataille.** Une salle dont un occupant reste est **tenue** : le butin
 * (parler, creuser, ouvrir) y est refusé tant qu'un Indéchiffré la tient,
 * jamais franchir ; prendre y passe — la capsule est l'autre façon de vider
 * une salle, un occupant pris n'entre pas en lice. Le coffre ouvre la bataille avec un à trois de ses
 * objets (`ouvrirBatailleDansCoffre`) ; elle vit dans la jauge, **rejouée**
 * depuis son ouverture à chaque lecture (`batailleDansCoffre`), jamais gardée
 * en état. Se déplacer, passer et rendre la main sont gratuits ; **frapper
 * brûle une feuille** (A17 : un coup, une feuille), l'acte d'abord — le moteur
 * peut refuser — la feuille ensuite, comme les quatre autres gestes. Gagnée,
 * les occupants abattus ne reviennent pas (`tour.abattus`) et la salle se lit.
 * Perdue en veillée **ancrée**, la **première unité du coffre tombée** (riposte
 * comprise, A28) quitte le coffre : le seul puits du jeu ; rien en libre, rien
 * à la victoire. Épuisée, l'arbre est vide : la veillée l'est aussi, le sac
 * est perdu. Tant qu'une bataille est ouverte, franchir et le butin attendent ;
 * s'effacer la compte perdue. Passé `TOURS_MAX` passages de main sans issue,
 * elle est **enlisée** : on peut franchir, la salle reste tenue, rien n'est
 * perdu — le banc comptait 29 ‰ de telles nulles, elles ne bloquent personne.
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
 * Effacer une veillée en cours (sans l'abandonner) perd son sac. Une bataille
 * finie ne se rejoue plus (ses indices ne valent plus après une tombée) : ses
 * conséquences sont dans la jauge et le coffre, c'est elles qui comptent. La
 * preuve ne porte que les coups (leur feuille, leur ordre) : le rejeu de la
 * bataille par le juge est la PR 6. Fuir une bataille (V3) n'existe pas.
 */

import {
  commencerDansCoffre,
  finDeSalleDansCoffre,
  type Ancre,
} from "./ascension.ts";
import { occupantsRestants, prendreDansCoffre, type PrendreKo, type PrendreOk } from "./capsules.ts";
import { fouillerCaseDansCoffre, type FouilleKo, type FouilleOk } from "./fouilles.ts";
import { hexOf } from "./hash.ts";
import { honorerDansCoffre, type Honorer } from "./hotes.ts";
import { tourDe } from "./jauge.ts";
import type { PreuvePortable, SortieMin } from "./merkle.ts";
import { CHOIX, ETAPES, type Choix } from "./pendule.ts";
import { agesScelles, sceauxDuCoffre, type EntreeMonde } from "./sceaux.ts";
import { ouvrirAlcove, type AlcoveKo, type AlcoveOk } from "./secrets.ts";
import { TOURS_MAX } from "./tactique/ia.ts";
import { jouerActe, ouvrirPartie, passerLaMain, type Partie } from "./tactique/partie.ts";
import type { Acte, Coup, Issue } from "./tactique/types.ts";
import type { TeteReseau } from "./temoin.ts";
import { DALLE_N } from "./tour.ts";
import type { Coffre, ObjetPorte } from "./types.ts";
import {
  argFrapper,
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
  /** la bataille de la salle courante, ouverte ou finie ; null sans bataille */
  bataille: BatailleDuCoffre | null;
};

/** Un acte de bataille tel que la jauge le note : ceux du moteur, et « main », le passage de main. */
export type ActeDeBataille = Acte | { readonly geste: "main" };

/**
 * La bataille dans la jauge : de quoi la rejouer depuis son ouverture — l'étage,
 * les objets du coffre en lice (par indice dans `coffre.objets`), les feuilles à
 * l'ouverture, les actes dans l'ordre — jamais son état. Finie, elle porte son
 * issue et ne se rejoue plus.
 */
export type BatailleDuCoffre = {
  etape: number;
  etage: number;
  indices: number[];
  feuilles: number;
  actes: ActeDeBataille[];
  fin: Issue | null;
  tour: number | null;
};

/**
 * Le sac : la dalle entière, 9² = 81 places — neuf par salle depuis A18 (neuf
 * salles), trois par salle quand il y en avait vingt-sept. Écrit en DALLE_N²
 * et non en multiple d'ETAPES : un sac qui déborde refuse le butin, et changer
 * le nombre de salles ne doit pas rétrécir le sac sans décision.
 */
export const SAC_PLACES = DALLE_N * DALLE_N;

/** L'alcôve n'a pas de case : son argument est hors de la dalle. */
export const ARG_ALCOVE = DALLE_N * DALLE_N;

export type RefusVeillee = {
  ok: false;
  code: "aucune" | "finie" | "vide" | "reserve" | "atelier" | "libre" | "sac" | "acte" | "ascension" | "tenue" | "bataille";
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
  return { ok: true, v, coffre: { ...base, tour: { ...t, veillee: { v, indiceReserve: 0, sac: [], bataille: null } } } };
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
function pret(
  c: Coffre,
  butin: boolean,
  o: { enBataille?: boolean; malgreTenue?: boolean } = {},
): { w: VeilleeDuCoffre; arbre: ArbreFeuilles } | RefusVeillee {
  const w = veilleeDe(c);
  if (!w) return { ok: false, code: "aucune", motif: "aucune veillée dans ce coffre" };
  if (w.v.fin !== null) return { ok: false, code: "finie", motif: `veillée finie (${w.v.fin})` };
  if (feuillesRestantes(w.v) <= 0) return { ok: false, code: "vide", motif: "arbre vide : plus une feuille" };
  if (!o.enBataille && batailleOuverte(c) && !batailleEnlisee(c)) {
    return { ok: false, code: "bataille", motif: "une bataille est ouverte : elle se finit d'abord" };
  }
  if (butin && !o.malgreTenue && salleTenue(c)) {
    return { ok: false, code: "tenue", motif: "salle tenue : un Indéchiffré la garde, le butin attend la bataille" };
  }
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
 * La capsule est l'autre façon de vider une salle tenue : prendre y passe tant
 * qu'aucune bataille n'est ouverte — sinon un abattu ne se prendrait jamais et
 * la capsule ne servirait plus en veillée. Un occupant pris n'entre pas en lice.
 */
export function capturerDansCoffre(c: Coffre, k: number, i: number, reserver: Reserver = reserverEnSession): (GesteOk & { prise: PrendreOk | PrendreKo }) | RefusVeillee {
  const p = pret(c, true, { malgreTenue: true });
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
  // la bataille de la salle quittée — finie, ou enlisée — ne suit pas
  const s = signer(s0.coffre, { ...p.w, sac: s0.sac, bataille: null }, p.arbre, { g: "franchir", arg: CHOIX.indexOf(r.choix), mot }, reserver);
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

/** S'effacer : la veillée s'arrête en `abandon`, le sac est versé, la preuve exportable telle quelle.
 *  Une bataille ouverte est comptée perdue (sa première tombée quitte le coffre en ancré) ; enlisée, rien. */
export function abandonnerVeilleeDansCoffre(c: Coffre): Coffre {
  const w = veilleeDe(c);
  if (!w || w.v.fin !== null) return c;
  let coffre = c;
  const r = batailleDansCoffre(c);
  if (r && !batailleEnlisee(c)) {
    coffre = consequences(c, r.b, { issue: "defaite", tour: r.partie.etat.tour }, r.partie.etat.journal).coffre;
  }
  const w2 = veilleeDe(coffre)!;
  const t = tourDe(coffre);
  return clore({ ...coffre, tour: { ...t, veillee: { ...w2, v: arreterVeillee(w2.v, "abandon") } } }).coffre;
}

// ---------------------------------------------------------------------------
// La bataille : la salle tenue, l'acte d'abord, la feuille ensuite
// ---------------------------------------------------------------------------
/** La salle est tenue tant qu'un occupant y reste (ni pris, ni abattu) : le butin attend, franchir passe. */
export function salleTenue(c: Pick<Coffre, "tour">): boolean {
  return occupantsRestants(c, tourDe(c).etage).length > 0;
}

export function batailleOuverte(c: Pick<Coffre, "tour">): boolean {
  const w = veilleeDe(c);
  return w !== null && w.bataille !== null && w.bataille.fin === null;
}

/** Passages de main d'une bataille : ce que `TOURS_MAX` borne. */
export function mainsDe(b: Pick<BatailleDuCoffre, "actes">): number {
  return b.actes.filter((a) => a.geste === "main").length;
}

/** Enlisée : `TOURS_MAX` passages de main sans issue. On peut franchir ; la salle reste tenue ; rien n'est perdu. */
export function batailleEnlisee(c: Pick<Coffre, "tour">): boolean {
  const w = veilleeDe(c);
  return w !== null && w.bataille !== null && w.bataille.fin === null && mainsDe(w.bataille) >= TOURS_MAX;
}

/**
 * Rejoue la bataille ouverte de la jauge depuis son ouverture — le coffre tel
 * qu'il est, les occupants restants, les actes dans l'ordre. `null` : aucune
 * bataille ouverte, ou une bataille absurde (le coffre a changé sous elle, un
 * acte ne se rejoue pas, le compte de feuilles ne suit pas la veillée).
 */
export function batailleDansCoffre(c: Coffre): { partie: Partie; b: BatailleDuCoffre } | null {
  const w = veilleeDe(c);
  if (!w || !w.bataille || w.bataille.fin !== null) return null;
  const b = w.bataille;
  try {
    let partie = ouvrirPartie(c, b.etage, b.indices, b.feuilles);
    for (const a of b.actes) partie = a.geste === "main" ? passerLaMain(partie) : jouerActe(partie, a);
    if (partie.etat.fin === null && partie.etat.feuilles !== feuillesRestantes(w.v)) return null;
    return { partie, b };
  } catch {
    return null;
  }
}

export type CoupOk = {
  ok: true;
  coffre: Coffre;
  partie: Partie;
  /** vrai si l'acte a brûlé une feuille (un coup du coffre) */
  signe: boolean;
  feuilles: number;
  fin: Veillee["fin"];
  /** l'issue si cet acte a fini la bataille */
  issue: Issue | null;
  /** occupants abattus notés à la victoire */
  abattus: number[];
  /** l'unité du coffre tombée et retirée à la défaite, en veillée ancrée */
  tombee: ObjetPorte | null;
  verses: ObjetPorte[];
  perdus: ObjetPorte[];
};

function noterBataille(c: Coffre, b: BatailleDuCoffre): Coffre {
  const t = tourDe(c);
  const w = veilleeDe(c)!;
  return { ...c, tour: { ...t, veillee: { ...w, bataille: b } } };
}

/** La première unité du coffre tombée, riposte comprise : son rang en lice, ou null. */
export function premiereTombee(journal: readonly Coup[], nCoffre: number): number | null {
  const coup = journal.find((k) => k.retiree && k.cible < nCoffre);
  return coup === undefined ? null : coup.cible;
}

/** Ce qu'une issue fait au coffre : les abattus (victoire), la première tombée (défaite ancrée), rien d'autre. */
function consequences(
  c: Coffre,
  b: BatailleDuCoffre,
  fin: { issue: Issue; tour: number },
  journal: readonly Coup[],
): { coffre: Coffre; abattus: number[]; tombee: ObjetPorte | null } {
  let coffre = c;
  let abattus: number[] = [];
  let tombee: ObjetPorte | null = null;
  const w = veilleeDe(c)!;
  if (fin.issue === "victoire") {
    abattus = occupantsRestants(coffre, b.etage).map((o) => o.k);
    const t = tourDe(coffre);
    coffre = { ...coffre, tour: { ...t, abattus: [...t.abattus, ...abattus.map((k): [number, number] => [b.etage, k])] } };
  } else if (fin.issue === "defaite" && w.v.ancre !== null) {
    const rang = premiereTombee(journal, b.indices.length);
    const idx = rang === null ? undefined : b.indices[rang];
    if (idx !== undefined && (coffre.objets ?? [])[idx] !== undefined) {
      tombee = (coffre.objets ?? [])[idx]!;
      coffre = { ...coffre, objets: (coffre.objets ?? []).filter((_, i) => i !== idx) };
    }
  }
  coffre = noterBataille(coffre, { ...b, fin: fin.issue, tour: fin.tour });
  return { coffre, abattus, tombee };
}

/** Après un acte : l'issue s'il y en a une, la fin de veillée s'il y a lieu (épuisé perd le sac). */
function conclure(c: Coffre, partie: Partie, signe: boolean): CoupOk {
  const w = veilleeDe(c)!;
  const b = w.bataille!;
  let coffre = c;
  let abattus: number[] = [];
  let tombee: ObjetPorte | null = null;
  if (partie.etat.fin !== null) {
    const r = consequences(c, b, partie.etat.fin, partie.etat.journal);
    coffre = r.coffre;
    abattus = r.abattus;
    tombee = r.tombee;
  }
  const clos = clore(coffre);
  const v = veilleeDe(clos.coffre)!.v;
  return {
    ok: true,
    coffre: clos.coffre,
    partie,
    signe,
    feuilles: feuillesRestantes(v),
    fin: v.fin,
    issue: partie.etat.fin?.issue ?? null,
    abattus,
    tombee,
    verses: clos.verses,
    perdus: clos.perdus,
  };
}

/**
 * Ouvre la bataille de la salle tenue : le coffre choisit un à trois objets
 * (`indices` dans `coffre.objets`), les Indéchiffrés sont les occupants restants,
 * les feuilles celles qui restent à l'arbre. Rien n'est signé à l'ouverture.
 */
export function ouvrirBatailleDansCoffre(c: Coffre, indices: readonly number[]): CoupOk | RefusVeillee {
  const p = pret(c, false);
  if ("ok" in p) return p;
  if (batailleOuverte(c)) return { ok: false, code: "bataille", motif: "une bataille est déjà ouverte dans cette salle" };
  if (!salleTenue(c)) return { ok: false, code: "acte", motif: "salle libre : personne à combattre" };
  const t = tourDe(c);
  const feuilles = feuillesRestantes(p.w.v);
  let partie: Partie;
  try {
    partie = ouvrirPartie(c, t.etage, indices, feuilles);
  } catch (e) {
    return { ok: false, code: "acte", motif: `la bataille ne s'ouvre pas (${e instanceof Error ? e.message : String(e)})` };
  }
  const b: BatailleDuCoffre = {
    etape: parcoursDe(p.w.v).etape,
    etage: t.etage,
    indices: [...indices],
    feuilles,
    actes: [],
    fin: null,
    tour: null,
  };
  return conclure(noterBataille(c, b), partie, false);
}

/**
 * Un acte du coffre en bataille. Se déplacer et passer sont gratuits ; frapper
 * brûle une feuille — l'acte d'abord (le moteur peut refuser), la feuille
 * ensuite, réserve d'indice avant la signature, comme les quatre autres gestes.
 */
export function jouerDansBataille(c: Coffre, acte: Acte, reserver: Reserver = reserverEnSession): CoupOk | RefusVeillee {
  const r = batailleDansCoffre(c);
  if (!r) return { ok: false, code: "bataille", motif: "aucune bataille ouverte à jouer" };
  if (acte.geste !== "frapper") {
    let partie: Partie;
    try {
      partie = jouerActe(r.partie, acte);
    } catch (e) {
      return { ok: false, code: "acte", motif: `le moteur refuse (${e instanceof Error ? e.message : String(e)})` };
    }
    return conclure(noterBataille(c, { ...r.b, actes: [...r.b.actes, acte] }), partie, false);
  }
  const p = pret(c, false, { enBataille: true });
  if ("ok" in p) return p;
  let partie: Partie;
  try {
    partie = jouerActe(r.partie, acte);
  } catch (e) {
    return { ok: false, code: "acte", motif: `le moteur refuse (${e instanceof Error ? e.message : String(e)})` };
  }
  const b: BatailleDuCoffre = { ...r.b, actes: [...r.b.actes, acte] };
  const s = signer(noterBataille(c, b), { ...p.w, bataille: b }, p.arbre, { g: "frapper", arg: argFrapper(acte.unite, acte.cible) }, reserver);
  if ("ok" in s) return s;
  return conclure(s.coffre, partie, true);
}

/** Rendre la main : les Indéchiffrés jouent, la main revient. Gratuit — rien ne se signe. */
export function passerLaMainDansBataille(c: Coffre): CoupOk | RefusVeillee {
  const r = batailleDansCoffre(c);
  if (!r) return { ok: false, code: "bataille", motif: "aucune bataille ouverte" };
  let partie: Partie;
  try {
    partie = passerLaMain(r.partie);
  } catch (e) {
    return { ok: false, code: "acte", motif: `le moteur refuse (${e instanceof Error ? e.message : String(e)})` };
  }
  return conclure(noterBataille(c, { ...r.b, actes: [...r.b.actes, { geste: "main" }] }), partie, false);
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
