/**
 * La partie — ce qu'une page fait d'une bataille : ouvrir, lire, jouer, passer.
 *
 * Le moteur (`bataille.ts`) rejoue et ne croit rien ; la politique (`ia.ts`)
 * annonce et joue les Indéchiffrés ; ce module tient **la main du joueur** et
 * rien d'autre. Il ne connaît ni React ni three : tout ce qu'une scène
 * affiche est une `Lecture` entière, calculée ici, contrôlée par
 * `partie.test.ts`, et la page ne fait que la peindre.
 *
 * Ce qui entre en bataille :
 *   - le coffre : ses **objets** — tout ce qui porte un mot, hors élixirs et
 *     capsules — au plus `MAX_COFFRE` choisis par le joueur, posés sur la
 *     rangée du bas, du centre vers les bords, sur la première case libre ;
 *   - les Indéchiffrés : les **occupants restants** de l'étage (`capsules.ts`),
 *     chacun à sa case d'occupant (`fouilles.ts`), ou la case libre la plus
 *     proche si la sienne est pleine. Le critère « aucune forme du catalogue
 *     n'est assez proche » (`SPEC_TACTIQUE.md` §6) n'est pas codé : ici,
 *     chaque occupant qui reste se tient comme un Indéchiffré — une figure.
 *
 * Une partie libre simule l'arbre entier de la Veillée (`FEUILLES`, 64
 * feuilles) sans en signer aucune : le compte descend, rien ne s'écrit. Le
 * branchement réel — feuilles = coups signés, sac, permadeath — est la PR 5
 * de `SPEC_TACTIQUE.md`, pas celle-ci.
 *
 * Tout est entier, rien n'est tiré, rien n'est daté. Les actes du coffre sont
 * gardés dans l'ordre : `rejouer` les refait à l'identique, `traceBataille`
 * le contrôle.
 *
 * AVERTISSEMENT : une partie est une jauge. Elle ne touche ni le carnet, ni
 * la chaîne, ni le coffre lui-même — elle le lit. Rien n'est ancré, rien n'est
 * exporté tant que R2 n'est pas tenue (feuille de route, C4 / C2 bis).
 */

import { captureDe, occupantsRestants } from "../capsules.ts";
import { ficheDe } from "../fiche.ts";
import { caseOccupant } from "../fouilles.ts";
import { objetDePorte } from "../inventaire.ts";
import { dalleDe, etageDe } from "../tour.ts";
import type { Coffre, ObjetPorte } from "../types.ts";
import { FEUILLES } from "../veillee.ts";
import {
  actesPossibles,
  finDePhase,
  jouer,
  ordreDePhase,
  ouvrirBataille,
  resoudreCoup,
  riposteDe,
  traceBataille,
} from "./bataille.ts";
import {
  accessibles,
  chemin,
  cible as ciblesDe,
  cle,
  dansGrille,
  estObstacle,
  memeCase,
  zoneDeControle,
} from "./grille.ts";
import { annoncer, jouerPhase } from "./ia.ts";
import { pas, portee, tenueMax, uniteDepuisObjet, vivante } from "./unite.ts";
import {
  GRILLE_N,
  RejetTactique,
  type Acte,
  type Camp,
  type Case,
  type Coup,
  type EtatBataille,
  type Fin,
  type Intention,
  type Unite,
} from "./types.ts";

/** Unités du coffre en lice, au plus. Trois : la dalle est un couloir, pas une plaine. */
export const MAX_COFFRE = 3;

/** Feuilles d'une partie libre : l'arbre entier, simulé. */
export const FEUILLES_LIBRES = FEUILLES;

/** Coups montrés au journal de la page, les derniers d'abord. */
export const JOURNAL_VISIBLE = 8;

/** Rangée de pose du coffre : le bas de la dalle, comme on entre dans une salle. */
export const RANGEE_COFFRE = GRILLE_N - 1;

