/**
 * Pendule-9 — le parcours d'une ascension, jamais le contenu d'un étage.
 * docs/SPEC_PENDULE.md §3 (TECH-2, esquisse). Tout est entier, tout dérive
 * de SHA-256d : même graine de run + mêmes choix + même objet porté ⇒ même
 * suite (p, e, s). Le contenu de l'étage (hôte, dalle, occupants) reste
 * public et fixe (tour.ts) : le pendule choisit où l'on va, et où l'on arrive.
 *
 *   p ∈ 0..8   position du pendule (un cran par astre, Terre en bas)
 *   e ∈ 0..254 étage ; bande(e) = floor(e·9/255), neuf bandes
 *   s = (x, y)  case de spawn sur la dalle 9 × 9 ; y = p
 *
 * Un run = 27 étapes : 9 bandes × 3 étages. L'étape i est dans la bande
 * floor(i/3), à la position j = i mod 3 de l'un des neuf triplets de la bande ;
 * le pendule choisit le triplet. L'étape 0 est toujours l'étage 0 : la porte
 * de la ville, Thalie.
 *
 * Le don d'arrivée dépend de (étage, case, coffre) : « le loot dépend du spawn ».
 * Figures, pas preuves : rien ici n'engage le carnet.
 */

import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { SIGNATURES } from "./signatures.ts";
import { ETAGES, biomeDe, resonanceEtage } from "./tour.ts";

export const TAG_RUN = utf8("eidos-run/1");
export const TAG_PENDULE = utf8("eidos-pendule/1");
export const TAG_DON = utf8("eidos-don/1");

export const CRANS = 9;
export const BANDES = 9;
export const ETAGES_PAR_BANDE = 3;
export const ETAPES = BANDES * ETAGES_PAR_BANDE; // 27

export const CHOIX = ["monter", "lire", "offrir"] as const;
export type Choix = (typeof CHOIX)[number];

export type Spawn = { x: number; y: number };
export type Etape = { i: number; p: number; e: number; s: Spawn };

export type GenreDon = "elixir" | "pierre" | "gemme" | "lair";
const GENRES_DON: readonly GenreDon[] = ["elixir", "elixir", "pierre", "gemme", "lair", "elixir", "pierre", "gemme"];

function u8(n: number): Uint8Array {
  return new Uint8Array([n & 255]);
}

/** Premier étage de la bande k : le plus petit e tel que floor(e·9/255) = k. */
export function debutBande(k: number): number {
  return Math.ceil((k * ETAGES) / BANDES);
}

export function bandeDe(e: number): number {
  return Math.min(BANDES - 1, Math.floor((e * BANDES) / ETAGES));
}

/** Rang de la muse de la bande dans SIGNATURES (Terre = 8 … Uranie = 0). */
export function rangBande(k: number): number {
  return SIGNATURES.findIndex((s) => s.id === biomeDe(debutBande(k)).id);
}

export function graineRun(maitre: string, n: number, graineVille: Uint8Array): Uint8Array {
  return sha256d(concat(TAG_RUN, utf8(`${maitre}/${n}/`), graineVille));
}

/** L'étage d'une étape : bande floor(i/3), triplet p, position i mod 3.
 *  Les neuf triplets sont étalés sur toute la bande (28 ou 29 étages) :
 *  le cran 0 part du premier étage, le cran 8 finit sur le dernier. */
export function etageDe(i: number, p: number): number {
  if (i === 0) return 0;
  const k = Math.floor(i / ETAGES_PAR_BANDE);
  const j = i % ETAGES_PAR_BANDE;
  const debut = debutBande(k);
  const fin = k + 1 < BANDES ? debutBande(k + 1) - 1 : ETAGES - 1;
  const taille = fin - debut + 1;
  const decalage = Math.floor((p * (taille - ETAGES_PAR_BANDE)) / (CRANS - 1));
  return Math.min(fin, debut + decalage + j);
}

/** Tenue de l'étage réduite à 0..2 — la résonance des occupants (lecture). */
const tenueCache = new Map<number, number>();
export function tenueMod3(e: number): number {
  const c = tenueCache.get(e);
  if (c !== undefined) return c;
  const t = resonanceEtage(e).tenue;
  const r = Number(((t % 3n) + 3n) % 3n);
  tenueCache.set(e, r);
  return r;
}

/** Position de départ : tirée de la graine de run. */
export function penduleInitial(graine: Uint8Array): number {
  return sha256d(concat(TAG_PENDULE, graine, u8(0)))[0]! % CRANS;
}

/**
 * Transition, trois ingrédients entiers : le hachage (graine, étape, position,
 * choix, objet porté), la résonance de l'étage quitté, la muse de la bande qui
 * fixe le sens (rang pair : +, impair : −).
 */
export function transition(
  graine: Uint8Array,
  i: number,
  p: number,
  e: number,
  choix: Choix,
  portMot: number,
): { p: number; h: Uint8Array } {
  const h = sha256d(concat(TAG_PENDULE, graine, u8(i), u8(e), u8(p), u8(CHOIX.indexOf(choix)), u32(portMot >>> 0)));
  let pp = (p + 1 + (h[0]! % 3) + tenueMod3(e)) % CRANS;
  if (rangBande(bandeDe(e)) % 2 === 1) pp = (CRANS - pp) % CRANS;
  return { p: pp, h };
}

export function spawnDe(h: Uint8Array, p: number): Spawn {
  return { x: h[2]! % CRANS, y: p };
}

/** Le don d'arrivée : genre seulement en phase 0. */
export function genreDon(e: number, s: Spawn, maitre: string, n: number): GenreDon {
  const h = sha256d(concat(TAG_DON, u8(e), u8(s.x), u8(s.y), utf8(`${maitre}:${n}`)));
  return GENRES_DON[h[0]! % GENRES_DON.length]!;
}

/** Un run entier : 27 étapes pour des choix et un objet porté donnés. */
export function run(
  graine: Uint8Array,
  choix: (i: number) => Choix,
  portMot: (i: number) => number,
): Etape[] {
  const out: Etape[] = [];
  let p = penduleInitial(graine);
  let e = 0;
  const h0 = sha256d(concat(TAG_PENDULE, graine, u8(0), u8(0), u8(p)));
  out.push({ i: 0, p, e: 0, s: spawnDe(h0, p) });
  for (let i = 1; i < ETAPES; i++) {
    const t = transition(graine, i - 1, p, e, choix(i - 1), portMot(i - 1));
    p = t.p;
    e = etageDe(i, p);
    out.push({ i, p, e, s: spawnDe(t.h, p) });
  }
  return out;
}
