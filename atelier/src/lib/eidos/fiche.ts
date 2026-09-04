/**
 * Fiche d'un objet — la lecture complète d'un mot, en fonctions pures.
 *
 * `ficheDe(objet, autres)` lit tout ce que le modèle sait déjà et ne montrait
 * pas : le quaternion dépaqueté et sa forme canonique, la forme du catalogue
 * la plus proche (rang, classe, régime), la cellule de la doxa, la proximité à
 * cette forme en centièmes (la rareté, continue), le palier du catalogue,
 * l'orbite (première figure), l'ascendant (deux compositions par tour, de
 * trois en trois comme la semaine), l'alignement à l'ancre, le sceau, et la
 * résonance avec les autres objets du coffre. `texteFiche(fiche, langue)` met
 * cette lecture en phrases par le lexique (objets-lexique.ts), en quatre
 * registres : forme, caractère, traits, technique.
 *
 * Tout est entier ; rien n'est tiré au sort ; deux appels rendent la même
 * fiche et les mêmes phrases. La fiche est une jauge : elle lit le mot, elle
 * ne le change pas, et n'invente aucune puissance — la norme reste la norme.
 *
 * LIMITE : la forme la plus proche et la rareté sont des lectures (figures ≠
 * preuves) ; seuls le mot canon, l'archétype et l'âge entrent dans la feuille.
 */

import { FORMES, formeProche } from "./bestiaire.ts";
import {
  REGIMES,
  alignement,
  ascendant,
  isqrt,
  norme2,
  palierDe,
  type Classe,
  type Q,
  type Regime,
} from "./cosmos.ts";
import { VECTEUR_EMPREINTES } from "./cosmos-empreintes.ts";
import { motEffectif } from "./equipement.ts";
import { etageMuse } from "./hotes.ts";
import { ROLES } from "./hotes-lexique.ts";
import { celluleDoxa } from "./integrite.ts";
import { objetDePorte } from "./inventaire.ts";
import { alignementCentiemes, figureOrbite } from "./lecture.ts";
import { Q_SCALE, canoniserMot, deconstruireMot, depaqueter, sceauObjet } from "./objets.ts";
import * as L from "./objets-lexique.ts";
import { paireDe, qDeMot, type Polarite } from "./resonance.ts";
import type { SignatureId } from "./signatures.ts";
import type { Affixe, Emplacement, Genre, NomAge, ObjetPorte } from "./types.ts";

export type Ensemble = {
  /** nombre d'autres objets lus */
  n: number;
  constructif: number;
  neutre: number;
  destructif: number;
  /** Σ |dot| constructif − Σ |dot| destructif, sur les paires qui contiennent l'objet */
  tenue: bigint;
};

export type Fiche = {
  mot: number;
  motHex: string;
  canon: boolean;
  omise: number;
  q: readonly [number, number, number, number];
  motEffectif: number;
  genre: Genre;
  nom: string;
  age: NomAge;
  muse: SignatureId;
  emplacement: Emplacement | null;
  affixe: Affixe | null;
  gemmes: readonly Affixe[];
  sockets: number;
  nonce: number;
  hauteur: number;
  forme: { rang: number; classe: Classe; regime: Regime };
  cellule: string;
  /** alignement en centièmes avec la forme la plus proche : la rareté, continue */
  proximite: number;
  /** indice dans RARETES */
  rarete: number;
  palier: string;
  /** première figure de la lecture, 0..3 */
  orbite: number;
  /** le régime contre lequel l'objet compose deux fois par tour */
  force: Regime;
  /** le régime qui compose deux fois par tour contre lui */
  faiblesse: Regime;
  /** alignement en centièmes avec l'ancre du catalogue (rang 0) */
  axeAncre: number;
  sceau: string;
  ensemble: Ensemble | null;
};

const ANCRE: Q = (() => {
  const a = VECTEUR_EMPREINTES.find((o) => o.classe === "ancre")!;
  return [
    BigInt(a.orientation[0]!),
    BigInt(a.orientation[1]!),
    BigInt(a.orientation[2]!),
    BigInt(a.orientation[3]!),
  ];
})();

function estRegime(x: string): x is Regime {
  return (REGIMES as readonly string[]).includes(x);
}

function estClasse(x: string): x is Classe {
  return x === "arme" || x === "defense" || x === "accessoire";
}

/** Le régime contre lequel `regime` compose deux fois par tour (cosmos.coupsParTour). */
export function forceDe(regime: Regime): Regime {
  return REGIMES.find((cible) => REGIMES[ascendant(REGIMES.indexOf(cible))] === regime) ?? regime;
}

