/**
 * Banc R2 — le prix des axes, sur le moteur et la politique réels.
 *
 * Le §9 ter de `docs/SPEC_TACTIQUE.md` pose deux cibles à tenir à chaque
 * changement du moteur : **|r| < 0,30** entre la valeur d'un axe et le taux
 * de victoire, et **quartile haut / quartile bas de `lame+ecu` < 3×**. Les
 * trois études du 2026-09-10 les ont mesurées avec des politiques écrites
 * pour l'occasion, et ont rendu trois `r(eperon)` différents pour le même
 * moteur : les cibles mesurent le couple **moteur + politique**. Ce banc ne
 * joue donc qu'une politique, celle du dépôt (`ia.ts`, `jouerBataille`), pour
 * les deux camps, et il ne recopie ni grille, ni résolution, ni politique :
 * `ouvrirBataille`, puis `jouerBataille`, rien d'autre.
 *
 * Le protocole, rejouable à l'octet — aucun `Math.random`, aucune horloge :
 *
 * - **le pool** : `pool` mots, `objetDepuisGraine(sha256d("eq-" + i))`, les
 *   quatre âges à tour de rôle, classe par rang (`arme`, `defense`,
 *   `accessoire`) ; chaque mot affronte `adversaires` mots du pool par
 *   distance, tirés par empreinte (`adv-i-d-k`), à chaque `distances`
 *   d'engagement sur la rangée libre y = 1 de l'étage 198 (73 cases libres) ;
 * - **les deux sièges** : chaque paire se joue deux fois, chacun des deux
 *   mots tenant une fois le coffre (qui joue en premier, case (0,1)) et une
 *   fois l'Indéchiffré (case (d,1)). L'initiative est par camp dans ce
 *   moteur, pas par `eperon` : jouer les deux sièges retire le premier coup
 *   et la case de la mesure, il ne reste que les axes ;
 * - **les panels par tier** : `parTier` mots par tier, tirés dans l'ordre de
 *   `sha256d("tier-" + i)` jusqu'à remplir les douze (`tiers.ts`), chacun
 *   contre `adversaires` mots du pool par distance, deux sièges — la bande
 *   de tier est la différence de taux entre T1 et T12 ;
 * - **les mêlées** : `melees` batailles à 3 contre 3, équipes tirées du pool
 *   (`melee-m-c-k`), coffre en x = 1 et Indéchiffrés en x = 7, rangées 1 à 3,
 *   64 feuilles — ce que coûte une bataille en feuilles, médiane et maximum.
 *
 * Un duel compte pour ses deux mots quand les deux sont du pool, pour le seul
 * sujet quand l'adversaire vient du pool et le sujet d'un panel. Une victoire
 * vaut 2 points, un nul (`jouerBataille` rend la main à `TOURS_MAX` phases
 * sans issue) 1 point à chacun, une défaite 0 : le taux est `points / 2n`,
 * entier jusqu'à la lecture. Les corrélations sont les seuls flottants, et
 * elles sont rendues en millièmes.
 *
 * `bancR2("rapide")` est l'échantillon du test : 200 mots, 24 par tier,
 * 4 adversaires, 4 distances, 60 mêlées. `--complet` rejoue le protocole
 * entier hors CI : 2 000 mots, 120 par tier, 8 adversaires, 8 distances,
 * 1 200 mêlées — 440 320 duels. C'est lui qui a mesuré `DIV_PAS` avant et
 * après C2, puis la riposte en contre et le socle de C2 ter
 * (`docs/ETUDE_EQUILIBRAGE_TACTIQUE.md`, second post-scriptum, PS2.2–PS2.10).
 *
 * Usage : node --experimental-strip-types scripts/banc-r2.ts [--rapide|--complet]
 *
 * LIMITE : ce banc mesure le moteur tel que `ia.ts` le joue, un tour d'avance
 * et une unité à la fois. Un joueur humain, ou une autre politique, rendrait
 * d'autres chiffres ; c'est précisément pourquoi la politique est celle du
 * dépôt et aucune autre. Les mêlées sont posées à une seule distance.
 */

