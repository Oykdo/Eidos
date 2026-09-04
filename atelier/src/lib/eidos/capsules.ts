/**
 * Capsules et captures — prendre un occupant sans le tuer.
 *
 * Une capsule est un objet de genre `capsule`, un glyphe creux « ··· » : un
 * mot comme les autres, rien dedans. Elle vient de Thalie (une par poste du
 * jour honoré : trois blocs, un jour civil), d'une alcôve, ou de la forge d'Érato (gemme +
 * élixir de sel → capsule au mot de la gemme).
 *
 * La prise, face à un occupant q, capsule de mot c, objet porté g — trois
 * temps, sans hasard, la grammaire de l'antre :
 *   1. orbite   figureOrbite(c) = figureOrbite(q)            prise nette
 *   2. parade   g c ḡ tient l'axe de q au seuil élite          prise fragile :
 *               tient si le sel est bu à cet étage, sinon l'occupant s'échappe
 *   3. sinon    capsule brisée, retirée de la jauge ; rien d'autre n'est perdu
 * Une capsule qui tourne (pierres T/S) change d'orbite : c'est ainsi qu'on
 * l'accorde. Chercher la bonne pierre est le jeu.
 *
 * L'occupant pris devient un objet `capture` : mot = motDeQ(q), archétype =
 * sa classe, âge = le quartier. L'occupant garde son mot ; pour ce coffre il
 * n'est plus à l'étage, et la résonance de l'étage change. Le nom vient du
 * lexique (9 × 12) : une jauge, pas une identité.
 *
 * LIMITE : deux occupants de mots égaux à l'arrondi du mot se confondraient
 * dans `normaliserObjets` ; sur 491 occupants, aucun.
 */

import { FIGURES } from "./constantes.ts";
import { type Q } from "./cosmos.ts";
import { habille } from "./equipement.ts";
import { especeDePorte } from "./elixirs.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { nomCapture } from "./hotes-lexique.ts";
import { especeBueA, estPris, tourDe } from "./jauge.ts";
import { figureOrbite, memeOrbiteLue, motDeQ, paradeLue } from "./lecture.ts";
import { objetDepuisGraine, type Objet } from "./objets.ts";
import { jourCivil, minesDuJour } from "./poste.ts";
import { qDeMot, resonanceDe, type LectureEnsemble } from "./resonance.ts";
import { quartierDe } from "./sceaux.ts";
import type { SignatureId } from "./signatures.ts";
import { etageDe, occupantsDe, type Occupant } from "./tour.ts";
import type { Coffre, NomAge, ObjetPorte } from "./types.ts";

export const TAG_CAPSULE = utf8("eidos-capsule/1");
export const NOM_CAPSULE = FIGURES[0]!.repeat(3);
export const BLOCS_PAR_CAPSULE = 3;

export function estCapsule(o: Pick<ObjetPorte, "genre">): boolean {
  return o.genre === "capsule";
}

export function estCapture(o: Pick<ObjetPorte, "genre">): boolean {
  return o.genre === "capture";
}

/** L'objet porté dans la Tour : `tour.porte`, sinon le dernier objet qui n'est ni élixir, ni capsule, ni capture. */
export function porteurDe(c: Pick<Coffre, "objets" | "tour">): ObjetPorte | null {
  const objets = c.objets ?? [];
  const t = tourDe(c);
  if (t.porte !== null) {
    const o = objets.find((x) => x.mot >>> 0 === t.porte);
    if (o) return o;
  }
  for (let i = objets.length - 1; i >= 0; i--) {
    const o = objets[i]!;
    if (o.genre !== "elixir" && o.genre !== "capsule" && o.genre !== "capture") return o;
  }
  return null;
}

export function habillerCapsule(o: Objet, hauteur: number, nonce: number): ObjetPorte {
  return habille(
    { mot: o.mot, archetype: o.archetype, age: o.age, nonce: nonce & 65535, hauteur },
    nonce,
    {
      genre: "capsule",
      emplacement: null,
      affixe: null,
      sockets: 0,
      gemmes: [],
      nom: NOM_CAPSULE,
      palierLair: null,
    },
  );
}

