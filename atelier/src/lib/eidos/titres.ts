/**
 * Titres des objets — épithète, nom, suffixe, composés depuis le mot.
 *
 * Un titre a trois parts :
 *   - l'**épithète** : un nom de régime (sept régimes × trois variantes, avec
 *     leur genre) accordé à un adjectif d'orbite (quatre orbites × trois
 *     variantes, masculin et féminin) — 21 × 12 = 252 épithètes par langue ;
 *   - le **nom** : celui du genre (arme : NOMS_ARME ; armure : l'emplacement ;
 *     pierre et gemme : l'affixe ; capture : son nom du lexique ; les autres :
 *     leur genre) ;
 *   - le **suffixe** : la muse de l'objet dans l'une des cinq tournures de sa
 *     rareté (« de Clio même » pour un pur, « d'après Clio » pour un errant) —
 *     5 × 9 = 45 suffixes par langue.
 *
 * Les variantes se tirent dans `sha256d("eidos-titre/1" ‖ mot canon)` : trois
 * tirages de plus, tous depuis le mot, donc le même objet porte le même titre
 * dans tous les coffres — l'identité est le mot, le titre est sa jauge. Aucun
 * tirage ne touche une puissance : un titre ne fait rien, il dit.
 *
 * LIMITE : les accords sont ceux du français et de l'anglais écrits ici ; un
 * nom de capture (lexique des hôtes) est un nom commun invariable.
 */

import type { Regime } from "./cosmos.ts";
import { NOMS_ARME, rangAffixe } from "./equipement.ts";
import type { Fiche } from "./fiche.ts";
import { concat, sha256d, u32, utf8 } from "./hash.ts";
import { canoniserMot } from "./objets.ts";
import { NOMS_REGIME, RARETES, type Bilingue, type Langue } from "./objets-lexique.ts";
import { SIGNATURES, type SignatureId } from "./signatures.ts";
import type { Emplacement } from "./types.ts";

export const TAG_TITRE = utf8("eidos-titre/1");
export const VARIANTES = 3;

type NomGenre = { readonly fr: string; readonly genre: "m" | "f"; readonly en: string };

/** Sept régimes × trois figures nominales, avec le genre du nom français. */
export const NOMS_FIGURE: Record<Regime, readonly [NomGenre, NomGenre, NomGenre]> = {
  Vide: [
    { fr: "Silence", genre: "m", en: "Silence" },
    { fr: "Absence", genre: "f", en: "Absence" },
    { fr: "Creux", genre: "m", en: "Hollow" },
  ],
  Nebuleuse: [
    { fr: "Voile", genre: "m", en: "Veil" },
    { fr: "Brume", genre: "f", en: "Haze" },
    { fr: "Nuée", genre: "f", en: "Cloud" },
  ],
  Pulsar: [
    { fr: "Battement", genre: "m", en: "Beat" },
    { fr: "Cadence", genre: "f", en: "Cadence" },
    { fr: "Pouls", genre: "m", en: "Pulse" },
  ],
  Eclipse: [
    { fr: "Ombre", genre: "f", en: "Shadow" },
    { fr: "Bord", genre: "m", en: "Rim" },
    { fr: "Occultation", genre: "f", en: "Occultation" },
  ],
  Comete: [
    { fr: "Traîne", genre: "f", en: "Trail" },
    { fr: "Passage", genre: "m", en: "Passage" },
    { fr: "Sillage", genre: "m", en: "Wake" },
  ],
  Horizon: [
    { fr: "Limite", genre: "f", en: "Limit" },
    { fr: "Ligne", genre: "f", en: "Line" },
    { fr: "Partage", genre: "m", en: "Divide" },
  ],
  Quasar: [
    { fr: "Rayon", genre: "m", en: "Ray" },
    { fr: "Foyer", genre: "m", en: "Focus" },
    { fr: "Phare", genre: "m", en: "Beacon" },
  ],
};

type Adjectif = { readonly m: string; readonly f: string; readonly en: string };

/** Quatre orbites × trois adjectifs : · demi-tour, ○ grand angle, ☽ angle franc, ✚ près du repos. */
export const ADJECTIFS_ORBITE: readonly (readonly [Adjectif, Adjectif, Adjectif])[] = [
  [
    { m: "renversé", f: "renversée", en: "Overturned" },
    { m: "retourné", f: "retournée", en: "Reversed" },
    { m: "inversé", f: "inversée", en: "Inverted" },
  ],
  [
    { m: "ouvert", f: "ouverte", en: "Open" },
    { m: "déployé", f: "déployée", en: "Unfolded" },
    { m: "large", f: "large", en: "Wide" },
  ],
  [
    { m: "franc", f: "franche", en: "Frank" },
    { m: "tenu", f: "tenue", en: "Held" },
    { m: "tranché", f: "tranchée", en: "Sharp" },
  ],
  [
    { m: "posé", f: "posée", en: "Settled" },
    { m: "calme", f: "calme", en: "Calm" },
    { m: "serré", f: "serrée", en: "Tight" },
  ],
];

