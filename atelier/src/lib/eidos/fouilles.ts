/**
 * Fouilles — la dalle se creuse, case par case.
 *
 * Chaque étage cache des gisements à des cases fixes et publiques de sa dalle
 * (la Tour est fixe) : une case pleine (x, y) en porte une si
 * `sha256d("eidos-fouille/1" ‖ étage ‖ x ‖ y)[0] < 32` — une case pleine sur huit :
 * d'une à douze par étage, cinq en moyenne, aucun étage sans. Trois coups de
 * bêche par étage et par coffre (`tour.fouilles`, jauge). Pendant une ascension,
 * la case d'arrivée du pendule donne, même sur un trou (le pendule ne regarde
 * pas la dalle), tant qu'il reste une bêche et qu'elle n'est pas déjà creusée :
 * « le loot dépend du spawn ». Le coup s'y compte comme les autres.
 *
 * L'objet d'un gisement est du genre le plus humble, « trouve », ou une pierre
 * (une fois sur quatre), dérivé de (étage, case, coffre) : **les cases sont à
 * tous, le contenu est à chacun**. Les occupants ont leur case :
 * `caseOccupant(k)` = ((3k + 1) mod 9, (5k + 3) mod 9), la règle de la scène.
 *
 * LIMITE : jauge, hors feuille ; rien ici ne se prouve ni ne se transfère.
 * Figures ≠ preuves : une fouille libre ne vaut rien à personne.
 */

import { affixeDe, habille } from "./equipement.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { BECHES_PAR_ETAGE, tourDe } from "./jauge.ts";
import { objetDepuisGraine } from "./objets.ts";
import { quartierDe } from "./sceaux.ts";
import { DALLE_N, biomeDe, dalleDe, etageDe } from "./tour.ts";
import type { Coffre, ObjetPorte, Tour } from "./types.ts";

export { BECHES_PAR_ETAGE };
export const TAG_FOUILLE = utf8("eidos-fouille/1");
/**
 * Deux gisements, deux seuils. Un gisement **caché** est dans un mur : il
 * faut une bêche pour l'ouvrir. Un gisement **au sol** se ramasse en
 * passant. Lire est gratuit, ouvrir coûte — la règle du jeu, appliquée au sol.
 *
 * Les seuils tiennent compte de la dalle : un quart de murs (~20 cases) et
 * trois quarts de sol (~61). À 64/256, un mur sur quatre est creusable, soit
 * ~5 par étage ; à 32/256, une case de sol sur huit porte quelque chose, soit
 * ~7,6. La cachette est plus rare que le sol, et c'est elle qui coûte.
 */
export const SEUIL_TROUVAILLE = 64;
export const SEUIL_TROUVAILLE_SOL = 32;

export type Case = { x: number; y: number };

/** La case d'un occupant sur la dalle — même règle que la scène (TourCanvas). */
export function caseOccupant(k: number): Case {
  return { x: (k * 3 + 1) % DALLE_N, y: (k * 5 + 3) % DALLE_N };
}

export function dansLaDalle(x: number, y: number): boolean {
  return (
    Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < DALLE_N && y >= 0 && y < DALLE_N
  );
}

function graineCase(etage: number, x: number, y: number): Uint8Array {
  return sha256d(concat(TAG_FOUILLE, u32(etageDe(etage)), u32(x), u32(y)));
}

/** Vrai si la case est un mur : le gisement y est caché, la bêche l'ouvre. */
export function estCachee(etage: number, x: number, y: number): boolean {
  return dansLaDalle(x, y) && !!dalleDe(etage)[y]![x];
}

/** Le hachage sous le seuil de son gisement. Public, fixe, jamais tiré au sort. */
export function aUnGisement(etage: number, x: number, y: number): boolean {
  if (!dansLaDalle(x, y)) return false;
  const seuil = estCachee(etage, x, y) ? SEUIL_TROUVAILLE : SEUIL_TROUVAILLE_SOL;
  return graineCase(etage, x, y)[0]! < seuil;
}

export function gisementsDe(etage: number): Case[] {
  const out: Case[] = [];
  for (let y = 0; y < DALLE_N; y++)
    for (let x = 0; x < DALLE_N; x++) if (aUnGisement(etage, x, y)) out.push({ x, y });
  return out;
}

/** Les cases déjà creusées par ce coffre à cet étage. */
export function fouillesFaites(t: Tour, etage: number): Case[] {
  const e = etageDe(etage);
  return t.fouilles.filter(([f]) => f === e).map(([, x, y]) => ({ x, y }));
}

