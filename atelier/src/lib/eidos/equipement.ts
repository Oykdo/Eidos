/**
 * Équipement du coffre — jauge. Le mot ne mute pas.
 * Pierre : tourne (préfixe T à gauche, suffixe S à droite) → nouvelle pièce.
 * Gemme : s'enchâsse, lecture composée, mot inchangé.
 * Philosophale : coffres 1–10, une arme divine. Même norme.
 * Lair : ticket d'antre, combat plus tard.
 */

import { composer, objetDepuisGraine, paqueter } from "./objets.ts";
import { sha256d, utf8 } from "./hash.ts";
import type {
  Affixe,
  Coffre,
  Emplacement,
  EmplacementArmure,
  Genre,
  NomAge,
  ObjetPorte,
} from "./types.ts";

export type { Affixe, Emplacement, EmplacementArmure, Genre };

export const GENRES = [
  "trouve",
  "pierre",
  "arme",
  "armure",
  "gemme",
  "philosophale",
  "lair",
] as const;

export const EMPLACEMENTS_ARMURE = [
  "casque",
  "plastron",
  "epaulieres",
  "gants",
  "bottes",
  "amulette",
  "anneau1",
  "anneau2",
  "accessoire",
] as const;

export const NOMS_ARME = [
  "Lance",
  "Faux",
  "Arc",
  "Lame",
  "Fronde",
  "Sceptre",
  "Aiguille",
] as const;
export type NomArme = (typeof NOMS_ARME)[number];

export const AFFIXES = ["T1", "T2", "T3", "S1", "S2", "S3"] as const;

export const COFFRES_PHILO = 10;
export const SOCKETS_MAX = 2;

const G: readonly (readonly [number, number, number, number])[] = [
  [719, 80, 0, 0],
  [719, 0, 80, 0],
  [719, 0, 0, 80],
];

export function generateurDe(rang: 1 | 2 | 3): number {
  return paqueter(G[rang - 1]!);
}

export function affixeDe(roll: number): Affixe {
  return AFFIXES[((roll % 6) + 6) % 6]!;
}

export function rangAffixe(a: Affixe): 1 | 2 | 3 {
  return Number(a[1]) as 1 | 2 | 3;
}

export function estPrefixe(a: Affixe): boolean {
  return a[0] === "T";
}

export function pierreDe(affixe: Affixe): { affixe: Affixe; mot: number } {
  return { affixe, mot: generateurDe(rangAffixe(affixe)) };
}

/** T·q ou q·S. Le résultat est un autre mot. */
export function tourner(mot: number, affixe: Affixe): number {
  const g = generateurDe(rangAffixe(affixe));
  return estPrefixe(affixe) ? composer(g, mot) : composer(mot, g);
}

export function genreDeRoll(roll: number): Genre {
  const r = ((roll % 32) + 32) % 32;
  if (r < 8) return "armure";
  if (r < 12) return "arme";
  if (r < 18) return "pierre";
  if (r < 22) return "gemme";
  if (r < 25) return "lair";
  return "armure";
}

export function emplacementDe(genre: Genre, roll: number): Emplacement | null {
  if (genre === "arme") return "arme";
  if (genre === "armure") {
    return EMPLACEMENTS_ARMURE[((roll % 9) + 9) % 9]!;
  }
  return null;
}

export function socketsDe(genre: Genre, roll: number): number {
  if (genre === "armure") return roll % (SOCKETS_MAX + 1);
  if (genre === "arme") return roll & 1 ? (roll % (SOCKETS_MAX + 1)) : 0;
  return 0;
}

export function nomDe(genre: Genre, emplacement: Emplacement | null, roll: number): string {
  if (genre === "arme") return NOMS_ARME[((roll % 7) + 7) % 7]!;
  if (genre === "armure" && emplacement && emplacement !== "arme") return emplacement;
  if (genre === "pierre" || genre === "gemme") return affixeDe(roll);
  if (genre === "lair") return `lair-${1 + (roll % 3)}`;
  if (genre === "philosophale") return "philosophale";
  if (genre === "trouve") return "trouve";
  return genre;
}

export function peutEnchasser(o: ObjetPorte): boolean {
  if (o.genre !== "arme" && o.genre !== "armure") return false;
  return (o.gemmes?.length ?? 0) < (o.sockets ?? 0);
}

export function motEffectif(o: ObjetPorte): number {
  let m = o.mot >>> 0;
  for (const g of o.gemmes ?? []) m = tourner(m, g);
  return m;
}