/** Cinq tournures de suffixe, une par rareté (pur → errant), avec la muse en place. */
export const TOURNURES: readonly {
  readonly fr: (muse: string) => string;
  readonly en: (muse: string) => string;
}[] = [
  { fr: (m) => `de ${m} même`, en: (m) => `of ${m} herself` },
  { fr: (m) => `de ${m}`, en: (m) => `of ${m}` },
  { fr: (m) => `selon ${m}`, en: (m) => `after ${m}` },
  { fr: (m) => `à la manière de ${m}`, en: (m) => `in the manner of ${m}` },
  { fr: (m) => `d'après ${m}`, en: (m) => `loosely after ${m}` },
];

export const NOMS_EMPLACEMENT: Record<Emplacement, Bilingue> = {
  arme: { fr: "Arme", en: "Weapon" },
  casque: { fr: "Casque", en: "Helm" },
  plastron: { fr: "Plastron", en: "Breastplate" },
  epaulieres: { fr: "Épaulières", en: "Pauldrons" },
  gants: { fr: "Gants", en: "Gauntlets" },
  bottes: { fr: "Bottes", en: "Boots" },
  amulette: { fr: "Amulette", en: "Amulet" },
  anneau1: { fr: "Anneau", en: "Ring" },
  anneau2: { fr: "Anneau", en: "Ring" },
  accessoire: { fr: "Accessoire", en: "Accessory" },
};

/** Trois tirages de titre depuis le mot canon : figure, adjectif, tournure secondaire. */
export function rollsTitre(mot: number): { figure: number; adjectif: number; nom: number } {
  const h = sha256d(concat(TAG_TITRE, u32(canoniserMot(mot))));
  return { figure: h[0]! % VARIANTES, adjectif: h[1]! % VARIANTES, nom: h[2]! };
}

export type Titre = {
  epithete: string;
  nom: string;
  suffixe: string;
  /** les trois parts en une ligne */
  titre: string;
};

function museDe(id: SignatureId): string {
  return SIGNATURES.find((s) => s.id === id)?.muse ?? id;
}

/** Le nom de base, par genre. */
export function nomDeBase(f: Fiche, langue: Langue): string {
  const fr = langue === "fr";
  switch (f.genre) {
    case "arme": {
      const i = (NOMS_ARME as readonly string[]).indexOf(f.nom);
      return i >= 0 ? f.nom : NOMS_ARME[rollsTitre(f.mot).nom % NOMS_ARME.length]!;
    }
    case "armure":
      return f.emplacement ? NOMS_EMPLACEMENT[f.emplacement][langue] : fr ? "Armure" : "Armour";
    case "pierre":
      return f.affixe ? (fr ? `Pierre ${f.affixe}` : `Stone ${f.affixe}`) : fr ? "Pierre" : "Stone";
    case "gemme":
      return f.affixe ? (fr ? `Gemme ${f.affixe}` : `Gem ${f.affixe}`) : fr ? "Gemme" : "Gem";
    case "philosophale":
      return fr ? "Pierre philosophale" : "Philosopher's stone";
    case "lair":
      return fr ? "Ticket d'antre" : "Lair ticket";
    case "elixir":
      return fr ? "Élixir" : "Elixir";
    case "capsule":
      return fr ? "Capsule" : "Capsule";
    case "capture":
      return f.nom;
    case "trouve":
      return fr ? "Trouvaille" : "Find";
  }
}

/** L'épithète : nom de régime accordé à l'adjectif d'orbite, variantes tirées du mot. */
export function epitheteDe(f: Fiche, langue: Langue): string {
  const r = rollsTitre(f.mot);
  const n = NOMS_FIGURE[f.forme.regime][r.figure]!;
  const a = ADJECTIFS_ORBITE[f.orbite]![r.adjectif]!;
  if (langue === "fr") return `${n.fr} ${n.genre === "f" ? a.f : a.m}`;
  return `${a.en} ${n.en}`;
}

/** Le suffixe : la muse dans la tournure de la rareté. */
export function suffixeDe(f: Fiche, langue: Langue): string {
  const t = TOURNURES[Math.min(f.rarete, TOURNURES.length - 1)]!;
  return t[langue](museDe(f.muse));
}

export function titreDe(f: Fiche, langue: Langue): Titre {
  const epithete = epitheteDe(f, langue);
  const nom = nomDeBase(f, langue);
  const suffixe = suffixeDe(f, langue);
  const affixes = f.gemmes.length
    ? ` (${f.gemmes.map((g) => `${g[0]}${rangAffixe(g)}`).join(" ")})`
    : "";
  return { epithete, nom, suffixe, titre: `${nom}, ${epithete}, ${suffixe}${affixes}` };
}

/** Nombre de titres possibles par langue, hors nom de base : 21 × 12 × 45. */
export const TITRES_POSSIBLES =
  Object.values(NOMS_FIGURE).length *
  VARIANTES *
  ADJECTIFS_ORBITE.length *
  VARIANTES *
  TOURNURES.length *
  SIGNATURES.length;

/** Réexport pour les contrôles : les noms de régime affichés. */
export { NOMS_REGIME, RARETES };
