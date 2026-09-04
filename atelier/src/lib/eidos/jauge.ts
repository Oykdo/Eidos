/**
 * Jauge de la Tour — `coffre.tour`, hors feuille.
 *
 * Ce que la Tour note pour un coffre : l'étage, les hôtes honorés, les échos
 * parcourus, les antres franchis, les élixirs bus, les portes passées, les
 * occupants pris. Rien de vérifiable : `empreinteCarnet` ne la couvre pas,
 * le réseau n'en sait rien, et la perdre ne perd rien qui se prouve.
 * Les élixirs, capsules et captures eux-mêmes sont des objets de `coffre.objets`.
 *
 * LIMITE : la jauge se relit en confiance depuis localStorage ou le carnet ;
 * une valeur absurde est ramenée à zéro, jamais refusée.
 */

import { estNomAge } from "./relique.ts";
import { DALLE_N, ETAGES, etageDe } from "./tour.ts";
import type { Coffre, ElixirBu, Espece, NomAge, Tour } from "./types.ts";

export function tourVide(): Tour {
  return {
    etage: 0,
    sommet: 0,
    depuis: 0,
    dons: [],
    echos: [],
    antres: [],
    alcoves: [],
    bus: [],
    elixirs: [],
    portes: [],
    captures: [],
    fouilles: [],
    liberee: null,
    porte: null,
    capsules: [],
    ascension: null,
  };
}

/** L'ascension se relit avec tolérance ; une forme absurde revient à null. */
function ascension(x: unknown): Tour["ascension"] {
  if (!x || typeof x !== "object") return null;
  const a = x as Record<string, unknown>;
  if (typeof a.graine !== "string" || !/^[0-9a-f]{64}$/.test(a.graine)) return null;
  const etape = entier(a.etape, 0, 26);
  const p = entier(a.p, 0, 8);
  const s = a.spawn as { x?: unknown; y?: unknown } | undefined;
  const x0 = entier(s?.x, 0, 8);
  const y0 = entier(s?.y, 0, 8);
  if (etape === null || p === null || x0 === null || y0 === null) return null;
  const choix = Array.isArray(a.choix)
    ? a.choix.filter((c) => c === "monter" || c === "lire" || c === "offrir")
    : [];
  const mots = Array.isArray(a.mots)
    ? a.mots.map((m) => entier(m, 0, 0xffffffff)).filter((m): m is number => m !== null)
    : [];
  if (choix.length !== mots.length) return null;
  const fin = a.fin === "sommet" || a.fin === "porte" || a.fin === "abandon" ? a.fin : null;
  const an = a.ancre as Record<string, unknown> | null | undefined;
  let ancre: Tour["ascension"] extends infer T
    ? T extends { ancre: infer U }
      ? U
      : never
    : never = null;
  if (an && typeof an === "object" && an.tete && an.piece && an.preuve) {
    ancre = an as unknown as NonNullable<typeof ancre>;
  }
  return {
    graine: a.graine,
    ancre,
    etape,
    p,
    spawn: { x: x0, y: y0 },
    choix: choix as ("monter" | "lire" | "offrir")[],
    mots,
    fin,
  };
}

function entier(x: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  if (typeof x !== "number" || !Number.isInteger(x) || x < min || x > max) return null;
  return x;
}

function etages(xs: unknown): number[] {
  if (!Array.isArray(xs)) return [];
  const out: number[] = [];
  for (const x of xs) {
    const e = entier(x, 0, ETAGES - 1);
    if (e !== null && !out.includes(e)) out.push(e);
  }
  return out;
}

function mots(xs: unknown): number[] {
  if (!Array.isArray(xs)) return [];
  const out: number[] = [];
  for (const x of xs) {
    const m = entier(x, 0, 0xffffffff);
    if (m !== null && !out.includes(m)) out.push(m);
  }
  return out;
}

function jours(xs: unknown): number[] {
  if (!Array.isArray(xs)) return [];
  const out: number[] = [];
  for (const x of xs) {
    const j = entier(x, 19700101, 99991231);
    if (j !== null && !out.includes(j)) out.push(j);
  }
  return out;
}

