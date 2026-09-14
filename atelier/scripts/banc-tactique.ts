/**
 * Banc tactique — un échantillon court du moteur réellement joué.
 *
 * Le banc ne recopie ni la grille, ni la résolution, ni la politique : il
 * construit des unités depuis des objets gelés, puis appelle `ouvrirBataille`
 * et `jouerBataille`. Les 32 objets, l'étage, les distances et les deux sens
 * sont explicites afin qu'un résultat soit rejouable à l'octet.
 *
 * `bancTactique("reduit")` est celui de la CI : 128 duels. Il produit quatre
 * lectures, une par constante dont dépend directement la mécanique :
 *
 * - `coup` : dégâts moyens par coup (`COUP_BASE`),
 * - `tenue` : phases moyennes d'une bataille (`MULT_TENUE`),
 * - `charge` : charge moyenne par coup (`CHARGE_PAR_CASE`),
 * - `pas` : portée moyenne d'un tour (`DIV_PAS`).
 *
 * `node --experimental-strip-types scripts/banc-tactique.ts --complet` joue
 * les 256 duels de calibration hors CI. Le test compare l'échantillon réduit
 * à cette calibration publiée ; une dérive de plus de 10 % est rouge. Ce banc
 * détecte une dérive, il ne remplace pas le protocole étendu des études.
 */

import { ouvrirBataille } from "../src/lib/eidos/tactique/bataille.ts";
import { jouerBataille } from "../src/lib/eidos/tactique/ia.ts";
import { pas, uniteDepuisObjet } from "../src/lib/eidos/tactique/unite.ts";
import { PA_PAR_TOUR, type Case, type Classe, type Unite } from "../src/lib/eidos/tactique/types.ts";
import type { Objet } from "../src/lib/eidos/objets.ts";

/** La salle de 73 cases libres utilisée par les études tactiques. */
export const ETAGE_BANC = 198;

const CLASSES: readonly Classe[] = ["arme", "defense", "accessoire"];

/**
 * Corpus gelé depuis `sha256d("eidos-banc-tactique/1")` le 2026-09-11.
 * Les mots et archétypes sont écrits, pas régénérés : une modification de
 * leur dérivation devient visible dans le diff du banc plutôt que silencieuse.
 */
export const VECTEURS_BANC: readonly Objet[] = [
  { mot: 2142768500, archetype: "mercure", age: "Satya" },
  { mot: 2745133663, archetype: "jupiter", age: "Satya" },
  { mot: 2015498138, archetype: "jupiter", age: "Satya" },
  { mot: 843028313, archetype: "venus", age: "Satya" },
  { mot: 3106372562, archetype: "jupiter", age: "Satya" },
  { mot: 1981990719, archetype: "saturne", age: "Satya" },
  { mot: 4158509074, archetype: "mars", age: "Satya" },
  { mot: 2856394447, archetype: "terre", age: "Satya" },
  { mot: 4043889545, archetype: "lune", age: "Satya" },
  { mot: 3793687341, archetype: "lune", age: "Satya" },
  { mot: 1755263428, archetype: "jupiter", age: "Satya" },
  { mot: 1732836600, archetype: "uranie", age: "Satya" },
  { mot: 3896639318, archetype: "terre", age: "Satya" },
  { mot: 3963802541, archetype: "venus", age: "Satya" },
  { mot: 1702049085, archetype: "jupiter", age: "Satya" },
  { mot: 3217713072, archetype: "lune", age: "Satya" },
  { mot: 3803971841, archetype: "lune", age: "Satya" },
  { mot: 552627499, archetype: "uranie", age: "Satya" },
  { mot: 2775059502, archetype: "venus", age: "Satya" },
  { mot: 4101763357, archetype: "uranie", age: "Satya" },
  { mot: 1872977675, archetype: "saturne", age: "Satya" },
  { mot: 3853687316, archetype: "lune", age: "Satya" },
  { mot: 2826178381, archetype: "mars", age: "Satya" },
  { mot: 1072692931, archetype: "terre", age: "Satya" },
  { mot: 739727683, archetype: "venus", age: "Satya" },
  { mot: 940005996, archetype: "jupiter", age: "Satya" },
  { mot: 4044873199, archetype: "venus", age: "Satya" },
  { mot: 879754604, archetype: "uranie", age: "Satya" },
  { mot: 634097500, archetype: "terre", age: "Satya" },
  { mot: 2908538223, archetype: "lune", age: "Satya" },
  { mot: 3191054539, archetype: "mars", age: "Satya" },
  { mot: 1734861942, archetype: "terre", age: "Satya" },
] as const;