/** Le régime qui compose deux fois par tour contre `regime` : son ascendant. */
export function faiblesseDe(regime: Regime): Regime {
  return REGIMES[ascendant(REGIMES.indexOf(regime))] ?? regime;
}

/** Indice de rareté par proximité : le premier seuil atteint. */
export function rareteDe(proximite: number): number {
  const i = L.RARETES.findIndex((r) => proximite >= r.seuil);
  return i < 0 ? L.RARETES.length - 1 : i;
}

export function hexMot(mot: number): string {
  return (mot >>> 0).toString(16).padStart(8, "0");
}

function ensembleDe(o: ObjetPorte, autres: readonly ObjetPorte[]): Ensemble | null {
  const q = qDeMot(o.mot);
  const membres = autres.filter((x) => x !== o);
  if (membres.length === 0) return null;
  let constructif = 0;
  let neutre = 0;
  let destructif = 0;
  let tenue = 0n;
  for (const x of membres) {
    const p = paireDe({ q, classe: o.archetype }, { q: qDeMot(x.mot), classe: x.archetype }, 0, 1);
    const d = p.dot < 0n ? -p.dot : p.dot;
    if (p.polarite === "constructif") {
      constructif += 1;
      tenue += d;
    } else if (p.polarite === "destructif") {
      destructif += 1;
      tenue -= d;
    } else neutre += 1;
  }
  return { n: membres.length, constructif, neutre, destructif, tenue };
}

/** La lecture complète d'un objet ; `autres` = les objets du coffre (l'objet lui-même est ignoré). */
export function ficheDe(o: ObjetPorte, autres: readonly ObjetPorte[] = []): Fiche {
  const q = qDeMot(o.mot);
  const f = formeProche(q);
  const classe: Classe = estClasse(f.classe) ? f.classe : "accessoire";
  const regime: Regime = estRegime(f.regime) ? f.regime : "Vide";
  const proximite = alignementCentiemes(q, f.q);
  const muse = o.archetype as SignatureId;
  return {
    mot: o.mot >>> 0,
    motHex: hexMot(o.mot),
    canon: canoniserMot(o.mot) === o.mot >>> 0,
    omise: deconstruireMot(o.mot).omise,
    q: depaqueter(o.mot),
    motEffectif: motEffectif(o),
    genre: o.genre,
    nom: o.nom,
    age: o.age,
    muse,
    emplacement: o.emplacement,
    affixe: o.affixe,
    gemmes: o.gemmes ?? [],
    sockets: o.sockets ?? 0,
    nonce: o.nonce,
    hauteur: o.hauteur,
    forme: { rang: f.rang, classe, regime },
    cellule: celluleDoxa(classe, regime),
    proximite,
    rarete: rareteDe(proximite),
    palier: palierDe(f.rang).nom,
    orbite: figureOrbite(q),
    force: forceDe(regime),
    faiblesse: faiblesseDe(regime),
    axeAncre: alignementCentiemes(q, ANCRE),
    sceau: sceauObjet(objetDePorte(o)).split(" ")[0] ?? "",
    ensemble: ensembleDe(o, autres),
  };
}

export type Registres = {
  forme: string[];
  caractere: string[];
  traits: string[];
  technique: string[];
};

const FIGURES = ["·", "○", "☽", "✚"] as const;

function pluriel(n: number, un: string, des: string): string {
  return `${n} ${n > 1 ? des : un}`;
}

