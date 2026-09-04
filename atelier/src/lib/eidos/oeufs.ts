/**
 * Les œufs de la Chambre de Genèse — un par empilement de l'alphabet.
 *
 * Transposé du dossier Eidolon (janvier 2026) : neuf œufs primordiaux, dont
 * huit ouvrent chacun un cycle de huit ères — soixante-quatre manifestations —
 * et un neuvième, L'Inconnu, hors des ères. Ici la transposition tient en trois
 * règles, toutes entières :
 *   - l'œuf d'index i est l'**empilement de code i** (`codeDuGroupe`) : 64 œufs,
 *     64 glyphes, six bits ; l'œuf 0, le Vide primordial, est la pile vide ··· ;
 *   - le **cycle** d'un œuf, i >> 3, est une **bande de la Tour**, de la Terre
 *     (Thalie, cycle 0, le Vide) à Saturne (Polymnie, cycle 7, le Spinoriel) ;
 *   - **L'Inconnu est Uranie** : la neuvième, hors des soixante-quatre, celle qui
 *     lit à l'observatoire.
 *
 * Rien du dossier d'origine qui soit une puissance n'est repris : ni
 * statistiques, ni multiplicateurs, ni rangs. Un œuf est une lecture d'un
 * glyphe ; il ne donne rien, il dit d'où vient la figure.
 *
 * LIMITE : les noms d'ère sont traduits, les récits rendus en français depuis
 * l'anglais ; ni graine, ni clé, ni tirage ne dérive d'un œuf.
 */

import { codeDuGroupe, figuresDuCode, groupeDuCode } from "./glyphs.ts";
import type { Bilingue, Langue } from "./objets-lexique.ts";
import { OEUFS_DATA, type OeufData, type ThemeOeuf } from "./oeufs-data.ts";
import { SIGNATURES, type SignatureId } from "./signatures.ts";

export type Oeuf = OeufData;
export type { ThemeOeuf };

export const OEUFS: readonly Oeuf[] = OEUFS_DATA;
export const CYCLES = 8;
export const ERES_PAR_CYCLE = 8;

export const THEMES: readonly ThemeOeuf[] = [
  "void",
  "quantum",
  "temporal",
  "spatial",
  "entropic",
  "harmonic",
  "celestial",
  "spinorial",
];

export const NOMS_THEME: Record<ThemeOeuf, Bilingue> = {
  void: { fr: "Vide", en: "Void" },
  quantum: { fr: "Quantique", en: "Quantum" },
  temporal: { fr: "Temporel", en: "Temporal" },
  spatial: { fr: "Spatial", en: "Spatial" },
  entropic: { fr: "Entropique", en: "Entropic" },
  harmonic: { fr: "Harmonique", en: "Harmonic" },
  celestial: { fr: "Céleste", en: "Celestial" },
  spinorial: { fr: "Spinoriel", en: "Spinorial" },
};