function paires(xs: unknown, maxB: number, maxA = ETAGES - 1): [number, number][] {
  if (!Array.isArray(xs)) return [];
  const out: [number, number][] = [];
  for (const x of xs) {
    if (!Array.isArray(x) || x.length !== 2) continue;
    const a = entier(x[0], 0, maxA);
    const b = entier(x[1], 0, maxB);
    if (a === null || b === null) continue;
    if (out.some((p) => p[0] === a && p[1] === b)) continue;
    out.push([a, b]);
  }
  return out;
}

function elixirsBus(xs: unknown): ElixirBu[] {
  if (!Array.isArray(xs)) return [];
  const out: ElixirBu[] = [];
  for (const x of xs) {
    if (!x || typeof x !== "object") continue;
    const o = x as Partial<ElixirBu>;
    const etage = entier(o.etage, 0, ETAGES - 1);
    const mot = entier(o.mot, 0, 0xffffffff);
    const espece =
      o.espece === "sel" || o.espece === "mercure" || o.espece === "soufre" ? o.espece : null;
    if (etage === null || mot === null || espece === null) continue;
    if (out.some((e) => e.mot === mot)) continue;
    out.push({ etage, mot, espece });
  }
  return out;
}

/** Coups de bêche par étage et par coffre (fouilles.ts) ; déclaré ici pour que la relecture le tienne. */
export const BECHES_PAR_ETAGE = 3;

/** (étage, x, y) : étage borné, case dans la dalle, sans doublon, au plus BECHES_PAR_ETAGE par étage. */
function triplets(x: unknown): [number, number, number][] {
  const out: [number, number, number][] = [];
  if (!Array.isArray(x)) return out;
  for (const v of x) {
    if (!Array.isArray(v) || v.length !== 3) continue;
    const e = entier(v[0], 0, ETAGES - 1);
    const a = entier(v[1], 0, DALLE_N - 1);
    const b = entier(v[2], 0, DALLE_N - 1);
    if (e === null || a === null || b === null) continue;
    if (out.some((w) => w[0] === e && w[1] === a && w[2] === b)) continue;
    if (out.filter((w) => w[0] === e).length >= BECHES_PAR_ETAGE) continue;
    out.push([e, a, b]);
  }
  return out;
}

/** Relecture tolérante : tout champ absent ou absurde revient à sa valeur vide. */
export function normaliserTour(x: unknown): Tour {
  const v = tourVide();
  if (!x || typeof x !== "object") return v;
  const t = x as Partial<Tour>;
  const etage = entier(t.etage, 0, ETAGES - 1) ?? 0;
  const sommet = Math.max(etage, entier(t.sommet, 0, ETAGES - 1) ?? 0);
  const depuis = Math.min(etage, entier(t.depuis, 0, ETAGES - 1) ?? etage);
  const portes: NomAge[] = [];
  if (Array.isArray(t.portes)) {
    for (const a of t.portes)
      if (typeof a === "string" && estNomAge(a) && !portes.includes(a)) portes.push(a);
  }
  return {
    etage,
    sommet,
    depuis,
    dons: etages(t.dons),
    echos: paires(t.echos, ETAGES - 1),
    antres: etages(t.antres),
    alcoves: etages(t.alcoves),
    bus: mots(t.bus),
    elixirs: elixirsBus(t.elixirs),
    portes,
    captures: paires(t.captures, 2),
    fouilles: triplets(t.fouilles),
    liberee: entier(t.liberee, 0, 0xffffffff),
    porte: entier(t.porte, 0, 0xffffffff),
    capsules: jours(t.capsules),
    ascension: ascension(t.ascension),
  };
}

export function tourDe(c: Pick<Coffre, "tour">): Tour {
  return normaliserTour(c.tour);
}

/** L'occupant `k` de l'étage a-t-il été pris par ce coffre ? */
export function estPris(t: Tour, etage: number, k: number): boolean {
  const e = etageDe(etage);
  return t.captures.some((p) => p[0] === e && p[1] === k);
}

/** L'espèce est-elle bue à cet étage ? L'effet d'un élixir tient à son étage, et là seulement. */
export function especeBueA(t: Tour, etage: number, espece: Espece): boolean {
  const e = etageDe(etage);
  return t.elixirs.some((x) => x.etage === e && x.espece === espece);
}