// ---------------------------------------------------------------------------
// Ce qui entre en bataille
// ---------------------------------------------------------------------------

export type Combattant = { readonly indice: number; readonly objet: ObjetPorte };

/** Les objets du coffre qui se battent : un mot, hors élixirs et capsules. Ordre du coffre. */
export function combattants(c: Pick<Coffre, "objets">): Combattant[] {
  const objets = c.objets ?? [];
  const out: Combattant[] = [];
  objets.forEach((objet, indice) => {
    if (objet.genre === "elixir" || objet.genre === "capsule") return;
    out.push({ indice, objet });
  });
  return out;
}

/**
 * La case libre la plus proche de `voulue` : ni pleine, ni déjà prise. À
 * distance égale, la plus haute (y) puis la plus à gauche (x) : le même
 * balayage à chaque appel. Lève si la dalle n'a plus une case.
 */
export function caseLibre(
  obstacles: readonly (readonly boolean[])[],
  prises: readonly Case[],
  voulue: Case,
): Case {
  if (!dansGrille(voulue))
    throw new RejetTactique(`case voulue (${voulue.x},${voulue.y}) hors de la dalle`);
  let meilleure: Case | null = null;
  let meilleur = Number.MAX_SAFE_INTEGER;
  for (let y = 0; y < GRILLE_N; y++) {
    for (let x = 0; x < GRILLE_N; x++) {
      const c = { x, y };
      if (estObstacle(obstacles, c) || prises.some((p) => memeCase(p, c))) continue;
      const d = Math.abs(x - voulue.x) + Math.abs(y - voulue.y);
      if (d < meilleur) {
        meilleur = d;
        meilleure = c;
      }
    }
  }
  if (meilleure === null) throw new RejetTactique("dalle pleine au lieu d'une case libre au moins");
  return meilleure;
}

/** Les cases de pose du coffre, du centre du bas vers les bords : 4, 3, 5, 2, 6, 1, 7, 0, 8. */
export function posesDuCoffre(n: number): Case[] {
  const mid = (GRILLE_N - 1) >> 1;
  const out: Case[] = [];
  for (let i = 0; out.length < n && i < GRILLE_N; i++) {
    const x = i === 0 ? mid : i % 2 === 1 ? mid - ((i + 1) >> 1) : mid + (i >> 1);
    out.push({ x, y: RANGEE_COFFRE });
  }
  return out;
}

/**
 * L'armée du coffre : les objets d'indices `indices`, dans cet ordre, chacun
 * lu une fois (`ficheDe` pour la classe, `combatDe` pour les axes). Refuse un
 * indice qui n'est pas un combattant, un doublon, ou plus de `MAX_COFFRE`.
 */
export function armeeDuCoffre(
  c: Pick<Coffre, "objets">,
  etage: number,
  indices: readonly number[],
): Unite[] {
  if (indices.length === 0) throw new RejetTactique("0 unité au lieu de 1 au moins");
  if (indices.length > MAX_COFFRE)
    throw new RejetTactique(`${indices.length} unités au lieu de ${MAX_COFFRE} au plus`);
  const vus = new Set<number>();
  const lisibles = combattants(c);
  const obstacles = dalleDe(etage);
  const poses = posesDuCoffre(indices.length);
  const prises: Case[] = [];
  const out: Unite[] = [];
  indices.forEach((indice, rang) => {
    if (vus.has(indice)) throw new RejetTactique(`objet ${indice} deux fois au lieu d'une`);
    vus.add(indice);
    const combattant = lisibles.find((x) => x.indice === indice);
    if (combattant === undefined)
      throw new RejetTactique(`objet ${indice} au lieu d'un combattant du coffre`);
    const pos = caseLibre(obstacles, prises, poses[rang]!);
    prises.push(pos);
    out.push(uniteDe(combattant.objet, rang, "coffre", pos));
  });
  return out;
}

/**
 * Les Indéchiffrés de l'étage : ses occupants restants, à leur case ou la
 * libre la plus proche, hors des cases `reservees` (celles du coffre).
 */