export function peutPhilosopher(c: Pick<Coffre, "nature" | "n" | "philosophale">): boolean {
  if (c.nature !== "personnel") return false;
  if (c.n < 1 || c.n > COFFRES_PHILO) return false;
  if (c.philosophale) return false;
  return true;
}

export function habille(
  base: {
    mot: number;
    archetype: string;
    age: NomAge;
    nonce: number;
    hauteur: number;
  },
  roll: number,
  extra?: Partial<ObjetPorte>,
): ObjetPorte {
  const genre = extra?.genre ?? genreDeRoll(roll);
  const emplacement = extra?.emplacement ?? emplacementDe(genre, roll);
  const affixe =
    extra?.affixe ?? (genre === "pierre" || genre === "gemme" ? affixeDe(roll) : null);
  return {
    mot: base.mot >>> 0,
    archetype: base.archetype,
    age: base.age,
    nonce: base.nonce & 65535,
    hauteur: base.hauteur | 0,
    genre,
    emplacement,
    affixe,
    sockets: extra?.sockets ?? socketsDe(genre, roll),
    gemmes: extra?.gemmes ? extra.gemmes.filter((a) => AFFIXES.includes(a)) : [],
    nom: extra?.nom ?? nomDe(genre, emplacement, roll),
    palierLair: extra?.palierLair ?? (genre === "lair" ? 1 + (roll % 3) : null),
  };
}

export type CraftKo = { ok: false; code: "type" | "socket" | "vide" };
export type CraftOk<T> = { ok: true; coffre: T; objet: ObjetPorte };
export type Craft<T = Coffre> = CraftOk<T> | CraftKo;

function pieceEtMod(a: ObjetPorte, b: ObjetPorte): { piece: ObjetPorte; mod: ObjetPorte } | null {
  const piece = (x: ObjetPorte) => x.genre === "arme" || x.genre === "armure";
  const mod = (x: ObjetPorte) => x.genre === "pierre" || x.genre === "gemme";
  if (piece(a) && mod(b)) return { piece: a, mod: b };
  if (piece(b) && mod(a)) return { piece: b, mod: a };
  return null;
}

/** Pierre → nouvelle pièce (l'ancienne est consommée). Gemme → enchâssée. */
export function craftDansCoffre<T extends { objets: ObjetPorte[] }>(c: T, i: number, j: number): Craft<T> {
  const objets = c.objets ?? [];
  const a = objets[i];
  const b = objets[j];
  if (!a || !b || i === j) return { ok: false, code: "vide" };
  const pair = pieceEtMod(a, b);
  if (!pair) return { ok: false, code: "type" };
  const { piece, mod } = pair;
  if (mod.genre === "gemme") {
    if (!peutEnchasser(piece) || !mod.affixe) return { ok: false, code: "socket" };
    const neuve: ObjetPorte = {
      ...piece,
      gemmes: [...piece.gemmes, mod.affixe],
    };
    const rest = objets.filter((_, k) => k !== i && k !== j);
    return { ok: true, objet: neuve, coffre: { ...c, objets: [...rest, neuve] } };
  }
  if (!mod.affixe) return { ok: false, code: "type" };
  const mot = tourner(piece.mot, mod.affixe);
  const neuve: ObjetPorte = {
    ...piece,
    mot,
    gemmes: piece.gemmes,
  };
  const rest = objets.filter((_, k) => k !== i && k !== j);
  return { ok: true, objet: neuve, coffre: { ...c, objets: [...rest, neuve] } };
}

export function divinDansCoffre(c: Coffre, nom: NomArme): Craft {
  if (!peutPhilosopher(c)) return { ok: false, code: "type" };
  if (!(NOMS_ARME as readonly string[]).includes(nom)) return { ok: false, code: "type" };
  const tip = c.chaine[c.chaine.length - 1];
  const age: NomAge = "Satya";
  const o = objetDepuisGraine(sha256d(utf8(`eidos-divin/${c.maitre}/${nom}`)), age);
  const porte = habille(
    {
      mot: o.mot,
      archetype: o.archetype,
      age: o.age,
      nonce: 0,
      hauteur: tip?.hauteur ?? 0,
    },
    8,
    { genre: "arme", emplacement: "arme", nom, sockets: 2, affixe: null, palierLair: null },
  );
  return {
    ok: true,
    objet: porte,
    coffre: { ...c, philosophale: nom, objets: [...(c.objets ?? []), porte] },
  };
}
