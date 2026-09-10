/**
 * Tiers et rareté — deux lectures d'un mot, jamais une puissance.
 *
 * Un objet ne peut pas être plus fort : `combat.ts` gèle la somme des quatre
 * axes à `COMBAT_BUDGET` = 64 et `integrite.ts` interdit la mutation. Le tier
 * ne dit donc pas *combien* mais *à quel point l'objet est pointu* :
 *
 *     E3 = lame² + ecu² + eperon² + arc² − 1024 = Σ (axe − 16)²
 *
 * la distance euclidienne au centre équilibré (16, 16, 16, 16), entière parce
 * que les axes le sont. E3 va de 0 (16/16/16/16) à 3072 (64/0/0/0) et prend
 * 767 valeurs distinctes sur 2·10⁶ tirages — contre 63 pour `max − min` et 48
 * pour `Σ|axe − 16|` : c'est la seule des trois qui laisse poser douze seuils
 * à ±10 % d'une loi 2⁻ᵗ (`docs/SPEC_LOOT_TIERS.md` §4). E3 est invariante par
 * l'archétype (qui permute les axes), par l'âge, et par q ↔ −q.
 *
 * Douze tiers, du T1 « diffus » (1 sur 2) au T12 « singulier » (1 sur 2 048,
 * mesuré 1 sur 2 086 sur 2·10⁶). La loi est 2⁻ᵗ ; T12 est la **queue** de
 * l'échelle, donc 2⁻¹¹ et non 2⁻¹² — sans quoi les douze probabilités ne
 * sommeraient pas à 1. Rien n'est tiré au sort : tout se lit dans le mot.
 *
 * La rareté reste la proximité à la forme la plus proche du catalogue
 * (`bestiaire.formeProche`, `lecture.alignementCentiemes`), en centièmes
 * entiers. Elle est recalibrée sur son domaine **réel** [78, 100] : les 100
 * formes couvrent RP³ avec un rayon de 77,06 centièmes, donc aucun mot ne
 * peut être à moins de 77 d'une forme. Sept paliers, de `pur` (46,6 %) à
 * `errant` (1 sur 339). Les deux lectures sont presque indépendantes :
 * r(tier, proximité) = −0,167 mesuré sur 100 000 objets.
 *
 * Usage :
 *   extremite(o)            → E3, entier de 0 à 3072
 *   tierDe(o)               → 1..12
 *   nomTier(t)              → « effilé »
 *   rareteDe(o)             → { palier: "franc", proximite: 94 }
 *   frequenceTheorique(t)   → { sur: 2048 }, dénominateur entier exact
 *
 * AVERTISSEMENT : sous 78 centièmes il n'y a **aucun palier** parce qu'il n'y
 * a aucun mot. Le `errant` d'`objets-lexique.ts` (seuil 0, donc < 60) et son
 * `hybride` (60–77) sont géométriquement vides : le rayon de couverture des
 * cent formes vaut 77,06. Le `errant` de cette échelle est autre chose — la
 * bande 78–83, la plus creuse que la géométrie autorise — et il est peuplé :
 * 295 objets sur 100 000. Son texte doit dire « aussi loin de toute forme que
 * la géométrie l'autorise », jamais « loin de tout archétype ».
 *
 * LIMITE : figures ≠ preuves. Le tier, l'extrémité, la proximité et le palier
 * sont des **lectures** : rien n'entre dans une feuille, un carnet, une racine
 * ni une signature. Seuls le mot canon, l'archétype et l'âge engagent
 * (`feuilleObjet`). Un tier n'achète aucune puissance — il achète de la
 * variance et de la non-transitivité (`docs/SPEC_LOOT_TIERS.md` §4) — et il ne
 * se déclare pas : il se relit du mot, à l'identique, autant de fois qu'on veut.
 */

