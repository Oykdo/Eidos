/**
 * Élixirs — la tria prima, à boire un étage.
 *
 * Un élixir est un objet de genre `elixir` : un mot, un archétype, un âge.
 * Son espèce est l'étage dominant de son glyphe (les trois étages du sceau) :
 * sel (○, étage 0), mercure (☽, étage 1), soufre (✚, étage 2).
 *   sel      une résonance destructive est lue neutre         stabilité
 *   mercure  la parade est accordée d'office (temps 2)         mobilité
 *   soufre   une pierre tourne une pièce sans forgeronne       transmutation
 * Il se boit à un étage : l'effet tient à cet étage, puis l'objet est retiré
 * de la jauge. Le mot n'est pas réécrit ; il est noté dans `tour.bus`, jamais
 * réutilisable, et `tour.elixirs` garde (étage, mot, espèce) pour relire
 * l'effet. Un élixir ne s'achète pas : hôte, alcôve ou écho.
 *
 * LIMITE : aucun élixir ne touche la norme, les axes, ni le mot d'un objet.
 * Le soufre transmute une fois : `tour.bus` note le mot, l'effet s'éteint
 * quand la pièce a tourné (secrets.ts / hotes.ts n'en dépendent pas).
 */

import { concat, sha256d, u32 } from "./hash.ts";
import { habille } from "./equipement.ts";
import { especeBueA, tourDe } from "./jauge.ts";
import { glypheDe } from "./lecture.ts";
import { objetDepuisGraine, type Objet } from "./objets.ts";
import { TRIA_PRIMA, type SignatureId } from "./signatures.ts";
import { etageDe } from "./tour.ts";
import type { Coffre, Espece, NomAge, ObjetPorte } from "./types.ts";

export type { Espece };

export const ESPECES = ["sel", "mercure", "soufre"] as const;

/** Fioles : la figure de l'espèce entre deux vides. */
export const FIOLES: Record<Espece, string> = {
  sel: "·○·",
  mercure: "·☽·",
  soufre: "·✚·",
};

/** Étage dominant du glyphe : la plus haute figure ; à égalité, le plus bas. */
export function etageDominant(etages: readonly [number, number, number]): 0 | 1 | 2 {
  let best: 0 | 1 | 2 = 0;
  for (const i of [1, 2] as const) if (etages[i] > etages[best]) best = i;
  return best;
}

export function especeDe(o: Objet): Espece {
  return TRIA_PRIMA[etageDominant(glypheDe(o))].id;
}

export function especeDePorte(o: Pick<ObjetPorte, "mot" | "archetype" | "age">): Espece {
  return especeDe({ mot: o.mot >>> 0, archetype: o.archetype as SignatureId, age: o.age });
}

/**
 * Tire un élixir d'une espèce donnée : on avance la graine (‖ k) jusqu'à ce
 * que l'étage dominant soit le bon. Déterministe, trois essais en moyenne.
 */
export function objetElixir(
  graine: Uint8Array,
  age: NomAge,
  espece: Espece,
  archetype?: SignatureId,
): Objet {
  for (let k = 0; k < 4096; k++) {
    const g = k === 0 ? graine : sha256d(concat(graine, u32(k)));
    const o = objetDepuisGraine(g, age);
    const oo: Objet = archetype ? { ...o, archetype } : o;
    if (especeDe(oo) === espece) return oo;
  }
  throw new Error(`aucun élixir ${espece} depuis cette graine`);
}

export function habillerElixir(o: Objet, hauteur: number, nonce: number): ObjetPorte {
  return habille(
    { mot: o.mot, archetype: o.archetype, age: o.age, nonce: nonce & 65535, hauteur },
    nonce,
    {
      genre: "elixir",
      emplacement: null,
      affixe: null,
      sockets: 0,
      gemmes: [],
      nom: especeDe(o),
      palierLair: null,
    },
  );
}

/** Un élixir prêt pour le coffre, à la hauteur de sa tête. */
export function elixirDansCoffre(
  c: Pick<Coffre, "chaine">,
  graine: Uint8Array,
  age: NomAge,
  espece: Espece,
  archetype?: SignatureId,
): ObjetPorte {
  const tip = c.chaine[c.chaine.length - 1];
  const o = objetElixir(graine, age, espece, archetype);
  return habillerElixir(o, tip?.hauteur ?? 0, (graine[8]! << 8) | graine[9]!);
}

/** L'espèce est-elle bue à cet étage ? Lecture de la jauge. */
export function especeActive(c: Pick<Coffre, "tour">, etage: number, espece: Espece): boolean {
  return especeBueA(tourDe(c), etage, espece);
}

export type BoireKo = { ok: false; code: "objet" | "deja" | "genre" };
export type BoireOk = { ok: true; coffre: Coffre; espece: Espece; etage: number };
export type Boire = BoireOk | BoireKo;

/** Boit l'élixir d'indice i à l'étage : effet noté pour cet étage, objet retiré, mot noté. */
export function boireDansCoffre(c: Coffre, i: number, etage: number): Boire {
  const objets = c.objets ?? [];
  const o = objets[i];
  if (!o) return { ok: false, code: "objet" };
  if (o.genre !== "elixir") return { ok: false, code: "genre" };
  const t = tourDe(c);
  const e = etageDe(etage);
  const mot = o.mot >>> 0;
  if (t.bus.includes(mot)) return { ok: false, code: "deja" };
  const espece = especeDePorte(o);
  const rest = objets.filter((_, k) => k !== i);
  return {
    ok: true,
    espece,
    etage: e,
    coffre: {
      ...c,
      objets: rest,
      tour: {
        ...t,
        bus: [...t.bus, mot],
        elixirs: [...t.elixirs, { etage: e, mot, espece }],
      },
    },
  };
}

/** Le soufre s'éteint quand la pièce a tourné : une fois. */
export function eteindreSoufre(c: Coffre, etage: number): Coffre {
  const t = tourDe(c);
  const e = etageDe(etage);
  const i = t.elixirs.findIndex((x) => x.etage === e && x.espece === "soufre");
  if (i < 0) return c;
  return { ...c, tour: { ...t, elixirs: t.elixirs.filter((_, k) => k !== i) } };
}
