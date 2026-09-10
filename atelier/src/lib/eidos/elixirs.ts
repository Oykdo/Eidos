/**
 * Élixirs — la tria prima, puis ses douze espèces, à boire un étage.
 *
 * Un élixir est un objet de genre `elixir` : un mot, un archétype, un âge.
 * Sa **famille** est l'étage dominant de son glyphe (les trois étages du
 * sceau) : sel (○, étage 0), mercure (☽, étage 1), soufre (✚, étage 2).
 *   sel      une résonance destructive est lue neutre         stabilité
 *   mercure  la parade est accordée d'office (temps 2)         mobilité
 *   soufre   une pierre tourne une pièce sans forgeronne       transmutation
 *
 * Un glyphe porte pourtant **trois étages à quatre états** — 64 codes — et la
 * famille n'en lisait que trois. Le **degré** lit exactement les deux figures
 * que la famille jette : `(e[(f+1)%3] + e[(f+2)%3]) mod 4`. Trois familles de
 * quatre degrés = **douze espèces**, aucune cellule vide, de 12,50 % à 3,125 %
 * (8/64 à 2/64 exactement). C'est une **lecture de plus**, pas une identité :
 * la famille, `especeDe`, `especeActive` et `boireDansCoffre` ne bougent pas
 * d'un octet, et le degré ne touche ni le mot, ni le sceau, ni la feuille.
 *
 * Les douze noms ne sont pas choisis : le code d'un glyphe **est** un caractère
 * de `chymie.ts` (6 bits des deux côtés, bijection sur 64), et le nom d'une
 * espèce est celui d'un caractère dont le code tombe dans sa cellule.
 *
 * Il se boit à un étage : l'effet tient à cet étage, puis l'objet est retiré
 * de la jauge. Le mot n'est pas réécrit ; il est noté dans `tour.bus`, jamais
 * réutilisable, et `tour.elixirs` garde (étage, mot, espèce) pour relire
 * l'effet. Un élixir ne s'achète pas : hôte, alcôve ou écho.
 *
 * LIMITE : aucun élixir ne touche la norme, les axes, ni le mot d'un objet.
 * Le soufre transmute une fois : `tour.bus` note le mot, l'effet s'éteint
 * quand la pièce a tourné (secrets.ts / hotes.ts n'en dépendent pas).
 *
 * LIMITE : `ELIXIRS` est une **donnée** — espèce, nom, lieu, coût en points
 * d'action, identifiant d'effet. La mécanique des neuf effets neufs vit dans
 * `tactique/`, qui n'a pas encore de points d'action ; rien ici ne la branche,
 * et le dosage 1/2 PA du §3 de SPEC_CHYMIE est une conception, pas une mesure.
 *
 * LIMITE : `tour.elixirs` ne retient que la famille (`ElixirBu`). Le degré
 * d'un élixir bu n'est donc pas relisible depuis la jauge — `boireDansCoffre`
 * le rend dans son résultat, et `ElixirBu` devra gagner son champ pour que la
 * Tour s'en souvienne.
 */

import { codeDuCaractere, uniDe } from "./chymie.ts";
import { concat, sha256d, u32 } from "./hash.ts";
import { habille } from "./equipement.ts";
import { codeDuGroupe, groupeDuCode } from "./glyphs.ts";
import { especeBueA, tourDe } from "./jauge.ts";
import { glypheDe } from "./lecture.ts";
import { feuilleObjet, objetDepuisGraine, type Objet } from "./objets.ts";
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

/* ------------------------------------------------------------------ *
 * Les douze espèces — la famille et son degré.
 * ------------------------------------------------------------------ */

export const DEGRES = [0, 1, 2, 3] as const;
export type Degre = (typeof DEGRES)[number];

/** `sel.0` … `soufre.3`. Douze, jamais treize : un élixir permanent est une puissance. */
export type EspeceDouze = `${Espece}.${Degre}`;

export type LieuElixir = "bataille" | "forge" | "route";

/** Ce que l'effet change — une **lecture** d'un terme, jamais un nombre de `combatDe`. */
export type EffetElixir =
  | "resonance-neutre"
  | "portee-plus-un"
  | "tenue-un"
  | "charge-nulle"
  | "pa-rendu"
  | "parade-accordee"
  | "pas-le-plus-vif"
  | "deux-pa"
  | "pierre-sans-forgeronne"
  | "forge-gratuite"
  | "porte-forge-speciale"
  | "route-avec-hote";

export type Elixir = {
  readonly id: EspeceDouze;
  readonly famille: Espece;
  readonly degre: Degre;
  /** id du signe de `chymie.ts` dont le nom est pris : son code tombe dans la cellule. */
  readonly signe: string;
  readonly fr: string;
  readonly en: string;
  readonly lieu: LieuElixir;
  /** Points d'action payés pour boire : 1 ou 2. */
  readonly pa: 1 | 2;
  /** Points d'action rendus par l'effet : 0, 1 (bain-marie), 2 (esprit de vin). */
  readonly paRendu: 0 | 1 | 2;
  readonly effet: EffetElixir;
  /** Clé i18n, `elixir.<famille>.<degré>`. */
  readonly cle: string;
  /** Effectif exact sur les 64 codes de glyphe. Somme = 64. */
  readonly cellules: number;
};