import { combatDe, COMBAT_AXES, type AxeCombat } from "../src/lib/eidos/combat.ts";
import { sha256d, utf8 } from "../src/lib/eidos/hash.ts";
import { ageDeOctet, objetDepuisGraine, type Objet } from "../src/lib/eidos/objets.ts";
import { TIERS, tierDe } from "../src/lib/eidos/tiers.ts";
import { ouvrirBataille } from "../src/lib/eidos/tactique/bataille.ts";
import { jouerBataille } from "../src/lib/eidos/tactique/ia.ts";
import {
  DIV_PAS,
  DIV_PORTEE,
  PAS_BASE,
  PORTEE_BASE,
  uniteDepuisObjet,
} from "../src/lib/eidos/tactique/unite.ts";
import {
  CHARGE_PAR_CASE,
  COUP_BASE,
  PA_PAR_TOUR,
  type Case,
  type Classe,
  type Unite,
} from "../src/lib/eidos/tactique/types.ts";

/** La salle de 73 cases libres des études tactiques, celle du banc de C3. */
export const ETAGE_R2 = 198;

/** Feuilles données au coffre : l'arbre entier d'une veillée. */
export const FEUILLES_R2 = 64;

const CLASSES: readonly Classe[] = ["arme", "defense", "accessoire"];

export type ModeR2 = "rapide" | "complet";

export type ParametresR2 = {
  readonly pool: number;
  readonly parTier: number;
  readonly adversaires: number;
  readonly distances: readonly number[];
  readonly melees: number;
};

export const PARAMETRES_R2: Record<ModeR2, ParametresR2> = {
  rapide: { pool: 200, parTier: 24, adversaires: 4, distances: [1, 3, 5, 7], melees: 60 },
  complet: {
    pool: 2000,
    parTier: 120,
    adversaires: 8,
    distances: [1, 2, 3, 4, 5, 6, 7, 8],
    melees: 1200,
  },
};

export type EtalonR2 = {
  readonly r: Readonly<Record<AxeCombat, number>>;
  readonly bandeMille: number;
  readonly nulsMille: number;
  readonly coupsMax: number;
  readonly pointesT12Mille: Readonly<Record<AxeCombat, number>>;
};

/**
 * Le protocole complet, relu le 2026-09-14 sur le moteur de C2 ter — la
 * riposte en contre, `COUP_BASE` 24, `DIV_ALLONGE` 4, `DIV_PAS` 32 : 440 320
 * duels et 1 200 mêlées, `npm run banc-r2`. La CI ne le rejoue pas ; le
 * second post-scriptum de `docs/ETUDE_EQUILIBRAGE_TACTIQUE.md` en tient le
 * détail (PS2.10), et le test vérifie que l'échantillon rapide reste du même
 * côté de chaque cible que lui. La veille, sur la riposte à portée et le socle
 * 16 : r { lame 3, ecu 57, eperon −640, arc 591 }, bande 296, pointes T12
 * { 376, 203, 38, 439 }.
 */
export const ETALONS_R2_COMPLET: EtalonR2 = {
  r: { lame: -7, ecu: -8, eperon: -128, arc: 145 },
  bandeMille: 324,
  nulsMille: 0,
  coupsMax: 8,
  pointesT12Mille: { lame: 402, ecu: 217, eperon: 110, arc: 165 },
};

/**
 * L'échantillon rapide, exact : ce que `bancR2("rapide")` rend aujourd'hui.
 * Il ne bouge que si le moteur ou la politique bougent — et c'est alors la
 * mesure complète qu'il faut refaire, pas l'étalon qu'il faut retoucher.
 */
export const ETALONS_R2_RAPIDE: EtalonR2 = {
  r: { lame: 126, ecu: -58, eperon: 53, arc: -109 },
  bandeMille: 287,
  nulsMille: 0,
  coupsMax: 7,
  pointesT12Mille: { lame: 469, ecu: 215, eperon: 138, arc: 117 },
};

/** Dérive tolérée avant que le test ne soit rouge : millièmes pour r, la bande et les nuls ; feuilles pour les coups. */
export const TOLERANCES_R2 = { r: 50, bande: 40, nuls: 10, coups: 2 } as const;