import { formeProche } from "./bestiaire.ts";
import { COMBAT_BUDGET, combatDe, type Combat } from "./combat.ts";
import { alignementCentiemes } from "./lecture.ts";
import type { Objet } from "./objets.ts";
import { qDeMot } from "./resonance.ts";

/** Refus de lecture : dit quoi, et au lieu de quoi. */
export class RejetTier extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejetTier";
  }
}

/** L'axe du centre équilibré : 64 / 4 = 16. */
export const CENTRE = COMBAT_BUDGET / 4;

/** Σ axe² au centre, la constante retranchée : 4 × 16² = 1024. */
export const SOCLE_E3 = 4 * CENTRE * CENTRE;

/** Σ (axe − 16)² pour les axes tous à 16 : le centre. */
export const E3_MIN = 0;

/** Σ (axe − 16)² pour 64/0/0/0 : la pointe absolue. */
export const E3_MAX = COMBAT_BUDGET * COMBAT_BUDGET - SOCLE_E3;

export const TIERS = 12;

/**
 * Les onze bornes, chacune la valeur d'E3 **la plus basse** de son tier.
 * `BORNES_TIER[k]` ouvre le tier k + 2. Calées sur 2·10⁶ tirages
 * (`docs/SPEC_LOOT_TIERS.md` §5) : T1 0–300, T2 301–522, … T12 2359–3072.
 */
export const BORNES_TIER: readonly number[] = [
  301, 523, 749, 973, 1203, 1435, 1655, 1855, 2043, 2245, 2359,
];

/** Douze noms, registre optique. Affichage : aucun n'est un identifiant. */
export const NOMS_TIER: readonly string[] = [
  "diffus",
  "épars",
  "ramassé",
  "tendu",
  "effilé",
  "aigu",
  "perçant",
  "acéré",
  "aiguille",
  "épine",
  "dard",
  "singulier",
];

/** Les mêmes, sans accents : les clés d'i18n et de sérialisation. */
export const CLES_TIER: readonly string[] = [
  "diffus",
  "epars",
  "ramasse",
  "tendu",
  "effile",
  "aigu",
  "percant",
  "acere",
  "aiguille",
  "epine",
  "dard",
  "singulier",
];

/**
 * Rayon de couverture de RP³ par les cent formes rangées, en centièmes :
 * borne **supérieure** mesurée du minimum atteignable (4·10⁵ points uniformes
 * puis descente locale). Aucun mot n'est plus loin d'une forme que ça.
 */
export const RAYON_COUVERTURE = 77;

/** Proximité la plus basse observée sur 2·10⁶ mots tirés. */
export const PROXIMITE_PLANCHER = 78;

/**
 * Sept paliers de rareté, seuil **bas inclus**, du plus proche au plus loin.
 * Le dernier vaut 0 pour couvrir : sous 78 il n'y a pas de mot, pas un trou
 * de table. Domaine réel [78, 100], jamais [0, 100].
 */
export const SEUILS_RARETE: readonly number[] = [97, 94, 91, 88, 86, 84, 0];

export const NOMS_RARETE: readonly string[] = [
  "pur",
  "franc",
  "mêlé",
  "voilé",
  "trouble",
  "hybride",
  "errant",
];

/** Les mêmes, sans accents : les clés d'i18n et de sérialisation. */
export const CLES_RARETE: readonly string[] = [
  "pur",
  "franc",
  "mele",
  "voile",
  "trouble",
  "hybride",
  "errant",
];

function entier(n: number, quoi: string): number {
  if (!Number.isInteger(n)) throw new RejetTier(`${quoi} ${n} au lieu d'un entier`);
  return n;
}

/**
 * L'extrémité d'une répartition d'axes : Σ axe² − 1024, entier de 0 à 3072.
 * Refuse toute répartition dont la somme n'est pas `COMBAT_BUDGET` : hors du
 * budget, la distance au centre ne veut plus rien dire.
 */