/**
 * Les douze, lues et non décrétées. Trois d'entre elles portent les effets qui
 * existent déjà : `sel.0` la résonance destructive lue neutre, `mercure.1` la
 * parade accordée, `soufre.0` la pierre qui tourne sans forgeronne.
 * Sel et mercure agissent en bataille ; le soufre à la forge et sur la route —
 * c'est sa définition depuis le premier jour de ce fichier.
 */
export const ELIXIRS: readonly Elixir[] = [
  { id: "sel.0", famille: "sel", degre: 0, signe: "selalkali", fr: "Sel alkali", en: "Alkali salt", lieu: "bataille", pa: 1, paRendu: 0, effet: "resonance-neutre", cle: "elixir.sel.0", cellules: 8 },
  { id: "sel.1", famille: "sel", degre: 1, signe: "selammoniac", fr: "Sel ammoniac", en: "Sal ammoniac", lieu: "bataille", pa: 1, paRendu: 0, effet: "portee-plus-un", cle: "elixir.sel.1", cellules: 8 },
  { id: "sel.2", famille: "sel", degre: 2, signe: "sel", fr: "Sel commun", en: "Common salt", lieu: "bataille", pa: 2, paRendu: 0, effet: "tenue-un", cle: "elixir.sel.2", cellules: 8 },
  { id: "sel.3", famille: "sel", degre: 3, signe: "vitriolblanc", fr: "Vitriol blanc", en: "White vitriol", lieu: "bataille", pa: 1, paRendu: 0, effet: "charge-nulle", cle: "elixir.sel.3", cellules: 6 },
  { id: "mercure.0", famille: "mercure", degre: 0, signe: "bainmarie", fr: "Bain-marie", en: "Bain-marie", lieu: "bataille", pa: 1, paRendu: 1, effet: "pa-rendu", cle: "elixir.mercure.0", cellules: 5 },
  { id: "mercure.1", famille: "mercure", degre: 1, signe: "mercure", fr: "Argent vif", en: "Quicksilver", lieu: "bataille", pa: 1, paRendu: 0, effet: "parade-accordee", cle: "elixir.mercure.1", cellules: 6 },
  { id: "mercure.2", famille: "mercure", degre: 2, signe: "eaudevie", fr: "Eau-de-vie", en: "Aqua vitae", lieu: "bataille", pa: 1, paRendu: 0, effet: "pas-le-plus-vif", cle: "elixir.mercure.2", cellules: 5 },
  { id: "mercure.3", famille: "mercure", degre: 3, signe: "esprit", fr: "Esprit de vin", en: "Spirit of wine", lieu: "bataille", pa: 1, paRendu: 2, effet: "deux-pa", cle: "elixir.mercure.3", cellules: 4 },
  { id: "soufre.0", famille: "soufre", degre: 0, signe: "quintessence", fr: "Quinte essence", en: "Quintessence", lieu: "forge", pa: 2, paRendu: 0, effet: "pierre-sans-forgeronne", cle: "elixir.soufre.0", cellules: 4 },
  { id: "soufre.1", famille: "soufre", degre: 1, signe: "antimoine", fr: "Antimoine", en: "Antimony", lieu: "forge", pa: 1, paRendu: 0, effet: "forge-gratuite", cle: "elixir.soufre.1", cellules: 4 },
  { id: "soufre.2", famille: "soufre", degre: 2, signe: "arsenic", fr: "Arsenic", en: "Arsenic", lieu: "forge", pa: 1, paRendu: 0, effet: "porte-forge-speciale", cle: "elixir.soufre.2", cellules: 4 },
  { id: "soufre.3", famille: "soufre", degre: 3, signe: "eauforte", fr: "Eau-forte", en: "Aqua fortis", lieu: "route", pa: 2, paRendu: 0, effet: "route-avec-hote", cle: "elixir.soufre.3", cellules: 2 },
] as const;

export const ELIXIR_PAR_ID: ReadonlyMap<string, Elixir> = new Map(ELIXIRS.map((e) => [e.id, e]));

/** Points d'action nets : 0 pour le bain-marie, −1 pour l'esprit de vin. */
export function paNet(e: Elixir): number {
  return e.pa - e.paRendu;
}

/**
 * Le degré : la somme des **deux étages que la famille jette**, mod 4.
 * Des cinq lectures comparées, la seule qui peuple les douze cellules
 * (rapport 4,00× entre la plus commune et la plus rare, aucune vide).
 */
export function degreDe(etages: readonly [number, number, number]): Degre {
  for (const e of etages) {
    if (!Number.isInteger(e) || e < 0 || e > 3) {
      throw new Error(`étage ${e} au lieu de 0..3`);
    }
  }
  const f = etageDominant(etages);
  return (((etages[(f + 1) % 3]! + etages[(f + 2) % 3]!) % 4) as Degre);
}