/** Points d'un mot : 2 par victoire, 1 par nul, 0 par défaite, sur `n` duels. */
type Compte = { points: number; n: number };

type Bilan = {
  duels: number;
  nuls: number;
  epuises: number;
  phases: number;
  coups: number;
};

export type ResultatR2 = {
  readonly mode: ModeR2;
  readonly parametres: ParametresR2;
  /** Les constantes du moteur au moment de la mesure : le résultat se date. */
  readonly moteur: Readonly<{
    DIV_PAS: number;
    PAS_BASE: number;
    DIV_PORTEE: number;
    PORTEE_BASE: number;
    PA_PAR_TOUR: number;
    COUP_BASE: number;
    CHARGE_PAR_CASE: number;
    pasMax: number;
    pasTourMax: number;
    porteeMax: number;
  }>;
  readonly pool: Readonly<{
    duels: number;
    /** Duels rendus sans issue à `TOURS_MAX` phases, en millièmes des duels. */
    nulsMille: number;
    epuises: number;
    phasesMille: number;
    coupsMille: number;
    /** r(axe, taux de victoire) en millièmes, sur les mots du pool. */
    r: Readonly<Record<AxeCombat, number>>;
    rMaxAbs: number;
    /** Taux moyen du quartile haut / quartile bas de `lame+ecu`, en centièmes. */
    quartilesLameEcuCent: number;
    tauxMille: Readonly<Record<"q1" | "q4", number>>;
  }>;
  readonly tiers: Readonly<{
    duels: number;
    nulsMille: number;
    /** Taux de victoire du panel de chaque tier, T1..T12, en millièmes. */
    tauxMille: readonly number[];
    /** T1 − T12, en millièmes de taux (351 = 35,1 points). */
    bandeMille: number;
    /** Au tier le plus haut, le taux de victoire selon l'axe de pointe du mot : quelle pointe survit à l'extrémité. */
    pointesT12Mille: Readonly<Record<AxeCombat, number>>;
  }>;
  readonly melees: Readonly<{
    batailles: number;
    nuls: number;
    epuises: number;
    /** Feuilles brûlées par bataille : coups du coffre. */
    coupsMediane: number;
    coupsMax: number;
    coupsMoyenMille: number;
    phasesMediane: number;
  }>;
};

function u32De(tag: string): number {
  const h = sha256d(utf8(tag));
  return ((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0;
}

function motDuPool(i: number): Objet {
  return objetDepuisGraine(sha256d(utf8("eq-" + i)), ageDeOctet(i));
}

/**
 * Les douze panels, tirés dans l'ordre d'une seule suite `tier-i` jusqu'à ce
 * que chacun compte `parTier` mots. T12 vaut un mot sur 2 048 : la suite est
 * longue, pas aléatoire.
 */
export function panelsParTier(parTier: number): readonly (readonly Objet[])[] {
  const panels: Objet[][] = Array.from({ length: TIERS }, () => []);
  let restants = TIERS;
  for (let i = 0; restants > 0; i++) {
    const o = objetDepuisGraine(sha256d(utf8("tier-" + i)), ageDeOctet(i));
    const p = panels[tierDe(o) - 1]!;
    if (p.length < parTier) {
      p.push(o);
      if (p.length === parTier) restants -= 1;
    }
  }
  return panels;
}

function unite(o: Objet, id: number, classe: Classe, pos: Case): Unite {
  return uniteDepuisObjet(o, id, "coffre", pos, classe);
}

/** Un duel : `coffre` en (0,1) joue en premier, `adverse` en (d,1). Rend les points du coffre, de l'adverse. */
function duel(
  coffre: Objet,
  classeCoffre: Classe,
  adverse: Objet,
  classeAdverse: Classe,
  distance: number,
  bilan: Bilan,
): [number, number] {
  const initial = ouvrirBataille(
    ETAGE_R2,
    [unite(coffre, 0, classeCoffre, { x: 0, y: 1 })],
    [unite(adverse, 1, classeAdverse, { x: distance, y: 1 })],
    FEUILLES_R2,
  );
  const joue = jouerBataille(initial);
  bilan.duels += 1;
  bilan.phases += joue.phases;
  bilan.coups += joue.etat.journal.filter((c) => !c.riposte).length;
  const fin = joue.etat.fin;
  if (fin === null) {
    bilan.nuls += 1;
    return [1, 1];
  }
  if (fin.issue === "victoire") return [2, 0];
  if (fin.issue === "defaite") return [0, 2];
  bilan.epuises += 1;
  return [1, 1];
}

function ajouter(c: Compte, points: number): void {
  c.points += points;
  c.n += 1;
}

function taux(c: Compte): number {
  return c.n === 0 ? 0.5 : c.points / (2 * c.n);
}

function mille(x: number): number {
  return Math.round(x * 1000);
}

function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = xs.length;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]!;
    sy += ys[i]!;
  }
  const mx = sx / n;
  const my = sy / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i]! - mx;
    const dy = ys[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
}

