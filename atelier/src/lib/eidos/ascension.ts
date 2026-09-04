/**
 * Ascension — le pendule branché sur l'exploration libre.
 *
 * On explore une salle librement (hôte, fouille, prise, élixirs). En **fin de
 * salle**, le pendule lit ce que ce coffre y a fait — honoré l'hôte : « offrir » ;
 * ouvert l'alcôve, franchi l'antre, pris un occupant : « lire » ; rien : « monter » —
 * et l'objet porté, puis dépose à l'étage et à la case qu'il calcule (pendule.ts).
 * Le joueur ne choisit pas un jeton abstrait : son acte est son choix.
 *
 * Deux graines possibles : libre (le coffre et sa chaîne locale : une lecture,
 * rien ne compte) ou ancrée (ancrage.ts : la tête signée et une pièce prouvée,
 * gelées au départ ; ce qui compte). Une porte fermée arrête l'ascension
 * devant elle : le pendule ne force pas un sceau.
 *
 * 27 salles : la porte de la ville, puis 26 fins de salle. La jauge (`tour.ascension`)
 * porte l'état ; elle est hors feuille, comme tout ce que la Tour note.
 */

import { assemblerAscension, graineAncree, type Ascension as AscensionExportee } from "./ancrage.ts";
import { concat, fromHex, hexOf, sha256d, utf8 } from "./hash.ts";
import { arriverDansCoffre } from "./secrets.ts";
import { tourDe } from "./jauge.ts";
import type { PreuvePortable, SortieMin } from "./merkle.ts";
import { CHOIX, ETAPES, etageDe, penduleInitial, spawnDe, transition, TAG_PENDULE, type Choix, type Spawn } from "./pendule.ts";
import { agesScelles, porteDe, sceauxDuCoffre, type EntreeMonde } from "./sceaux.ts";
import type { TeteReseau } from "./temoin.ts";
import type { Coffre, Tour } from "./types.ts";

export const TAG_LIBRE = utf8("eidos-run/1");

export type Ancre = { tete: TeteReseau; piece: SortieMin; preuve: PreuvePortable };

export type AscensionEnCours = {
  graine: string;
  ancre: Ancre | null;
  /** salle courante, 0..26 */
  etape: number;
  p: number;
  spawn: Spawn;
  choix: Choix[];
  mots: number[];
  /** null tant que l'ascension court ; sinon pourquoi elle s'est arrêtée */
  fin: "sommet" | "porte" | "abandon" | null;
};

function u8(n: number): Uint8Array {
  return new Uint8Array([n & 255]);
}

/** Graine libre : le coffre et la tête de sa chaîne locale. Une lecture. */
export function graineLibre(c: Pick<Coffre, "maitre" | "n" | "chaine">): Uint8Array {
  const tete = c.chaine?.[c.chaine.length - 1]?.hash ?? "00".repeat(32);
  return sha256d(concat(TAG_LIBRE, utf8(`${c.maitre}/${c.n}/`), fromHex(tete)));
}

/** Ce que le pendule lit dans la salle : l'acte du coffre, pas un jeton. */
export function choixDeSalle(t: Tour, etage: number): Choix {
  if (t.dons.includes(etage)) return "offrir";
  if (t.alcoves.includes(etage) || t.antres.includes(etage) || t.captures.some(([e]) => e === etage)) return "lire";
  return "monter";
}

export function ascensionDe(c: Pick<Coffre, "tour">): AscensionEnCours | null {
  return tourDe(c).ascension ?? null;
}

export function enCours(c: Pick<Coffre, "tour">): boolean {
  const a = ascensionDe(c);
  return a !== null && a.fin === null;
}