/** L'espèce d'un code de glyphe (0..63) : la table se lit, elle ne se choisit pas. */
export function especeDouzeDuCode(code: number): EspeceDouze {
  const etages = groupeDuCode(code);
  return `${TRIA_PRIMA[etageDominant(etages)].id}.${degreDe(etages)}`;
}

/**
 * Le code du premier glyphe du sceau — les **six premiers bits de la feuille**.
 * `encoderGlyphes` découpe l'empreinte par paquets de 6 bits et le premier
 * paquet est `feuille[0] >> 2` : la même lecture que `glypheDe`, sans
 * construire les 43 groupes. Un contrôle tient les deux ensemble.
 */
export function codeGlypheDe(o: Objet): number {
  return feuilleObjet(o)[0]! >>> 2;
}

export function especeDouzeDe(o: Objet): EspeceDouze {
  return especeDouzeDuCode(codeGlypheDe(o));
}

export function especeDouzeDePorte(
  o: Pick<ObjetPorte, "mot" | "archetype" | "age">,
): EspeceDouze {
  return especeDouzeDe({ mot: o.mot >>> 0, archetype: o.archetype as SignatureId, age: o.age });
}

export function elixirDe(id: EspeceDouze): Elixir {
  const e = ELIXIR_PAR_ID.get(id);
  if (!e) throw new Error(`espèce « ${id} » au lieu de l'une des ${ELIXIRS.length}`);
  return e;
}

export function elixirDeObjet(o: Objet): Elixir {
  return elixirDe(especeDouzeDe(o));
}

/** Le signe chymique d'une espèce — sa fiole, prise à la plaque. */
export function signeElixir(id: EspeceDouze): string {
  return uniDe(elixirDe(id).signe);
}

/** Le code de glyphe d'où le nom d'une espèce est tiré. Doit tomber dans sa cellule. */
export function codeDuNom(id: EspeceDouze): number {
  return codeDuCaractere(elixirDe(id).signe);
}

/** Les codes de glyphe (0..63) d'une espèce. Leur nombre est `cellules`. */
export function codesDeEspece(id: EspeceDouze): number[] {
  const out: number[] = [];
  for (let c = 0; c < 64; c++) if (especeDouzeDuCode(c) === id) out.push(c);
  return out;
}

/**
 * Tire un élixir d'une espèce douze : on avance la graine (‖ k) jusqu'à ce
 * que la famille **et** le degré soient les bons. Déterministe ; la graine
 * avance 8 fois en moyenne (espèce commune) à 32 (soufre·3), au lieu de 3.
 * C'est du hachage, pas de la preuve : le plafond de 4 096 tient largement.
 */
export function objetElixirDouze(
  graine: Uint8Array,
  age: NomAge,
  id: EspeceDouze,
  archetype?: SignatureId,
): Objet {
  elixirDe(id);
  for (let k = 0; k < 4096; k++) {
    const g = k === 0 ? graine : sha256d(concat(graine, u32(k)));
    const o = objetDepuisGraine(g, age);
    const oo: Objet = archetype ? { ...o, archetype } : o;
    if (especeDouzeDe(oo) === id) return oo;
  }
  throw new Error(`aucun élixir ${id} depuis cette graine`);
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

/**
 * Un élixir d'espèce douze, prêt pour le coffre. Le `nom` porté reste la
 * **famille** : un coffre écrit avant les douze espèces se relit sans perte,
 * et le degré se recalcule du mot à chaque lecture (`especeDouzeDePorte`).
 */
export function elixirDouzeDansCoffre(
  c: Pick<Coffre, "chaine">,
  graine: Uint8Array,
  age: NomAge,
  id: EspeceDouze,
  archetype?: SignatureId,
): ObjetPorte {
  const tip = c.chaine[c.chaine.length - 1];
  const o = objetElixirDouze(graine, age, id, archetype);
  return habillerElixir(o, tip?.hauteur ?? 0, (graine[8]! << 8) | graine[9]!);
}

/** L'espèce est-elle bue à cet étage ? Lecture de la jauge. */
export function especeActive(c: Pick<Coffre, "tour">, etage: number, espece: Espece): boolean {
  return especeBueA(tourDe(c), etage, espece);
}

export type BoireKo = { ok: false; code: "objet" | "deja" | "genre" };
export type BoireOk = {
  ok: true;
  coffre: Coffre;
  espece: Espece;
  etage: number;
  /** L'espèce complète et sa fiche : lecture, `tour.elixirs` n'en garde que la famille. */
  douze: EspeceDouze;
  elixir: Elixir;
};
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
  const douze = especeDouzeDePorte(o);
  const rest = objets.filter((_, k) => k !== i);
  return {
    ok: true,
    espece,
    douze,
    elixir: elixirDe(douze),
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