export function extremiteDeCombat(c: Combat): number {
  const axes = [c.lame, c.ecu, c.eperon, c.arc];
  let somme = 0;
  let carres = 0;
  for (const a of axes) {
    entier(a, "axe");
    if (a < 0) throw new RejetTier(`axe ${a} au lieu d'un entier de 0 ou plus`);
    somme += a;
    carres += a * a;
  }
  if (somme !== COMBAT_BUDGET) {
    throw new RejetTier(`somme des axes ${somme} au lieu de ${COMBAT_BUDGET}`);
  }
  return carres - SOCLE_E3;
}

/** E3 d'un objet : sa distance au centre équilibré. Ne dépend ni de l'âge ni de l'archétype. */
export function extremite(o: Objet): number {
  return extremiteDeCombat(combatDe(o));
}

/** Le tier d'une extrémité : 1..12, un seul, par comparaison aux onze bornes. */
export function tierDeExtremite(e: number): number {
  entier(e, "extrémité");
  if (e < E3_MIN || e > E3_MAX) {
    throw new RejetTier(`extrémité ${e} au lieu d'un entier de ${E3_MIN} à ${E3_MAX}`);
  }
  let t = 1;
  for (const borne of BORNES_TIER) {
    if (e < borne) break;
    t += 1;
  }
  return t;
}

/** Le tier d'un objet : 1..12. Lecture, jamais une puissance. */
export function tierDe(o: Objet): number {
  return tierDeExtremite(extremite(o));
}

function verifierTier(tier: number): number {
  entier(tier, "tier");
  if (tier < 1 || tier > TIERS) {
    throw new RejetTier(`tier ${tier} au lieu d'un entier de 1 à ${TIERS}`);
  }
  return tier;
}

/** Le nom d'un tier, accentué, pour l'affichage. */
export function nomTier(tier: number): string {
  return NOMS_TIER[verifierTier(tier) - 1]!;
}

/** La clé d'i18n d'un tier, sans accent. */
export function cleTier(tier: number): string {
  return CLES_TIER[verifierTier(tier) - 1]!;
}

/**
 * La fréquence visée d'un tier, en dénominateur **entier** : 1 objet sur `sur`.
 * Loi 2⁻ᵗ. T12 est la queue de l'échelle : son complément vaut 2⁻¹¹, pas
 * 2⁻¹² — les douze parts doivent sommer à 1. T11 et T12 partagent donc 2 048.
 * Jamais de flottant : `{ sur: 2048 }`, pas `0.00048`.
 */
export function frequenceTheorique(tier: number): { sur: number } {
  verifierTier(tier);
  return { sur: 2 ** Math.min(tier, TIERS - 1) };
}

/** Le palier d'une proximité en centièmes : le premier seuil atteint. */
export function rareteDeProximite(proximite: number): string {
  entier(proximite, "proximité");
  if (proximite < 0 || proximite > 100) {
    throw new RejetTier(`proximité ${proximite} au lieu d'un entier de 0 à 100`);
  }
  const i = SEUILS_RARETE.findIndex((s) => proximite >= s);
  return NOMS_RARETE[i < 0 ? NOMS_RARETE.length - 1 : i]!;
}

/** L'indice du palier d'une proximité, 0 (pur) à 6 (errant). */
export function indiceRarete(proximite: number): number {
  return NOMS_RARETE.indexOf(rareteDeProximite(proximite));
}

/**
 * La rareté d'un objet : sa proximité en centièmes à la forme du catalogue la
 * plus proche, et le palier où elle tombe. `mot` suffit — un `ObjetPorte` passe
 * tel quel. Rien n'est muté : deux lectures rendent la même chose.
 */
export function rareteDe(o: { readonly mot: number }): { palier: string; proximite: number } {
  const q = qDeMot(o.mot);
  const proximite = alignementCentiemes(q, formeProche(q).q);
  return { palier: rareteDeProximite(proximite), proximite };
}
