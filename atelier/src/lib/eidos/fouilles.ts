/**
 * Fouilles — la dalle se creuse, case par case.
 *
 * Chaque étage cache des trouvailles à des cases fixes et publiques de sa dalle
 * (la Tour est fixe) : une case pleine (x, y) en porte une si
 * `sha256d("eidos-fouille/1" ‖ étage ‖ x ‖ y)[0] < 32` — une case sur huit, soit
 * quatre à six par étage. Trois coups de bêche par étage et par coffre
 * (`tour.fouilles`, jauge). Pendant une ascension, la case d'arrivée du pendule
 * porte toujours une trouvaille : « le loot dépend du spawn ».
 *
 * La trouvaille est un objet du genre le plus humble, « trouve », ou une pierre
 * (une fois sur quatre), dérivé de (étage, case, coffre) : **les cases sont à
 * tous, le contenu est à chacun**. Les occupants ont leur case :
 * `caseOccupant(k)` = ((3k + 1) mod 9, (5k + 3) mod 9), la règle de la scène.
 *
 * LIMITE : jauge, hors feuille ; rien ici ne se prouve ni ne se transfère.
 * Figures ≠ preuves : une fouille libre ne vaut rien à personne.
 */

import { affixeDe, habille } from "./equipement.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { tourDe } from "./jauge.ts";
import { objetDepuisGraine } from "./objets.ts";
import { quartierDe } from "./sceaux.ts";
import { DALLE_N, biomeDe, dalleDe, etageDe } from "./tour.ts";
import type { Coffre, ObjetPorte, Tour } from "./types.ts";

export const TAG_FOUILLE = utf8("eidos-fouille/1");
export const BECHES_PAR_ETAGE = 3;
/** Seuil sur le premier octet : 32/256 = une case pleine sur huit. */
export const SEUIL_TROUVAILLE = 32;

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

/** Une case pleine, et le hachage sous le seuil. Public, fixe. */
export function aUneTrouvaille(etage: number, x: number, y: number): boolean {
  if (!dansLaDalle(x, y)) return false;
  if (!dalleDe(etage)[y]![x]) return false;
  return graineCase(etage, x, y)[0]! < SEUIL_TROUVAILLE;
}

export function trouvaillesDe(etage: number): Case[] {
  const out: Case[] = [];
  for (let y = 0; y < DALLE_N; y++)
    for (let x = 0; x < DALLE_N; x++) if (aUneTrouvaille(etage, x, y)) out.push({ x, y });
  return out;
}

/** Les cases déjà creusées par ce coffre à cet étage. */
export function fouillesFaites(t: Tour, etage: number): Case[] {
  const e = etageDe(etage);
  return t.fouilles.filter(([f]) => f === e).map(([, x, y]) => ({ x, y }));
}

export function bechesRestantes(t: Tour, etage: number): number {
  return Math.max(0, BECHES_PAR_ETAGE - fouillesFaites(t, etage).length);
}

/** La case d'arrivée du pendule à cet étage, pendant une ascension en cours. */
export function spawnIci(c: Pick<Coffre, "tour">, etage: number): Case | null {
  const t = tourDe(c);
  const a = t.ascension;
  if (!a || a.fin !== null || t.etage !== etageDe(etage)) return null;
  return { x: a.spawn.x, y: a.spawn.y };
}

export function graineTrouvaille(
  etage: number,
  x: number,
  y: number,
  c: Pick<Coffre, "maitre" | "n">,
): Uint8Array {
  return sha256d(concat(graineCase(etage, x, y), utf8(`${c.maitre}:${c.n}`)));
}

/** Ce que ce coffre trouve sous cette case : « trouve », ou une pierre une fois sur quatre. */
export function trouvailleDe(
  etage: number,
  x: number,
  y: number,
  c: Pick<Coffre, "maitre" | "n" | "chaine">,
): ObjetPorte {
  const g = graineTrouvaille(etage, x, y, c);
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
  trouvaille: ObjetPorte | null;
  restantes: number;
};

/** Un coup de bêche sur (x, y) : la case se note, la trouvaille entre au coffre si elle existe. */
export function fouillerCaseDansCoffre(
  c: Coffre,
  etage: number,
  x: number,
  y: number,
): FouilleOk | FouilleKo {
  const e = etageDe(etage);
  if (!dansLaDalle(x, y) || !dalleDe(e)[y]![x]) return { ok: false, code: "hors" };
  const t = tourDe(c);
  if (fouillesFaites(t, e).some((f) => f.x === x && f.y === y))
    return { ok: false, code: "dejaCase" };
  if (bechesRestantes(t, e) <= 0) return { ok: false, code: "epuise" };
  const spawn = spawnIci(c, e);
  const trouve = aUneTrouvaille(e, x, y) || (spawn !== null && spawn.x === x && spawn.y === y);
  const trouvaille = trouve ? trouvailleDe(e, x, y, c) : null;
  const tour: Tour = { ...t, fouilles: [...t.fouilles, [e, x, y]] };
  return {
    ok: true,
    trouvaille,
    restantes: bechesRestantes(tour, e),
    coffre: {
      ...c,
      objets: trouvaille ? [...(c.objets ?? []), trouvaille] : c.objets,
      tour,
    },
  };
}