/** La fiche en phrases : quatre registres, tout vient du lexique et de la lecture. */
export function texteFiche(f: Fiche, langue: L.Langue): Registres {
  const regime = (r: Regime) => L.NOMS_REGIME[r][langue];
  const classe = L.NOMS_CLASSE[f.forme.classe][langue];
  const rarete = L.RARETES[f.rarete]!;
  const age = L.AGES[f.age];
  const role = ROLES[f.muse].majeur[langue];
  const etage = etageMuse(f.muse);
  const q = f.q;
  const fr = langue === "fr";

  const forme = [
    L.GENRES_TEXTE[f.genre][langue],
    fr
      ? `Forme la plus proche : rang ${f.forme.rang} du catalogue, ${classe} de ${regime(f.forme.regime)}, cellule ${f.cellule} ; proximité ${f.proximite}/100, ${rarete.nom.fr}.`
      : `Nearest form: rank ${f.forme.rang} of the catalogue, ${classe} of the ${regime(f.forme.regime)}, cell ${f.cellule}; proximity ${f.proximite}/100, ${rarete.nom.en}.`,
    rarete.texte[langue],
    age.texte[langue],
  ];

  const caractere = [
    L.CARACTERES[f.forme.classe][f.forme.regime][langue],
    L.ORBITES[f.orbite]![langue],
    f.forme.regime === "Vide"
      ? fr
        ? "Son ascendant est le Vide lui-même : deux compositions par tour contre le Vide, et le Vide en a deux contre lui."
        : "Its ascendant is the Void itself: two compositions per turn against the Void, and the Void has two against it."
      : fr
        ? `Deux compositions par tour contre ${regime(f.force)} ; ${regime(f.faiblesse)} en a deux contre lui. L'ascendant tourne de trois en trois, comme la semaine.`
        : `Two compositions per turn against the ${regime(f.force)}; the ${regime(f.faiblesse)} has two against it. The ascendant turns three by three, like the week.`,
    fr
      ? `Palier ${f.palier} du catalogue : les tirages se multiplient, jamais la norme. Alignement à l'ancre : ${f.axeAncre}/100.`
      : `Catalogue tier ${f.palier}: the draws multiply, never the norm. Alignment with the anchor: ${f.axeAncre}/100.`,
  ];
  if (f.ensemble) {
    const e = f.ensemble;
    caractere.push(
      fr
        ? `Dans ce coffre, ${pluriel(e.n, "autre objet", "autres objets")} : ${pluriel(e.constructif, "constructif", "constructifs")}, ${pluriel(e.destructif, "destructif", "destructifs")}, ${pluriel(e.neutre, "neutre", "neutres")} ; tenue ${e.tenue.toString()}.`
        : `In this vault, ${pluriel(e.n, "other item", "other items")}: ${e.constructif} constructive, ${e.destructif} destructive, ${e.neutre} neutral; hold ${e.tenue.toString()}.`,
    );
  }

  const traits = [
    L.TEMPERAMENTS[f.muse][langue],
    fr
      ? `Né chez ${role}, à l'étage ${etage} de la Tour.`
      : `Born at ${role}'s, on floor ${etage} of the Tower.`,
  ];
  if (f.affixe) traits.push(L.AFFIXES_TEXTE[f.affixe][langue]);
  for (const g of f.gemmes)
    traits.push((fr ? "Gemme enchâssée : " : "Set gem: ") + L.AFFIXES_TEXTE[g][langue]);
  if (f.sockets > 0) {
    traits.push(
      fr
        ? `${pluriel(f.gemmes.length, "gemme", "gemmes")} sur ${pluriel(f.sockets, "sertissure", "sertissures")}.`
        : `${pluriel(f.gemmes.length, "gem", "gems")} on ${pluriel(f.sockets, "setting", "settings")}.`,
    );
  }

  const technique = [
    fr
      ? `mot ${f.motHex} · ${f.canon ? "forme canonique" : "non canonique : q et −q sont le même objet"} · composante omise ${f.omise}`
      : `word ${f.motHex} · ${f.canon ? "canonical form" : "non-canonical: q and −q are the same item"} · omitted component ${f.omise}`,
    fr
      ? `quaternion (${q[0]}, ${q[1]}, ${q[2]}, ${q[3]}) sur ${Q_SCALE} · norme fixe · orbite ${FIGURES[f.orbite]}`
      : `quaternion (${q[0]}, ${q[1]}, ${q[2]}, ${q[3]}) over ${Q_SCALE} · fixed norm · orbit ${FIGURES[f.orbite]}`,
  ];
  if (f.motEffectif !== f.mot) {
    technique.push(
      fr
        ? `mot effectif ${hexMot(f.motEffectif)} après les gemmes`
        : `effective word ${hexMot(f.motEffectif)} after the gems`,
    );
  }
  technique.push(
    fr
      ? `sceau ${f.sceau} · feuille : mot canon, archétype, âge · jauge : nom, affixe, nonce ${f.nonce}, bloc #${f.hauteur}`
      : `seal ${f.sceau} · leaf: canonical word, archetype, age · gauge: name, affix, nonce ${f.nonce}, block #${f.hauteur}`,
  );

  return { forme, caractere, traits, technique };
}

/** Les cent formes du catalogue, pour les contrôles et les lectures. */
export { FORMES };

/** Norme entière d'un quaternion (isqrt de la norme carrée), pour les contrôles. */
export function normeDe(q: Q): bigint {
  return isqrt(norme2(q));
}

/** Alignement entier de deux quaternions, réexporté pour les contrôles. */
export { alignement };

export type { Polarite };