export function indechiffresDe(
  c: Pick<Coffre, "objets" | "tour">,
  etage: number,
  reservees: readonly Case[] = [],
): Unite[] {
  const e = etageDe(etage);
  const obstacles = dalleDe(e);
  const prises: Case[] = [...reservees];
  const out: Unite[] = [];
  for (const o of occupantsRestants(c, e)) {
    const pos = caseLibre(obstacles, prises, caseOccupant(o.k));
    prises.push(pos);
    out.push(uniteDe(captureDe(o, e, 0), out.length, "indechiffre", pos));
  }
  return out;
}

function uniteDe(objet: ObjetPorte, id: number, camp: Camp, pos: Case): Unite {
  return uniteDepuisObjet(objetDePorte(objet), id, camp, pos, ficheDe(objet).forme.classe);
}

// ---------------------------------------------------------------------------
// La partie
// ---------------------------------------------------------------------------

export type Partie = {
  readonly etage: number;
  readonly etat: EtatBataille;
  /** Les actes du coffre, dans l'ordre : de quoi rejouer. */
  readonly actes: readonly Acte[];
  /** Passages de main consommés. */
  readonly phases: number;
  /** Unité désignée par le joueur, ou aucune. */
  readonly selection: number | null;
  /** `traceBataille(etat)` : l'empreinte de l'échiquier courant. */
  readonly trace: string;
};

function avecEtat(p: Partie, etat: EtatBataille, patch: Partial<Partie> = {}): Partie {
  return { ...p, ...patch, etat, trace: traceBataille(etat) };
}

/**
 * Ouvre une partie sur l'étage : le coffre (`indices`) contre les occupants
 * restants, télégraphie posée. Lève `RejetTactique` si l'étage n'a plus
 * d'occupant — il n'y a alors personne à combattre.
 */
export function ouvrirPartie(
  c: Pick<Coffre, "objets" | "tour">,
  etage: number,
  indices: readonly number[],
  feuilles: number = FEUILLES_LIBRES,
): Partie {
  const e = etageDe(etage);
  const coffre = armeeDuCoffre(c, e, indices);
  const indechiffres = indechiffresDe(
    c,
    e,
    coffre.map((u) => u.pos),
  );
  if (indechiffres.length === 0)
    throw new RejetTactique(`étage ${e} sans occupant au lieu d'un Indéchiffré au moins`);
  const etat = annoncer(ouvrirBataille(e, coffre, indechiffres, feuilles));
  const premiere = ordreDePhase(etat)[0] ?? null;
  return avecEtat({ etage: e, etat, actes: [], phases: 0, selection: premiere, trace: "" }, etat);
}

/** Désigne une unité du coffre, ou aucune. Une unité inconnue ou tombée : aucune. */
export function choisir(p: Partie, id: number | null): Partie {
  if (id === null) return { ...p, selection: null };
  const u = p.etat.unites.find((x) => x.id === id);
  if (u === undefined || u.camp !== "coffre" || !vivante(u)) return { ...p, selection: null };
  return { ...p, selection: id };
}

/**
 * Joue un acte du coffre. Le moteur refuse ce qui n'est pas permis
 * (`RejetTactique`, laissé passer tel quel). L'acte est gardé pour le rejeu ;
 * la sélection reste sur l'unité tant qu'elle a un point d'action, sinon
 * passe à la suivante de l'ordre de phase qui en a encore.
 */
export function jouerActe(p: Partie, acte: Acte): Partie {
  if (p.etat.phase !== "coffre") throw new RejetTactique(`phase ${p.etat.phase} au lieu de coffre`);
  const etat = jouer(p.etat, acte);
  const actes = [...p.actes, acte];
  const u = etat.unites.find((x) => x.id === acte.unite);
  const garde = u !== undefined && vivante(u) && u.pa > 0 && etat.fin === null;
  const selection = garde ? acte.unite : (prochaineAJouer(etat) ?? null);
  return avecEtat(p, etat, { actes, selection });
}