/**
 * Seules les cachettes usent une bêche. Ce qui traîne au sol se ramasse : la
 * case se note pour qu'on ne la reprenne pas, mais elle ne coûte rien.
 */
export function couteUneBeche(etage: number, x: number, y: number): boolean {
  return estCachee(etage, x, y) || !aUnGisement(etage, x, y);
}

export function bechesRestantes(t: Tour, etage: number): number {
  const e = etageDe(etage);
  const creusees = fouillesFaites(t, e).filter((f) => couteUneBeche(e, f.x, f.y)).length;
  return Math.max(0, BECHES_PAR_ETAGE - creusees);
}

/** La case d'arrivée du pendule à cet étage, pendant une ascension en cours. */
export function spawnIci(c: Pick<Coffre, "tour">, etage: number): Case | null {
  const t = tourDe(c);
  const a = t.ascension;
  if (!a || a.fin !== null || t.etage !== etageDe(etage)) return null;
  return { x: a.spawn.x, y: a.spawn.y };
}

export function graineGisement(
  etage: number,
  x: number,
  y: number,
  c: Pick<Coffre, "maitre" | "n">,
): Uint8Array {
  return sha256d(concat(graineCase(etage, x, y), utf8(`${c.maitre}:${c.n}`)));
}

/** Ce que ce coffre trouve sous cette case : « trouve », ou une pierre une fois sur quatre. */
export function objetDuGisement(
  etage: number,
  x: number,
  y: number,
  c: Pick<Coffre, "maitre" | "n" | "chaine">,
): ObjetPorte {
  const g = graineGisement(etage, x, y, c);
  const tip = c.chaine[c.chaine.length - 1];
  const hauteur = tip?.hauteur ?? 0;
  const age = quartierDe(etageDe(etage));
  const muse = biomeDe(etage).id;
  const o = objetDepuisGraine(g, age);
  const base = { mot: o.mot, archetype: muse, age, nonce: g[8]!, hauteur };
  if (g[10]! % 4 === 0) {
    return habille(base, g[9]!, {
      genre: "pierre",
      emplacement: null,
      affixe: affixeDe(g[9]!),
      sockets: 0,
      gemmes: [],
      nom: affixeDe(g[9]!),
      palierLair: null,
    });
  }
  return habille(base, g[9]!, {
    genre: "trouve",
    emplacement: null,
    affixe: null,
    sockets: 0,
    gemmes: [],
    nom: "trouve",
    palierLair: null,
  });
}

export type FouilleKo = { ok: false; code: "hors" | "dejaCase" | "epuise" };
export type FouilleOk = {
  ok: true;
  coffre: Coffre;
  objet: ObjetPorte | null;
  restantes: number;
};

/**
 * Un coup de bêche sur (x, y) : la case se note, l'objet entre au coffre si elle
 * existe. La case d'arrivée du pendule se creuse même sur un trou, et donne.
 */
export function fouillerCaseDansCoffre(
  c: Coffre,
  etage: number,
  x: number,
  y: number,
): FouilleOk | FouilleKo {
  const e = etageDe(etage);
  const spawn = spawnIci(c, e);
  const arrivee = spawn !== null && spawn.x === x && spawn.y === y;
  if (!dansLaDalle(x, y)) return { ok: false, code: "hors" };
  const cachee = estCachee(e, x, y);
  // Un mur se creuse toujours ; le sol ne se fouille que s'il porte quelque
  // chose — on ne retourne pas une dalle vide pour rien.
  if (!arrivee && !cachee && !aUnGisement(e, x, y)) return { ok: false, code: "hors" };
  const t = tourDe(c);
  if (fouillesFaites(t, e).some((f) => f.x === x && f.y === y))
    return { ok: false, code: "dejaCase" };
  if (couteUneBeche(e, x, y) && bechesRestantes(t, e) <= 0)
    return { ok: false, code: "epuise" };
  const trouve = arrivee || aUnGisement(e, x, y);
  const objet = trouve ? objetDuGisement(e, x, y, c) : null;
  const tour: Tour = { ...t, fouilles: [...t.fouilles, [e, x, y]] };
  return {
    ok: true,
    objet,
    restantes: bechesRestantes(tour, e),
    coffre: {
      ...c,
      objets: objet ? [...(c.objets ?? []), objet] : c.objets,
      tour,
    },
  };
}