export function capsuleDepuisGraine(
  graine: Uint8Array,
  age: NomAge,
  hauteur: number,
  archetype?: SignatureId,
): ObjetPorte {
  const o = objetDepuisGraine(graine, age);
  return habillerCapsule(
    archetype ? { ...o, archetype } : o,
    hauteur,
    (graine[8]! << 8) | graine[9]!,
  );
}

export type CapsuleThalieKo = { ok: false; code: "poste" };
export type CapsuleThalieOk = { ok: true; coffre: Coffre; capsule: ObjetPorte };

/**
 * Thalie, au sol : une capsule vide par poste du jour honoré — trois blocs
 * créés aujourd'hui, une capsule, notée dans `tour.capsules` par jour civil.
 */
export function capsuleDeThalie(c: Coffre, ts = Date.now()): CapsuleThalieOk | CapsuleThalieKo {
  const t = tourDe(c);
  const mines = minesDuJour(c, ts);
  if (mines < BLOCS_PAR_CAPSULE) return { ok: false, code: "poste" };
  const jour = jourCivil(ts);
  if (t.capsules.includes(jour)) return { ok: false, code: "poste" };
  const tip = c.chaine[c.chaine.length - 1];
  const g = sha256d(concat(TAG_CAPSULE, utf8(`${c.maitre}:${c.n}`), u32(jour)));
  const capsule = capsuleDepuisGraine(g, "Kali", tip?.hauteur ?? 0, "terre");
  return {
    ok: true,
    capsule,
    coffre: {
      ...c,
      objets: [...(c.objets ?? []), capsule],
      tour: { ...t, capsules: [...t.capsules, jour] },
    },
  };
}

export type ForgerKo = { ok: false; code: "gemme" | "sel" | "vide" };
export type ForgerOk = { ok: true; coffre: Coffre; capsule: ObjetPorte };

/** Érato : une gemme et un élixir de sel → une capsule au mot de la gemme. Les deux sont consommés. */
export function forgerCapsule(c: Coffre, iGemme: number, iSel: number): ForgerOk | ForgerKo {
  const objets = c.objets ?? [];
  const g = objets[iGemme];
  const s = objets[iSel];
  if (!g || !s || iGemme === iSel) return { ok: false, code: "vide" };
  if (g.genre !== "gemme") return { ok: false, code: "gemme" };
  if (s.genre !== "elixir" || especeDePorte(s) !== "sel") return { ok: false, code: "sel" };
  const tip = c.chaine[c.chaine.length - 1];
  const capsule = habillerCapsule(
    { mot: g.mot >>> 0, archetype: g.archetype as SignatureId, age: g.age },
    tip?.hauteur ?? 0,
    g.nonce,
  );
  const t = tourDe(c);
  const rest = objets.filter((_, k) => k !== iGemme && k !== iSel);
  return {
    ok: true,
    capsule,
    coffre: { ...c, objets: [...rest, capsule], tour: { ...t, bus: [...t.bus, s.mot >>> 0] } },
  };
}

// ---------------------------------------------------------------------------
// La prise
// ---------------------------------------------------------------------------

export type Prise = {
  /** figure d'orbite de la capsule et de l'occupant */
  figures: [number, number];
  orbite: boolean;
  parade: boolean;
  sel: boolean;
  temps: 1 | 2 | 3;
  issue: "nette" | "fragile" | "echappe" | "brisee";
};

export function lirePrise(
  capsule: Pick<ObjetPorte, "mot">,
  porte: Pick<ObjetPorte, "mot"> | null,
  occupant: Occupant,
  sel: boolean,
): Prise {
  const qc = qDeMot(capsule.mot);
  const figures: [number, number] = [figureOrbite(qc), figureOrbite(occupant.q)];
  const orbite = memeOrbiteLue(qc, occupant.q);
  const parade = porte ? paradeLue(qDeMot(porte.mot), qc, occupant.q) : false;
  if (orbite) return { figures, orbite, parade, sel, temps: 1, issue: "nette" };
  if (parade) return { figures, orbite, parade, sel, temps: 2, issue: sel ? "fragile" : "echappe" };
  return { figures, orbite, parade, sel, temps: 3, issue: "brisee" };
}