function mediane(valeurs: readonly number[]): number {
  const t = [...valeurs].sort((a, b) => a - b);
  const n = t.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? t[(n - 1) / 2]! : Math.trunc((t[n / 2 - 1]! + t[n / 2]!) / 2);
}

export function bancR2(mode: ModeR2 = "rapide"): ResultatR2 {
  const p = PARAMETRES_R2[mode];
  const pool = Array.from({ length: p.pool }, (_, i) => motDuPool(i));
  const axes = pool.map((o) => combatDe(o));
  const comptes: Compte[] = pool.map(() => ({ points: 0, n: 0 }));

  // -- le pool contre lui-même, deux sièges ---------------------------------
  const bilanPool: Bilan = { duels: 0, nuls: 0, epuises: 0, phases: 0, coups: 0 };
  for (let i = 0; i < p.pool; i++) {
    for (const d of p.distances) {
      for (let k = 0; k < p.adversaires; k++) {
        const j = (i + 1 + (u32De(`adv-${i}-${d}-${k}`) % (p.pool - 1))) % p.pool;
        const ci = CLASSES[i % 3]!;
        const cj = CLASSES[j % 3]!;
        const [a1, b1] = duel(pool[i]!, ci, pool[j]!, cj, d, bilanPool);
        ajouter(comptes[i]!, a1);
        ajouter(comptes[j]!, b1);
        const [b2, a2] = duel(pool[j]!, cj, pool[i]!, ci, d, bilanPool);
        ajouter(comptes[i]!, a2);
        ajouter(comptes[j]!, b2);
      }
    }
  }
  const tauxPool = comptes.map(taux);
  const r = {} as Record<AxeCombat, number>;
  let rMaxAbs = 0;
  for (const axe of COMBAT_AXES) {
    const v = mille(pearson(axes.map((c) => c[axe]), tauxPool));
    r[axe] = v;
    rMaxAbs = Math.max(rMaxAbs, Math.abs(v));
  }
  const ordre = pool
    .map((_, i) => i)
    .sort((a, b) => axes[a]!.lame + axes[a]!.ecu - (axes[b]!.lame + axes[b]!.ecu) || a - b);
  const quart = Math.trunc(p.pool / 4);
  const moyenne = (ids: readonly number[]) =>
    ids.reduce((s, i) => s + tauxPool[i]!, 0) / ids.length;
  const q1 = moyenne(ordre.slice(0, quart));
  const q4 = moyenne(ordre.slice(p.pool - quart));

  // -- les panels par tier contre le pool -----------------------------------
  const bilanTiers: Bilan = { duels: 0, nuls: 0, epuises: 0, phases: 0, coups: 0 };
  const tauxTiers: number[] = [];
  const pointesT12: Record<AxeCombat, Compte> = {
    lame: { points: 0, n: 0 },
    ecu: { points: 0, n: 0 },
    eperon: { points: 0, n: 0 },
    arc: { points: 0, n: 0 },
  };
  panelsParTier(p.parTier).forEach((panel, t) => {
    const compte: Compte = { points: 0, n: 0 };
    panel.forEach((o, s) => {
      const cs = CLASSES[s % 3]!;
      const pointe = t === TIERS - 1 ? pointesT12[combatDe(o).pointe] : null;
      for (const d of p.distances) {
        for (let k = 0; k < p.adversaires; k++) {
          const j = u32De(`tier-${t + 1}-${s}-${d}-${k}`) % p.pool;
          const cj = CLASSES[j % 3]!;
          const a = duel(o, cs, pool[j]!, cj, d, bilanTiers)[0];
          const b = duel(pool[j]!, cj, o, cs, d, bilanTiers)[1];
          ajouter(compte, a);
          ajouter(compte, b);
          if (pointe !== null) {
            ajouter(pointe, a);
            ajouter(pointe, b);
          }
        }
      }
    });
    tauxTiers.push(mille(taux(compte)));
  });

  // -- les mêlées à trois contre trois --------------------------------------
  const coupsMelee: number[] = [];
  const phasesMelee: number[] = [];
  let nulsMelee = 0;
  let epuisesMelee = 0;
  for (let m = 0; m < p.melees; m++) {
    const equipe = (camp: string, x: number) =>
      [0, 1, 2].map((k) => {
        const j = u32De(`melee-${m}-${camp}-${k}`) % p.pool;
        return unite(pool[j]!, k, CLASSES[j % 3]!, { x, y: 1 + k });
      });
    const joue = jouerBataille(
      ouvrirBataille(ETAGE_R2, equipe("c", 1), equipe("i", 7), FEUILLES_R2),
    );
    coupsMelee.push(FEUILLES_R2 - joue.etat.feuilles);
    phasesMelee.push(joue.phases);
    if (joue.etat.fin === null) nulsMelee += 1;
    else if (joue.etat.fin.issue === "epuise") epuisesMelee += 1;
  }

  const pasMax = PAS_BASE + Math.trunc(64 / DIV_PAS);
  const porteeMax = PORTEE_BASE + Math.trunc(64 / DIV_PORTEE);
  return {
    mode,
    parametres: p,
    moteur: {
      DIV_PAS,
      PAS_BASE,
      DIV_PORTEE,
      PORTEE_BASE,
      PA_PAR_TOUR,
      COUP_BASE,
      CHARGE_PAR_CASE,
      pasMax,
      pasTourMax: PA_PAR_TOUR * pasMax,
      porteeMax,
    },
    pool: {
      duels: bilanPool.duels,
      nulsMille: mille(bilanPool.nuls / bilanPool.duels),
      epuises: bilanPool.epuises,
      phasesMille: mille(bilanPool.phases / bilanPool.duels),
      coupsMille: mille(bilanPool.coups / bilanPool.duels),
      r,
      rMaxAbs,
      quartilesLameEcuCent: q1 === 0 ? 0 : Math.round((100 * q4) / q1),
      tauxMille: { q1: mille(q1), q4: mille(q4) },
    },
    tiers: {
      duels: bilanTiers.duels,
      nulsMille: mille(bilanTiers.nuls / bilanTiers.duels),
      tauxMille: tauxTiers,
      bandeMille: tauxTiers[0]! - tauxTiers[TIERS - 1]!,
      pointesT12Mille: {
        lame: mille(taux(pointesT12.lame)),
        ecu: mille(taux(pointesT12.ecu)),
        eperon: mille(taux(pointesT12.eperon)),
        arc: mille(taux(pointesT12.arc)),
      },
    },
    melees: {
      batailles: p.melees,
      nuls: nulsMelee,
      epuises: epuisesMelee,
      coupsMediane: mediane(coupsMelee),
      coupsMax: Math.max(...coupsMelee),
      coupsMoyenMille: mille(coupsMelee.reduce((s, c) => s + c, 0) / coupsMelee.length),
      phasesMediane: mediane(phasesMelee),
    },
  };
}

function argumentMode(args: readonly string[]): ModeR2 {
  if (args.length === 0 || (args.length === 1 && args[0] === "--rapide")) return "rapide";
  if (args.length === 1 && args[0] === "--complet") return "complet";
  throw new Error("usage : banc-r2.ts [--rapide|--complet]");
}

if (process.argv[1]?.endsWith("banc-r2.ts")) {
  const mode = argumentMode(process.argv.slice(2));
  const debut = Date.now();
  const resultat = bancR2(mode);
  console.log(JSON.stringify({ ...resultat, secondes: Math.round((Date.now() - debut) / 1000) }, null, 2));
}
