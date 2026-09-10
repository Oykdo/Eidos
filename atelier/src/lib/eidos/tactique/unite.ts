/**
 * Unité de bataille — un mot, une tenue éphémère, une case.
 *
 * L'identité (mot, archétype, âge, classe, axes) est une **lecture** de
 * l'objet du coffre par `combatDe` : elle ne bouge ni pendant la bataille ni
 * après. Ce qui bouge est la case, la tenue et les deux drapeaux du tour.
 *
 * Les trois lectures mécaniques sont des divisions entières de la somme 64 :
 *
 *   tenue  = MULT_TENUE·(COUP_BASE + ecu)   →  32..160
 *   pas    = 2 + eperon / 12                →  2..7
 *   portée = 1 + arc / 16                   →  1..5
 *
 * La tenue est le **seul** prix de `ecu` : il ne réduit plus le coup encaissé
 * (`bataille.ts`), il se payait deux fois. Et son socle est celui du coup, au
 * facteur `MULT_TENUE` près, pour qu'un point de `ecu` vaille un point de
 * `lame` — sinon `lame` a un levier infini et `ecu` un levier de neuf.
 *
 * Un mot extrême n'est pas plus fort, il est plus spécialisé : ce qu'il prend
 * en pas, il ne l'a pas en tenue. Le budget de 64 l'interdit par construction,
 * aucun équilibrage à la main n'est possible ni nécessaire.
 *
 * Une unité qui n'a ni frappé ni bougé de tout un tour reprend
 * `MULT_TENUE·arc/8` de tenue, jamais au-delà de sa tenue de départ. Une unité
 * retirée (`tenue <= 0`) ne reprend rien : on ne relève pas un mot tombé.
 *
 * `elan` note les cases parcourues au déplacement du tour : c'est ce que la
 * charge paie (`bataille.ts`), et il s'éteint dès que l'unité s'arrête.
 *
 * Toute fonction rend une **nouvelle** unité ; aucune ne modifie son argument.
 *
 * AVERTISSEMENT : la tenue est une figure. Elle se dépense pendant la
 * bataille et se jette à la fin — elle ne touche ni l'objet du coffre, ni le
 * carnet, ni la chaîne. Le mot ne bouge jamais : c'est la loi de conservation
 * (`integrite.ts`), et elle vaut aussi ici. Seule la feuille dépensée par un
 * coup engage quoi que ce soit.
 */

import { combatDe } from "../combat.ts";
import type { Objet } from "../objets.ts";
import { dansGrille } from "./grille.ts";
import {
  COUP_BASE,
  DIV_REPRISE,
  GRILLE_N,
  RejetTactique,
  type Camp,
  type Case,
  type Classe,
  type Unite,
} from "./types.ts";

/**
 * Ce qu'un point de `ecu` achète de tenue, et rien d'autre : `ecu` n'entre
 * plus dans la résolution du coup (`bataille.ts`), il se payait deux fois.
 *
 * Le facteur n'est pas choisi, il est contraint deux fois :
 * — **le levier**. Le coup vaut `COUP_BASE + lame`, soit 8 à 72 : un rapport
 *   de 9. Pour qu'un point de `ecu` vaille un point de `lame`, la tenue doit
 *   avoir le même rapport, donc valoir `MULT_TENUE·(COUP_BASE + ecu)`.
 * — **la durée**. Ce même facteur est le nombre de coups nus qu'il faut pour
 *   abattre un adversaire de même valeur : à 2, une bataille de face tient la
 *   médiane de 2 à 4 coups, et 1 à 2 avec l'accord et le dos.
 */
export const MULT_TENUE = 2;

/** Le socle de tenue, commun à tous : `MULT_TENUE · COUP_BASE`, jamais un chiffre à part. */
export const TENUE_BASE = MULT_TENUE * COUP_BASE;

/** Diviseurs entiers des deux lectures de déplacement et de portée. */
export const DIV_PAS = 16;
export const DIV_PORTEE = 16;

function exigerCase(c: Case, role: string): void {
  if (!dansGrille(c)) {
    throw new RejetTactique(
      `${role} (${c.x},${c.y}) hors de la dalle ${GRILLE_N}×${GRILLE_N}`,
    );
  }
}