export function captureDe(occupant: Occupant, etage: number, hauteur: number): ObjetPorte {
  const mot = motDeQ(occupant.q);
  const age = quartierDe(etageDe(etage));
  return habille(
    { mot, archetype: occupant.classe, age, nonce: (etageDe(etage) << 2) | occupant.k, hauteur },
    mot,
    {
      genre: "capture",
      emplacement: null,
      affixe: null,
      sockets: 0,
      gemmes: [],
      nom: nomCapture(occupant.classe, mot % 12),
      palierLair: null,
    },
  );
}

/** Les occupants encore à l'étage pour ce coffre. */
export function occupantsRestants(c: Pick<Coffre, "tour">, etage: number): Occupant[] {
  const t = tourDe(c);
  return occupantsDe(etage).filter((o) => !estPris(t, etage, o.k));
}

/** La résonance de l'étage, une fois les pris retirés : un secret de plus, qui se lit. */
export function resonanceEtageDuCoffre(c: Pick<Coffre, "tour">, etage: number): LectureEnsemble {
  return resonanceDe(occupantsRestants(c, etage).map((o) => ({ q: o.q, classe: o.classe })));
}

export type PrendreKo = {
  ok: false;
  code: "capsule" | "occupant" | "pris" | "echappe" | "brisee";
  coffre: Coffre;
  prise: Prise | null;
};
export type PrendreOk = { ok: true; coffre: Coffre; capture: ObjetPorte; prise: Prise };

/** Tente la prise de l'occupant k de l'étage avec la capsule d'indice i. */
export function prendreDansCoffre(
  c: Coffre,
  etage: number,
  k: number,
  i: number,
): PrendreOk | PrendreKo {
  const objets = c.objets ?? [];
  const capsule = objets[i];
  if (!capsule || capsule.genre !== "capsule")
    return { ok: false, code: "capsule", coffre: c, prise: null };
  const occ = occupantsDe(etage).find((o) => o.k === k);
  if (!occ) return { ok: false, code: "occupant", coffre: c, prise: null };
  const t = tourDe(c);
  if (estPris(t, etage, k)) return { ok: false, code: "pris", coffre: c, prise: null };
  const sel = especeBueA(t, etage, "sel");
  const prise = lirePrise(capsule, porteurDe(c), occ, sel);
  const rest = objets.filter((_, j) => j !== i);
  if (prise.issue === "echappe") return { ok: false, code: "echappe", coffre: c, prise };
  if (prise.issue === "brisee")
    return { ok: false, code: "brisee", coffre: { ...c, objets: rest }, prise };
  const tip = c.chaine[c.chaine.length - 1];
  const capture = captureDe(occ, etage, tip?.hauteur ?? 0);
  return {
    ok: true,
    prise,
    capture,
    coffre: {
      ...c,
      objets: [...rest, capture],
      tour: { ...t, captures: [...t.captures, [etageDe(etage), k]] },
    },
  };
}

/** Libère une capture pour l'étage courant (au plus une), ou aucune. */
export function libererDansCoffre(c: Coffre, mot: number | null): Coffre {
  const t = tourDe(c);
  if (mot === null) return { ...c, tour: { ...t, liberee: null } };
  const o = (c.objets ?? []).find((x) => x.mot >>> 0 === mot >>> 0 && x.genre === "capture");
  if (!o) return c;
  return { ...c, tour: { ...t, liberee: mot >>> 0 } };
}

export function libereeDe(c: Pick<Coffre, "objets" | "tour">): ObjetPorte | null {
  const t = tourDe(c);
  if (t.liberee === null) return null;
  return (c.objets ?? []).find((x) => x.mot >>> 0 === t.liberee && x.genre === "capture") ?? null;
}

export function qDeCapture(o: Pick<ObjetPorte, "mot">): Q {
  return qDeMot(o.mot);
}