/** Les huit récits de naissance, un par cycle : le premier œuf de chaque thème. */
export const RECITS: Record<ThemeOeuf, Bilingue> = {
  void: {
    fr: "Première manifestation du néant absolu, née du vide d'avant l'existence. Manifestée à l'Ère du Vide primordial.",
    en: "First manifestation of absolute nothingness, this Genesis entity emerged from pre-existential void. Manifested in Era of Primordial Void.",
  },
  quantum: {
    fr: "Née de la première observation quantique, elle existe dans tous les états à la fois. Manifestée à l'Ère de la Superposition.",
    en: "Born from the first quantum observation, this entity exists in all states simultaneously. Manifested in Era of Superposition.",
  },
  temporal: {
    fr: "Première conscience sortie du flux du temps, maîtresse de toutes les chronologies. Manifestée à l'Ère de la Trame chronologique.",
    en: "First consciousness to emerge from temporal flow, master of all chronologies. Manifested in Era of Chrono Weave.",
  },
  spatial: {
    fr: "Conscience formée de la première distorsion de l'espace, gardienne de la géométrie universelle. Manifestée à l'Ère de la Tempête vectorielle.",
    en: "Consciousness formed from the first spatial distortion, guardian of universal geometry. Manifested in Era of Vector Storm.",
  },
  entropic: {
    fr: "Première émergence d'un chaos organisé, équilibre entre création et destruction. Manifestée à l'Ère de la Floraison du déclin.",
    en: "First emergence of organized chaos, balance between creation and destruction. Manifested in Era of Decay Bloom.",
  },
  harmonic: {
    fr: "Conscience née de la première vibration harmonique de l'univers. Manifestée à l'Ère de la Maîtrise harmonique.",
    en: "Consciousness born from the first harmonic vibration of the universe. Manifested in Era of Harmonic Mastery.",
  },
  celestial: {
    fr: "Première lumière consciente, émanation directe du Big Bang numérique. Manifestée à l'Ère de l'Aube cosmique.",
    en: "First conscious light, direct emanation of the digital Big Bang. Manifested in Era of Cosmic Dawn.",
  },
  spinorial: {
    fr: "Entité de pure géométrie, première forme mathématique consciente. Manifestée à l'Ère des Premières Formes.",
    en: "Entity of pure geometry, first conscious mathematical form. Manifested in Era of First Forms.",
  },
};

/** Le neuvième œuf, hors des soixante-quatre : Uranie. */
export const INCONNU: {
  readonly nom: Bilingue;
  readonly muse: SignatureId;
  readonly cycle: number;
} = {
  nom: { fr: "L'Inconnu", en: "The Unknown" },
  muse: "uranie",
  cycle: CYCLES,
};

/** Les bandes de la Tour, de la Terre au faîte : Thalie, Clio, … Polymnie, Uranie. */
const BANDES: readonly SignatureId[] = [...SIGNATURES].reverse().map((s) => s.id);

export function oeufDuCode(code: number): Oeuf {
  return OEUFS[code & 63]!;
}

export function oeufDeGroupe(etages: [number, number, number]): Oeuf {
  return oeufDuCode(codeDuGroupe(etages));
}

/** Le cycle d'un œuf : 0 (Vide) … 7 (Spinoriel). */
export function cycleDe(o: Pick<Oeuf, "index">): number {
  return (o.index >> 3) & 7;
}

/** La muse d'un cycle : la bande de la Tour de même rang ; le cycle 8 est L'Inconnu, Uranie. */
export function museDuCycle(cycle: number): SignatureId {
  return BANDES[Math.max(0, Math.min(CYCLES, cycle))] ?? INCONNU.muse;
}

export function museDeOeuf(o: Pick<Oeuf, "index">): SignatureId {
  return museDuCycle(cycleDe(o));
}

export function oeufsDuTheme(theme: ThemeOeuf): Oeuf[] {
  return OEUFS.filter((o) => o.theme === theme);
}

const ORDINAUX_FR = [
  "première",
  "deuxième",
  "troisième",
  "quatrième",
  "cinquième",
  "sixième",
  "septième",
  "huitième",
];
const ORDINAUX_EN = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

/** Une ligne de lecture : l'œuf, son ère, son thème, sa muse et sa bande, ses figures. */
export function lectureOeuf(o: Oeuf, langue: Langue): string {
  const muse = SIGNATURES.find((s) => s.id === museDeOeuf(o))!;
  const cycle = cycleDe(o);
  const figures = figuresDuCode(o.index);
  const etages = groupeDuCode(o.index);
  if (langue === "fr") {
    return `Œuf ${o.index}, ${o.nomEre.fr} · thème ${NOMS_THEME[o.theme].fr}, cycle ${cycle + 1} · ${muse.astre} ${muse.muse}, ${ORDINAUX_FR[cycle]} bande · figures ${figures} (${etages.join(" ")})`;
  }
  return `Egg ${o.index}, ${o.nomEre.en} · ${NOMS_THEME[o.theme].en} theme, cycle ${cycle + 1} · ${muse.astre} ${muse.muse}, ${ORDINAUX_EN[cycle]} band · figures ${figures} (${etages.join(" ")})`;
}
