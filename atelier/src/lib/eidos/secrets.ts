/**
 * Secrets de la Tour — alcôves, échos, antres, observatoire.
 * Quatre sortes, toutes lisibles sans rien tirer au sort.
 *
 * Alcôve   la dalle 9 × 9 porte une croix au centre : la case centrale et ses
 *          quatre voisines à `true`. Treize étages sur 255, ~1 sur 20. La page
 *          affiche la dalle ; c'est au joueur de voir la croix, aucun indice.
 *          (La symétrie diagonale de la spec v1 vaut 2⁻³⁶ : aucun étage ; la
 *          croix est la figure ✚, la lecture reste géométrique.) Le coffret :
 *          `SHA-256d("eidos-alcove/1" ‖ étage ‖ maître:n)` → gemme, élixir ou capsule.
 * Écho     deux coupes de même orbite exacte (`memeOrbite`) : 44 paires dans la
 *          Tour, 5 à 16 par quartier. Monter le bas puis le haut sans redescendre
 *          donne un élixir de mercure, une fois par paire ; `tour.echos` note.
 * Antre    un ticket (`lair`) de la bande ouvre l'antre de l'étage : un gardien,
 *          dont le mot tient l'axe du biome (la coupe) au seuil élite ; à une
 *          porte, au seuil suprême. Duel en trois temps, sans points de vie :
 *            1. orbite     votre objet et le gardien, même première figure
 *            2. parade     votre objet tient l'axe du biome au seuil élite —
 *                          ou le mercure bu à cet étage l'accorde d'office
 *            3. résonance  l'ensemble du coffre, la capture libérée, le gardien :
 *                          tenue > 0 ; le sel lit le destructif neutre
 *          Passage : un don (`"eidos-antre/1"`), gemme ou pierre de rang 3, le
 *          ticket consommé. Repoussé : un étage de moins, rien de perdu.
 * Observatoire  l'étage 254 ne donne rien : il lit (tête signée, reliques,
 *          étages honorés). La seule fenêtre de la Tour sur la chaîne.
 *
 * LIMITE : le gardien se cherche depuis sa graine jusqu'à tenir l'axe ; la
 * recherche est bornée et déterministe (gardien.essais en dit le coût).
 */

import { quadrupleDepuis, type Q } from "./cosmos.ts";
import { affixeDe, habille } from "./equipement.ts";
import { elixirDansCoffre, especeActive } from "./elixirs.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { capsuleDepuisGraine, libereeDe, porteurDe } from "./capsules.ts";
import { bandeDe } from "./hotes.ts";
import { tourDe } from "./jauge.ts";
import { memeOrbiteLue, tientAxeElite, tientAxeSupreme } from "./lecture.ts";
import { memeOrbite } from "./groupe.ts";
import { objetDepuisGraine } from "./objets.ts";
import { paireDe, qDeMot, type LecturePaire, type Membre } from "./resonance.ts";
import { PORTES, QUARTIERS, quartierDe } from "./sceaux.ts";
import type { SignatureId } from "./signatures.ts";
import { DALLE_N, ETAGES, biomeDe, coupeDe, dalleDe, etageDe } from "./tour.ts";
import type { Coffre, NomAge, ObjetPorte, Tour } from "./types.ts";

export const TAG_ALCOVE = utf8("eidos-alcove/1");
export const TAG_ECHO = utf8("eidos-echo/1");
export const TAG_ANTRE = utf8("eidos-antre/1");
export const TAG_GARDIEN = utf8("eidos-gardien/1");
export const OBSERVATOIRE = ETAGES - 1;

// ---------------------------------------------------------------------------
// Alcôves
// ---------------------------------------------------------------------------

/** Croix au centre de la dalle : la case centrale et ses quatre voisines. */
export function aUneAlcove(etage: number): boolean {
  const d = dalleDe(etage);
  const m = (DALLE_N - 1) / 2;
  return !!(d[m]![m] && d[m - 1]![m] && d[m + 1]![m] && d[m]![m - 1] && d[m]![m + 1]);
}

export function etagesAlcoves(): number[] {
  const out: number[] = [];
  for (let e = 0; e < ETAGES; e++) if (aUneAlcove(e)) out.push(e);
  return out;
}

export function graineAlcove(etage: number, c: Pick<Coffre, "maitre" | "n">): Uint8Array {
  return sha256d(concat(TAG_ALCOVE, u32(etageDe(etage)), utf8(`${c.maitre}:${c.n}`)));
}