/** La première unité du coffre, dans l'ordre de phase, qui a encore un point d'action. */
export function prochaineAJouer(etat: EtatBataille): number | undefined {
  if (etat.fin !== null || etat.phase !== "coffre") return undefined;
  return ordreDePhase(etat, "coffre").find((id) => {
    const u = etat.unites.find((x) => x.id === id);
    return u !== undefined && u.pa > 0;
  });
}

/** Vrai quand plus aucune unité du coffre n'a de point d'action : passer la main est le seul geste. */
export function coffreAJoue(etat: EtatBataille): boolean {
  return prochaineAJouer(etat) === undefined;
}

/**
 * Passe la main : la phase des Indéchiffrés se joue d'un trait (politique,
 * unité par unité, sur l'état courant), puis la main revient au coffre et la
 * télégraphie du tour suivant s'affiche. Deux passages de main, ou un seul si
 * la bataille finit pendant la phase adverse. Rien si la bataille est finie.
 */
export function passerLaMain(p: Partie): Partie {
  if (p.etat.fin !== null) return p;
  if (p.etat.phase !== "coffre") throw new RejetTactique(`phase ${p.etat.phase} au lieu de coffre`);
  let etat = finDePhase(p.etat);
  let phases = p.phases + 1;
  etat = jouerPhase(etat);
  if (etat.fin === null) {
    etat = finDePhase(etat);
    phases += 1;
  }
  etat = annoncer(etat);
  return avecEtat(p, etat, { phases, selection: prochaineAJouer(etat) ?? null });
}

// ---------------------------------------------------------------------------
// La lecture — tout ce qu'une scène montre, calculé une fois, entier
// ---------------------------------------------------------------------------

export type LectureCase = {
  readonly x: number;
  readonly y: number;
  /** Case pleine : un obstacle. */
  readonly pleine: boolean;
  /** Coût en pas depuis l'unité désignée, `null` si hors d'atteinte ce tour. */
  readonly cout: number | null;
  /** Sur le chemin de l'aperçu (`vers`), case d'arrivée comprise. */
  readonly chemin: boolean;
  /** Tenue par un Indéchiffré : y entrer arrête le déplacement du coffre. */
  readonly controle: boolean;
  /** Couverte par une intention annoncée. */
  readonly menace: boolean;
};

export type LectureUnite = {
  readonly id: number;
  readonly camp: Camp;
  readonly pos: Case;
  readonly mot: number;
  readonly archetype: Unite["archetype"];
  readonly tenue: number;
  readonly tenueMax: number;
  readonly pa: number;
  readonly pas: number;
  readonly portee: number;
  readonly axes: Unite["axes"];
  readonly vivante: boolean;
  /** Désignée par le joueur. */
  readonly elue: boolean;
  /** Frappable par l'unité désignée, avec le coup tel qu'il porterait. */
  readonly coup: Coup | null;
  /** La riposte que ce coup appellerait, `null` si aucune. */
  readonly riposte: Coup | null;
};

export type Lecture = {
  readonly etage: number;
  readonly tour: number;
  readonly phase: Camp;
  readonly feuilles: number;
  readonly fin: Fin | null;
  readonly selection: number | null;
  readonly cases: readonly (readonly LectureCase[])[];
  readonly unites: readonly LectureUnite[];
  readonly intentions: readonly Intention[];
  /** Les derniers coups du journal, le plus récent d'abord. */
  readonly journal: readonly Coup[];
  /** Les actes permis à l'unité désignée, ordre canonique. */
  readonly actes: readonly Acte[];
  /** Plus rien à jouer pour le coffre : passer la main. */
  readonly aJoue: boolean;
};

/**
 * Lit la partie pour une scène. `vers` : la case survolée, pour l'aperçu du
 * chemin. Tout ce qui est montré est déduit du moteur — rien n'est estimé.
 */