/** Commence à la porte de la ville. `ancre` fige la tête et la pièce (ce qui compte). */
export function commencerDansCoffre(c: Coffre, ancre: Ancre | null): Coffre {
  const graine = ancre ? graineAncree(ancre.tete.idBloc, ancre.piece) : graineLibre(c);
  const p = penduleInitial(graine);
  const h0 = sha256d(concat(TAG_PENDULE, graine, u8(0), u8(0), u8(p)));
  const base = arriverDansCoffre(c, 0).coffre;
  const t = tourDe(base);
  const ascension: AscensionEnCours = { graine: hexOf(graine), ancre, etape: 0, p, spawn: spawnDe(h0, p), choix: [], mots: [], fin: null };
  return { ...base, tour: { ...t, depuis: 0, ascension } };
}

export type FinDeSalle =
  | { ok: true; coffre: Coffre; choix: Choix; etage: number; spawn: Spawn; fin: AscensionEnCours["fin"] }
  | { ok: false; code: "aucune" | "finie" };

/** Le pendule tranche : choix lu, objet porté, transition, arrivée — ou arrêt. */
export function finDeSalleDansCoffre(c: Coffre, monde: readonly EntreeMonde[] | null): FinDeSalle {
  const t = tourDe(c);
  const a = t.ascension;
  if (!a) return { ok: false, code: "aucune" };
  if (a.fin !== null) return { ok: false, code: "finie" };
  const i = a.etape;
  const choix = choixDeSalle(t, t.etage);
  if (i + 1 >= ETAPES) {
    // dernière salle : rien à trancher, 26 choix suffisent aux 27 étapes
    const fini = { ...a, fin: "sommet" as const };
    return { ok: true, coffre: { ...c, tour: { ...t, ascension: fini } }, choix, etage: t.etage, spawn: a.spawn, fin: "sommet" };
  }
  const mot = t.porte ?? 0;
  const graine = fromHex(a.graine);
  const { p, h } = transition(graine, i, a.p, t.etage, choix, mot);
  const suivant: AscensionEnCours = { ...a, p, choix: [...a.choix, choix], mots: [...a.mots, mot] };
  const e = etageDe(i + 1, p);
  const ages = agesScelles(sceauxDuCoffre(monde, c), c);
  for (let x = t.etage + 1; x <= e; x++) {
    const porte = porteDe(x, ages, c);
    if (!porte.ouverte) {
      const arrete = { ...suivant, fin: "porte" as const };
      return { ok: true, coffre: { ...c, tour: { ...t, ascension: arrete } }, choix, etage: t.etage, spawn: a.spawn, fin: "porte" };
    }
  }
  const spawn = spawnDe(h, p);
  const arrive = arriverDansCoffre({ ...c, tour: { ...t, ascension: { ...suivant, spawn, etape: i + 1 } } }, e).coffre;
  const ta = tourDe(arrive);
  return { ok: true, coffre: { ...arrive, tour: { ...ta, depuis: 0 } }, choix, etage: e, spawn, fin: null };
}

export function abandonnerDansCoffre(c: Coffre): Coffre {
  const t = tourDe(c);
  if (!t.ascension || t.ascension.fin !== null) return c;
  return { ...c, tour: { ...t, ascension: { ...t.ascension, fin: "abandon" } } };
}

export function effacerDansCoffre(c: Coffre): Coffre {
  const t = tourDe(c);
  return { ...c, tour: { ...t, ascension: null } };
}

/** L'ascension exportable, si elle est ancrée et arrivée au sommet. */
export function exporterAscension(c: Pick<Coffre, "tour">): AscensionExportee | { erreur: string } {
  const a = ascensionDe(c);
  if (!a) return { erreur: "aucune ascension" };
  if (!a.ancre) return { erreur: "ascension libre : une lecture, rien à exporter" };
  if (a.fin !== "sommet") return { erreur: a.fin === null ? "ascension en cours" : `arrêtée (${a.fin})` };
  return assemblerAscension(a.ancre.tete, a.ancre.piece, a.ancre.preuve, a.choix, a.mots);
}

export { CHOIX };