/** Le coffret de l'alcôve : gemme, élixir (espèce lue dans le glyphe) ou capsule. */
export function coffretDe(etage: number, c: Pick<Coffre, "maitre" | "n" | "chaine">): ObjetPorte {
  const g = graineAlcove(etage, c);
  const tip = c.chaine[c.chaine.length - 1];
  const hauteur = tip?.hauteur ?? 0;
  const age = quartierDe(etageDe(etage));
  const muse = biomeDe(etage).id;
  const sorte = g[0]! % 3;
  if (sorte === 1) {
    const espece = (["sel", "mercure", "soufre"] as const)[g[1]! % 3]!;
    return elixirDansCoffre(c, g, age, espece, muse);
  }
  if (sorte === 2) return capsuleDepuisGraine(g, age, hauteur, muse);
  const o = objetDepuisGraine(g, age);
  return habille({ mot: o.mot, archetype: muse, age, nonce: g[8]!, hauteur }, g[9]!, {
    genre: "gemme",
    emplacement: null,
    affixe: affixeDe(g[9]!),
    sockets: 0,
    gemmes: [],
    nom: affixeDe(g[9]!),
    palierLair: null,
  });
}

export type AlcoveKo = { ok: false; code: "aucune" | "deja" };
export type AlcoveOk = { ok: true; coffre: Coffre; coffret: ObjetPorte };

export function ouvrirAlcove(c: Coffre, etage: number): AlcoveOk | AlcoveKo {
  const e = etageDe(etage);
  if (!aUneAlcove(e)) return { ok: false, code: "aucune" };
  const t = tourDe(c);
  if (t.alcoves.includes(e)) return { ok: false, code: "deja" };
  const coffret = coffretDe(e, c);
  return {
    ok: true,
    coffret,
    coffre: {
      ...c,
      objets: [...(c.objets ?? []), coffret],
      tour: { ...t, alcoves: [...t.alcoves, e] },
    },
  };
}

// ---------------------------------------------------------------------------
// Échos
// ---------------------------------------------------------------------------

export function enEcho(a: number, b: number): boolean {
  const x = etageDe(a);
  const y = etageDe(b);
  if (x === y) return false;
  return memeOrbite(coupeDe(x), coupeDe(y));
}

/** Les paires en écho du quartier, (bas, haut), dans l'ordre. */
export function echosDuQuartier(age: NomAge): [number, number][] {
  const q = QUARTIERS.find((x) => x.age === age);
  if (!q) return [];
  const out: [number, number][] = [];
  for (let a = q.de; a <= q.a; a++)
    for (let b = a + 1; b <= q.a; b++) if (enEcho(a, b)) out.push([a, b]);
  return out;
}

export function echosDeLaTour(): [number, number][] {
  return QUARTIERS.flatMap((q) => echosDuQuartier(q.age));
}

export function graineEcho(a: number, b: number, c: Pick<Coffre, "maitre" | "n">): Uint8Array {
  return sha256d(concat(TAG_ECHO, u32(etageDe(a)), u32(etageDe(b)), utf8(`${c.maitre}:${c.n}`)));
}