export function lire(p: Partie, vers: Case | null = null): Lecture {
  const etat = p.etat;
  const vivantes = etat.unites.filter(vivante);
  const elue =
    p.selection === null ? undefined : etat.unites.find((u) => u.id === p.selection && vivante(u));
  const joueur = etat.phase === "coffre" && etat.fin === null;

  const couts =
    elue !== undefined && joueur && elue.pa > 0
      ? accessibles(etat.obstacles, vivantes, elue, pas(elue))
      : new Map<string, number>();
  const trajet =
    elue !== undefined && joueur && vers !== null && dansGrille(vers) && couts.has(cle(vers))
      ? new Set(chemin(etat.obstacles, vivantes, elue, vers, pas(elue)).map(cle))
      : new Set<string>();
  const controle = new Set(zoneDeControle(vivantes, "coffre").map(cle));
  const menace = new Set(etat.intentions.flatMap((i) => i.menace.map(cle)));

  const cases: LectureCase[][] = [];
  for (let y = 0; y < GRILLE_N; y++) {
    const ligne: LectureCase[] = [];
    for (let x = 0; x < GRILLE_N; x++) {
      const k = cle({ x, y });
      const cout = couts.get(k);
      ligne.push({
        x,
        y,
        pleine: estObstacle(etat.obstacles, { x, y }),
        cout: cout === undefined || cout === 0 ? null : cout,
        chemin: trajet.has(k),
        controle: controle.has(k),
        menace: menace.has(k),
      });
    }
    cases.push(ligne);
  }

  const frappables = new Set(
    elue !== undefined && joueur && elue.pa > 0 && etat.feuilles > 0
      ? ciblesDe(vivantes, elue, portee(elue)).map((u) => u.id)
      : [],
  );
  const unites: LectureUnite[] = etat.unites.map((u) => {
    const coup =
      elue !== undefined && frappables.has(u.id) ? resoudreCoup(etat, elue.id, u.id) : null;
    const riposte =
      coup === null
        ? null
        : riposteDe(
            {
              ...etat,
              unites: etat.unites.map((v) =>
                v.id === u.id ? { ...v, tenue: coup.tenueApres } : v,
              ),
            },
            coup,
          );
    return {
      id: u.id,
      camp: u.camp,
      pos: u.pos,
      mot: u.mot,
      archetype: u.archetype,
      tenue: u.tenue,
      tenueMax: tenueMax(u),
      pa: u.pa,
      pas: pas(u),
      portee: portee(u),
      axes: u.axes,
      vivante: vivante(u),
      elue: elue !== undefined && u.id === elue.id,
      coup,
      riposte,
    };
  });

  return {
    etage: etat.etage,
    tour: etat.tour,
    phase: etat.phase,
    feuilles: etat.feuilles,
    fin: etat.fin,
    selection: elue?.id ?? null,
    cases,
    unites,
    intentions: etat.intentions,
    journal: [...etat.journal].reverse().slice(0, JOURNAL_VISIBLE),
    actes: elue !== undefined && joueur ? actesPossibles(etat, elue.id) : [],
    aJoue: joueur && coffreAJoue(etat),
  };
}

/** Ce que ferait un clic sur une case pour l'unité désignée : un déplacement, une frappe, ou rien. */
export function acteDeCase(lecture: Lecture, c: Case): Acte | null {
  if (lecture.selection === null || !dansGrille(c)) return null;
  const occupant = lecture.unites.find((u) => u.vivante && memeCase(u.pos, c));
  if (occupant !== undefined && occupant.coup !== null)
    return { geste: "frapper", unite: lecture.selection, cible: occupant.id };
  const lc = lecture.cases[c.y]?.[c.x];
  if (lc !== undefined && lc.cout !== null && occupant === undefined)
    return { geste: "deplacer", unite: lecture.selection, vers: { x: c.x, y: c.y } };
  return null;
}
