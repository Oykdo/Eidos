/**
 * Unité de bataille — un mot, une tenue éphémère, une case.
 *
 * L'identité (mot, archétype, âge, classe, axes) est une **lecture** de
 * l'objet du coffre par `combatDe` : elle ne bouge ni pendant la bataille ni
 * après. Ce qui bouge est la case, la tenue et les points d'action du tour.
 *
 * Les trois lectures mécaniques sont des divisions entières de la somme 64 :
 *
 *   tenue  = MULT_TENUE·(COUP_BASE + ecu)   →  32..160
 *   pas    = PAS_BASE + eperon / DIV_PAS    →  2..4
 *   portée = PORTEE_BASE + arc / DIV_PORTEE →  1..7
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
 * Un tour vaut `PA_PAR_TOUR` points d'action, plats pour toute unité. Une
 * unité qui finit le tour avec **tous** ses PA n'a rien fait : elle reprend
 * `MULT_TENUE·arc/8` de tenue, jamais au-delà de sa tenue de départ. Une unité
 * retirée (`tenue <= 0`) ne reprend rien : on ne relève pas un mot tombé, et
 * `passer` vide les PA — attendre volontairement n'est pas ne rien faire.
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
  PA_PAR_TOUR,
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

/**
 * Socles et diviseurs des deux lectures de déplacement et de portée.
 *
 * Les deux ont été recalés quand `dalleDe` est passée d'un bit à deux par
 * case : la plus grande salle d'un seul tenant a triplé (19,8 → 56,8 cases
 * sur 81) et la mobilité s'est mise à valoir bien plus cher, sans qu'une
 * ligne du moteur ait bougé — r(eperon, victoire) est monté de +0,126 à
 * +0,293, et r(arc) est tombé à −0,367.
 *
 * **Le pas et la portée se règlent ensemble, jamais l'un sans l'autre.** Un
 * pas plus long ne coûte pas seulement à `eperon` : il tue `arc`, parce qu'un
 * archer rattrapé n'a jamais tiré. Mesuré sur les nouvelles salles, à pas
 * 4..8 : r(arc) = −0,48 ; à pas 2..4 avec portée 1..7 : −0,03. D'où la règle
 * — **le pas le plus long reste sous la portée la plus longue**. Le socle,
 * lui, règle le levier de l'axe, exactement comme `COUP_BASE` règle celui de
 * `lame`.
 *
 * LIMITE, et elle est ouverte : **cette règle est tenue par pas, et rompue
 * par tour.** Un pas plein vaut 4 et la plus longue portée 7, donc `4 < 7` ;
 * mais depuis les points d'action un tour en autorise deux, soit
 * `PA_PAR_TOUR · pas = 8`, et `8 > 7`. Le contrôle de `unite.test.ts` lit un
 * pas et reste vert : il garde la lettre, pas ce qui compte. Deux mesures
 * indépendantes chiffrent le prix — bridée à un seul pas la politique tient
 * `|r| = 0,236`, à deux pas elle monte à `0,588`, contre la cible de 0,30 du
 * §9 ter de `SPEC_TACTIQUE.md`. `DIV_PAS = 64` (pas 2..3, donc `6 < 7`) la
 * rétablirait à 0,255, mais re-tarifer `eperon` est un chantier avec sa
 * mesure, pas une retouche : la constante ne bouge pas sans arbitrage.
 */
export const PAS_BASE = 2;
export const DIV_PAS = 32;
export const PORTEE_BASE = 1;
export const DIV_PORTEE = 10;

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
    pa: PA_PAR_TOUR,
  };
}

/** Tenue de départ, et plafond de toute reprise. `MULT_TENUE·(COUP_BASE + ecu)`. */
export function tenueMax(u: Unite): number {
  return TENUE_BASE + MULT_TENUE * u.axes.ecu;
}

/** 2..4. Division entière : `eperon` 0..64 donne 0..2 pas de plus. */
export function pas(u: Unite): number {
  return PAS_BASE + Math.trunc(u.axes.eperon / DIV_PAS);
}

/** 1..7. Division entière : `arc` 0..64 donne 0..6 cases de plus. */
export function portee(u: Unite): number {
  return PORTEE_BASE + Math.trunc(u.axes.arc / DIV_PORTEE);
}

export function vivante(u: Unite): boolean {
  return u.tenue > 0;
}

/**
 * Nouvelle unité sur `vers`. La case doit être de la dalle. Le point d'action
 * se dépense à part (`depenser`) : `deplacer` ne fait que déplacer.
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
  };
}

/**
 * Dépense `cout` points d'action. Refuse si l'unité ne les a pas — c'est le
 * seul endroit où le compte se vérifie, et il ne se contourne pas : `jouer`
 * y passe pour chaque geste.
 */
export function depenser(u: Unite, cout: number): Unite {
  if (!Number.isInteger(cout) || cout < 0) {
    throw new RejetTactique(`coût ${cout} au lieu d'un entier de 0 ou plus`);
  }
  if (u.pa < cout) {
    throw new RejetTactique(`unité ${u.id} : ${u.pa} PA au lieu de ${cout}`);
  }
  return { ...u, pa: u.pa - cout };
}

/** L'unité a-t-elle de quoi payer `cout` PA ? Une lecture, elle n'engage rien. */
export function aDesPa(u: Unite, cout: number): boolean {
  return u.pa >= cout;
}

/** Passer : le tour de l'unité est fini, ses PA tombent. Elle ne reprend pas. */
export function terminerTour(u: Unite): Unite {
  return u.pa === 0 ? u : { ...u, pa: 0 };
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
 * Reprise : `arc / 8` de tenue à qui a gardé **tous** ses PA, plafonnée à la
 * tenue de départ. Sans effet sur une unité qui a dépensé un point ou qui est
 * retirée — l'unité est alors rendue telle quelle. `passer` vidant les PA,
 * une unité qui passe ne reprend pas : attendre n'est pas ne rien faire.
 */
export function reprendre(u: Unite): Unite {
  if (u.pa < PA_PAR_TOUR || !vivante(u)) return u;
  const gain = MULT_TENUE * Math.trunc(u.axes.arc / DIV_REPRISE);
  return { ...u, tenue: Math.min(tenueMax(u), u.tenue + gain) };
}

/** Nouveau tour : les PA repartent à `PA_PAR_TOUR`, l'élan à 0, la tenue reste. */
export function nouveauTour(u: Unite): Unite {
  return { ...u, pa: PA_PAR_TOUR, elan: 0 };
}