/** Les échos que l'arrivée à `b` accomplit : a en écho, a ≥ départ de la montée, pas encore parcouru. */
export function echosAccomplis(t: Tour, b: number): [number, number][] {
  const out: [number, number][] = [];
  const y = etageDe(b);
  for (let a = t.depuis; a < y; a++) {
    if (!enEcho(a, y)) continue;
    if (t.echos.some((p) => p[0] === a && p[1] === y)) continue;
    out.push([a, y]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Déplacement — la jauge suit, les échos se lisent à l'arrivée
// ---------------------------------------------------------------------------

export type Arrivee = { coffre: Coffre; echos: [number, number][]; dons: ObjetPorte[] };

/**
 * Arrive à l'étage. Monter garde `depuis` ; descendre le pose à l'arrivée.
 * La capture libérée ne vaut que pour un étage : elle est rendue.
 * Le passage d'une porte est noté par le sens de montée (le portier a déjà lu le sceau).
 */
export function arriverDansCoffre(c: Coffre, etage: number): Arrivee {
  const t = tourDe(c);
  const e = etageDe(etage);
  if (e === t.etage) return { coffre: c, echos: [], dons: [] };
  const monte = e > t.etage;
  const depuis = monte ? t.depuis : e;
  const portes = [...t.portes];
  if (monte && PORTES.includes(e)) {
    const age = quartierDe(e);
    if (!portes.includes(age)) portes.push(age);
  }
  let next: Tour = { ...t, etage: e, sommet: Math.max(t.sommet, e), depuis, portes, liberee: null };
  const echos = monte ? echosAccomplis(next, e) : [];
  const dons: ObjetPorte[] = [];
  let objets = c.objets ?? [];
  for (const [a, b] of echos) {
    const don = elixirDansCoffre(c, graineEcho(a, b, c), quartierDe(b), "mercure", biomeDe(b).id);
    dons.push(don);
    objets = [...objets, don];
    next = { ...next, echos: [...next.echos, [a, b]] };
  }
  return { coffre: { ...c, objets, tour: next }, echos, dons };
}

// ---------------------------------------------------------------------------
// Antres
// ---------------------------------------------------------------------------

export type Gardien = {
  etage: number;
  q: Q;
  classe: SignatureId;
  seuil: "elite" | "supreme";
  essais: number;
};

export const ESSAIS_GARDIEN = 65_536;

export function graineGardien(etage: number): Uint8Array {
  return sha256d(concat(TAG_GARDIEN, u32(etageDe(etage))));
}

/** Le gardien : cherché depuis sa graine jusqu'à tenir l'axe de la coupe. Déterministe. */
export function gardienDe(etage: number): Gardien {
  const e = etageDe(etage);
  const g = graineGardien(e);
  const coupe = coupeDe(e);
  const seuil = PORTES.includes(e) ? "supreme" : "elite";
  const tient = seuil === "supreme" ? tientAxeSupreme : tientAxeElite;
  for (let k = 0; k < ESSAIS_GARDIEN; k++) {
    const q = quadrupleDepuis(sha256d(concat(g, u32(k))));
    if (tient(q, coupe)) return { etage: e, q, classe: biomeDe(e).id, seuil, essais: k + 1 };
  }
  /* jamais atteint en pratique : la coupe elle-même tient son axe */
  return { etage: e, q: coupe, classe: biomeDe(e).id, seuil, essais: ESSAIS_GARDIEN };
}

/** La bande qu'ouvre un ticket : celle de son palier (les tickets de la ville, 1–3, ouvrent la bande de Thalie). */
export function bandeDuTicket(o: Pick<ObjetPorte, "palierLair">): number {
  return bandeDe(o.palierLair ?? 0).bande;
}

/** Indice d'un ticket de la bande de l'étage, ou −1. */
export function ticketPour(c: Pick<Coffre, "objets">, etage: number): number {
  const bande = bandeDe(etage).bande;
  return (c.objets ?? []).findIndex((o) => o.genre === "lair" && bandeDuTicket(o) === bande);
}

/** Tenue d'un ensemble, le sel lisant le destructif neutre. */
export function tenueLue(
  membres: readonly Membre[],
  sel: boolean,
): { paires: LecturePaire[]; tenue: bigint } {
  const paires: LecturePaire[] = [];
  let tenue = 0n;
  for (let i = 0; i < membres.length; i++) {
    for (let j = i + 1; j < membres.length; j++) {
      const p = paireDe(membres[i]!, membres[j]!, i, j);
      const mag = p.dot < 0n ? -p.dot : p.dot;
      if (p.polarite === "constructif") tenue += mag;
      else if (p.polarite === "destructif" && !sel) tenue -= mag;
      paires.push(sel && p.polarite === "destructif" ? { ...p, polarite: "neutre" } : p);
    }
  }
  return { paires, tenue };
}

export type Duel = {
  gardien: Gardien;
  porte: ObjetPorte | null;
  orbite: boolean;
  tientAxe: boolean;
  mercure: boolean;
  parade: boolean;
  sel: boolean;
  tenue: bigint;
  resonance: boolean;
  temps: 1 | 2 | 3 | null;
  passage: boolean;
};

/** Le duel, lu : trois temps, sans points de vie. Rien n'est gravé. */
export function lireDuel(c: Coffre, etage: number): Duel {
  const e = etageDe(etage);
  const gardien = gardienDe(e);
  const porte = porteurDe(c);
  const qA = porte ? qDeMot(porte.mot) : null;
  const orbite = qA ? memeOrbiteLue(qA, gardien.q) : false;
  const tient = qA ? tientAxeElite(qA, coupeDe(e)) : false;
  const mercure = especeActive(c, e, "mercure");
  const parade = tient || mercure;
  const sel = especeActive(c, e, "sel");
  const liberee = libereeDe(c);
  const membres: Membre[] = (c.objets ?? [])
    .filter((o) => o.genre !== "capture" && o.genre !== "elixir" && o.genre !== "capsule")
    .map((o) => ({ q: qDeMot(o.mot), classe: o.archetype }));
  if (liberee) membres.push({ q: qDeMot(liberee.mot), classe: liberee.archetype });
  membres.push({ q: gardien.q, classe: gardien.classe });
  const { tenue } = tenueLue(membres, sel);
  const resonance = tenue > 0n;
  const temps = orbite ? 1 : parade ? 2 : resonance ? 3 : null;
  return {
    gardien,
    porte,
    orbite,
    tientAxe: tient,
    mercure,
    parade,
    sel,
    tenue,
    resonance,
    temps,
    passage: temps !== null,
  };
}

export function graineAntre(etage: number, c: Pick<Coffre, "maitre" | "n">): Uint8Array {
  return sha256d(concat(TAG_ANTRE, u32(etageDe(etage)), utf8(`${c.maitre}:${c.n}`)));
}

/** Le don d'antre : gemme ou pierre, de rang 3, toujours. */
export function donAntre(etage: number, c: Pick<Coffre, "maitre" | "n" | "chaine">): ObjetPorte {
  const g = graineAntre(etage, c);
  const tip = c.chaine[c.chaine.length - 1];
  const age = quartierDe(etageDe(etage));
  const o = objetDepuisGraine(g, age);
  const affixe = g[1]! & 1 ? "T3" : "S3";
  const genre = g[0]! & 1 ? "gemme" : "pierre";
  return habille(
    { mot: o.mot, archetype: biomeDe(etage).id, age, nonce: g[8]!, hauteur: tip?.hauteur ?? 0 },
    g[9]!,
    {
      genre,
      emplacement: null,
      affixe,
      sockets: 0,
      gemmes: [],
      nom: affixe,
      palierLair: null,
    },
  );
}

export type AntreKo = {
  ok: false;
  code: "ticket" | "deja" | "repousse";
  coffre: Coffre;
  duel: Duel | null;
};
export type AntreOk = { ok: true; coffre: Coffre; don: ObjetPorte; duel: Duel };

/** Franchit l'antre de l'étage avec un ticket de la bande. Repoussé : un étage de moins, le ticket reste. */
export function franchirAntre(c: Coffre, etage: number): AntreOk | AntreKo {
  const e = etageDe(etage);
  const t = tourDe(c);
  if (t.antres.includes(e)) return { ok: false, code: "deja", coffre: c, duel: null };
  const i = ticketPour(c, e);
  if (i < 0) return { ok: false, code: "ticket", coffre: c, duel: null };
  const duel = lireDuel(c, e);
  if (!duel.passage) {
    const bas = Math.max(0, e - 1);
    const repousse = arriverDansCoffre(c, bas).coffre;
    return { ok: false, code: "repousse", coffre: repousse, duel };
  }
  const don = donAntre(e, c);
  const objets = (c.objets ?? []).filter((_, k) => k !== i);
  return {
    ok: true,
    duel,
    don,
    coffre: { ...c, objets: [...objets, don], tour: { ...t, antres: [...t.antres, e] } },
  };
}

// ---------------------------------------------------------------------------
// Observatoire — lecture, aucun don
// ---------------------------------------------------------------------------

export type LectureObservatoire = {
  etage: number;
  honores: number;
  echos: number;
  antres: number;
  alcoves: number;
  captures: number;
  /** mots notés, jamais réutilisables : élixirs bus, captures accordées */
  bus: number;
  portes: NomAge[];
};

export function lectureObservatoire(c: Pick<Coffre, "tour">): LectureObservatoire {
  const t = tourDe(c);
  return {
    etage: OBSERVATOIRE,
    honores: t.dons.length,
    echos: t.echos.length,
    antres: t.antres.length,
    alcoves: t.alcoves.length,
    captures: t.captures.length,
    bus: t.bus.length,
    portes: t.portes,
  };
}

export function estObservatoire(etage: number): boolean {
  return etageDe(etage) === OBSERVATOIRE;
}