export type ModeBanc = "reduit" | "complet";

export type ResultatBanc = {
  readonly duels: number;
  readonly termines: number;
  readonly abandonnes: number;
  /** Moyennes en milli-unités, pour rester entièrement entières. */
  readonly mesures: Readonly<{
    coup: number;
    tenue: number;
    charge: number;
    pas: number;
  }>;
};

/**
 * Calibration du banc complet (256 duels), relue par
 * `npm run banc-tactique` le 2026-09-14 (C2 ter : riposte en contre,
 * `COUP_BASE` 24, `DIV_ALLONGE` 4 ; le 2026-09-11 : coup 43 865, tenue 1 230,
 * charge 3 467, pas 4 125). Le test CI ne le rejoue pas : il vérifie que
 * l'échantillon réduit reste à moins de 10 % de ces quatre lectures, sans
 * prétendre remplacer le protocole étendu des études.
 */
export const ETALONS_COMPLETS: ResultatBanc["mesures"] = {
  coup: 51215,
  tenue: 1133,
  charge: 2547,
  pas: 4125,
};

function moyenneMillieme(total: number, n: number): number {
  if (n === 0) throw new Error("moyenne sans observation");
  return Math.round((total * 1000) / n);
}

function uniteDeBanc(objet: Objet, rang: number, pos: Case): Unite {
  return uniteDepuisObjet(objet, rang, "coffre", pos, CLASSES[rang % CLASSES.length]!);
}

function distances(mode: ModeBanc): readonly number[] {
  return mode === "reduit" ? [1, 3, 5, 7] : [1, 2, 3, 4, 5, 6, 7, 8];
}

function paires(): readonly number[] {
  return Array.from({ length: 16 }, (_, i) => i);
}

/**
 * Rejoue le corpus, dans les deux sens de chaque distance. La rangée y = 1
 * de l'étage 198 est libre de 0 à 8 et reste ici une partie du vecteur gelé.
 */
export function bancTactique(mode: ModeBanc = "reduit"): ResultatBanc {
  let duels = 0;
  let termines = 0;
  let coups = 0;
  let degats = 0;
  let phases = 0;
  let charge = 0;
  let pasTour = 0;
  let unites = 0;

  for (const i of paires()) {
    const a = VECTEURS_BANC[i]!;
    const b = VECTEURS_BANC[i + 16]!;
    for (const distance of distances(mode)) {
      const gauche = { x: 0, y: 1 };
      const droite = { x: distance, y: 1 };
      for (const inverse of [false, true]) {
        const coffre = uniteDeBanc(inverse ? b : a, i, inverse ? droite : gauche);
        const indechiffre = uniteDeBanc(inverse ? a : b, i + 16, inverse ? gauche : droite);
        const initial = ouvrirBataille(ETAGE_BANC, [coffre], [indechiffre], 64);
        const joue = jouerBataille(initial);

        duels += 1;
        phases += joue.phases;
        if (joue.etat.fin !== null) termines += 1;
        for (const coup of joue.etat.journal) {
          coups += 1;
          degats += coup.porte;
          charge += coup.charge;
        }
        for (const unite of initial.unites) {
          pasTour += PA_PAR_TOUR * pas(unite);
          unites += 1;
        }
      }
    }
  }

  return {
    duels,
    termines,
    abandonnes: duels - termines,
    mesures: {
      coup: moyenneMillieme(degats, coups),
      tenue: moyenneMillieme(phases, duels),
      charge: moyenneMillieme(charge, coups),
      pas: moyenneMillieme(pasTour, unites),
    },
  };
}

function argumentMode(args: readonly string[]): ModeBanc {
  if (args.length === 0 || (args.length === 1 && args[0] === "--reduit")) return "reduit";
  if (args.length === 1 && args[0] === "--complet") return "complet";
  throw new Error("usage : banc-tactique.ts [--reduit|--complet]");
}

if (process.argv[1]?.endsWith("banc-tactique.ts")) {
  const mode = argumentMode(process.argv.slice(2));
  console.log(JSON.stringify({ mode, ...bancTactique(mode) }, null, 2));
}