/**
 * Une unité posée sur la dalle. Les axes sont lus une fois et gelés : on ne
 * rappelle jamais `combatDe` pendant la bataille, sinon deux rejeux d'un même
 * état pourraient diverger sur un objet reconstruit autrement.
 */
export function uniteDepuisObjet(
  o: Objet,
  id: number,
  camp: Camp,
  pos: Case,
  classe: Classe,
): Unite {
  if (!Number.isInteger(id) || id < 0) {
    throw new RejetTactique(`id ${id} au lieu d'un entier de 0 ou plus`);
  }
  exigerCase(pos, "case de pose");
  const axes = combatDe(o);
  return {
    id,
    camp,
    precedente: null,
    mot: o.mot,
    archetype: o.archetype,
    age: o.age,
    classe,
    axes,
    pos: { x: pos.x, y: pos.y },
    elan: 0,
    tenue: TENUE_BASE + MULT_TENUE * axes.ecu,
    aFrappe: false,
    aDeplace: false,
  };
}

/** Tenue de départ, et plafond de toute reprise. `MULT_TENUE·(COUP_BASE + ecu)`. */
export function tenueMax(u: Unite): number {
  return TENUE_BASE + MULT_TENUE * u.axes.ecu;
}

/** 2..7. Division entière : `eperon` 0..64 donne 0..5 pas de plus. */
export function pas(u: Unite): number {
  return 2 + Math.trunc(u.axes.eperon / DIV_PAS);
}

/** 1..5. Division entière : `arc` 0..64 donne 0..4 cases de plus. */
export function portee(u: Unite): number {
  return 1 + Math.trunc(u.axes.arc / DIV_PORTEE);
}

export function vivante(u: Unite): boolean {
  return u.tenue > 0;
}

/**
 * Nouvelle unité sur `vers`, marquée déplacée. La case doit être de la dalle.
 *
 * `elan` est le nombre de cases parcourues — le coût du chemin, pas la
 * distance à vol d'oiseau : contourner un mur fatigue autant qu'avancer tout
 * droit, et c'est ce coût que la charge paie (`bataille.ts`). Par défaut la
 * distance de Manhattan, qui est le coût quand la route est libre.
 */
export function deplacer(u: Unite, vers: Case, cout?: number): Unite {
  exigerCase(vers, "case visée");
  const parcourues =
    cout ?? Math.abs(vers.x - u.pos.x) + Math.abs(vers.y - u.pos.y);
  if (!Number.isInteger(parcourues) || parcourues < 0) {
    throw new RejetTactique(`élan ${parcourues} au lieu d'un entier de 0 ou plus`);
  }
  // La case quittée devient la face : une unité surveille d'où elle vient.
  return {
    ...u,
    precedente: { x: u.pos.x, y: u.pos.y },
    pos: { x: vers.x, y: vers.y },
    elan: parcourues,
    aDeplace: true,
  };
}

/** L'élan s'éteint : l'unité s'est arrêtée. On ne riposte jamais en charge. */
export function poser(u: Unite): Unite {
  return u.elan === 0 ? u : { ...u, elan: 0 };
}

/** La tenue s'arrête à 0 : elle ne passe jamais dans le négatif. */
export function encaisser(u: Unite, degat: number): Unite {
  if (!Number.isInteger(degat) || degat < 0) {
    throw new RejetTactique(`dégât ${degat} au lieu d'un entier de 0 ou plus`);
  }
  return { ...u, tenue: Math.max(0, u.tenue - degat) };
}

/**
 * Reprise : `arc / 8` de tenue à qui n'a ni frappé ni bougé, plafonnée à
 * la tenue de départ. Sans effet sur une unité qui a agi ou qui est retirée —
 * l'unité est alors rendue telle quelle.
 */
export function reprendre(u: Unite): Unite {
  if (u.aFrappe || u.aDeplace || !vivante(u)) return u;
  const gain = MULT_TENUE * Math.trunc(u.axes.arc / DIV_REPRISE);
  return { ...u, tenue: Math.min(tenueMax(u), u.tenue + gain) };
}

/** Nouveau tour : les deux drapeaux retombent, l'élan aussi, la tenue reste. */
export function nouveauTour(u: Unite): Unite {
  return { ...u, aFrappe: false, aDeplace: false, elan: 0 };
}
