/**
 * Banc de la veillée — ce qu'une run entière coûte en feuilles, sous chaque règle.
 *
 * Deux textes du dépôt se contredisent sur ce qu'une feuille signe en combat
 * (`docs/HANDOVER_VEILLEE_BATAILLE.md` §3, arbitrage A17) : `SPEC_TACTIQUE.md`
 * D2 — **un coup porté** par le coffre, arbre de 64 ; `BIBLE_VEILLEE.md` §4.3 —
 * **une mort** (un Indéchiffré retiré de la dalle), arbre de 32. Et le nombre
 * de salles n'est pas arrêté non plus (A18) : 27 dans le code, 9 dans la bible
 * §6.1. Ce banc ne tranche rien par un texte : il joue des runs entières sur
 * le moteur et la politique réels et compte.
 *
 * Le protocole, rejouable à l'octet — aucun `Math.random`, aucune horloge,
 * **aucune signature** (le budget est une soustraction, l'arbre n'y change
 * rien : un run de 27 salles coûte ≈ 60 ms sur ce poste, 26 batailles à
 * 3 contre 3, contre 2,5 à 4 s pour un run signé de `veillee-bot.ts`) :
 *
 * - **le jour** : `jours` jours synthétiques, `id_bloc = sha256d("banc-veillee/jour-d")`,
 *   graine du parcours par `graineDuJour` comme dans `veillee.ts` ; les runs
 *   se répartissent sur les jours, un jour dense est un jour dur ;
 * - **le parcours** : celui du pendule (`penduleInitial`, `transition`), le choix
 *   de fin de salle tiré par le xorshift du run (`pendule-phase0.ts`), l'objet
 *   porté = le premier mot du roster ; `etageDeSalles` rejoue `etageDe` avec
 *   `ETAGES_PAR_BANDE` en paramètre — 3 (27 salles, le code) ou 1 (9 salles,
 *   la bible §6.1), contrôlé identique à `pendule.etageDe` pour 3. **La
 *   dernière salle ne se joue pas** : comme dans `veillee-tour.ts`, le dernier
 *   franchir *est* le sommet (« la dernière salle n'a pas de fin à signer ») —
 *   26 batailles et 26 franchir pour 27 salles, 8 et 8 pour 9 ;
 * - **le roster** : `reserve` objets au coffre (trois, sauf sous « réserve »),
 *   `objetDepuisGraine(sha256d("roster-k-j"))`, trois en lice, la loi des
 *   tiers est celle du tirage lui-même, la classe **lue du mot** comme le jeu
 *   la lit (`ficheDe` → `formeProche` : elle entre dans l'accord de chaque
 *   coup, ce n'est pas une lecture) et attachée à l'objet, jamais à son rang ;
 *   posés comme `partie.ts` les pose (`posesDuCoffre`, `caseLibre`) ; la tenue
 *   repart de `ecu` à chaque salle (D1). Le roster et les choix du run ne
 *   dépendent que du jour `d`, du rang `k` et de `reserve` — **jamais de la
 *   règle** : les quarante-cinq configurations rejouent les mêmes parcours, les
 *   trois premiers objets sont les mêmes partout, une réserve plus longue les
 *   prolonge sans les changer, et l'écart entre deux configurations ne vient
 *   que de la règle ou de la réserve ;
 * - **les Indéchiffrés** : les occupants de l'étage (`indechiffresDe` de
 *   `partie.ts`, un coffre vide : tout occupant est présent), 1 à 3 ;
 * - **la bataille** : `ouvrirBataille` puis `jouerBataille`, `ia.ts` des deux
 *   côtés, rien d'autre ; un nul (`TOURS_MAX` phases sans issue) ou une
 *   défaite laissent la salle **tenue**, on franchit quand même (aucune règle
 *   ne l'interdit aujourd'hui, et la défaite ne prend aucune feuille) — la run
 *   ne finit que sur l'arbre vide ou la dernière salle, pour que le budget se
 *   lise seul ; la survie se lit à côté (batailles perdues, première défaite) ;
 * - **le roster** revient entier à chaque salle (la règle du code : la tenue
 *   repart de `ecu`), ou, en **permadeath** (A5, tranché le 2026-09-14 pour la
 *   veillée ancrée), une unité tombée ne revient pas — roster vide, on
 *   traverse sans se battre, et le banc le compte (`rosterBalayeMille`). En
 *   permadeath, **« arrivé » exige un roster vivant au sommet** : un roster
 *   mort ne lit aucune salle (bible §5.2), ses feuilles restantes ne
 *   plafonnent aucun butin, et un verdict qui les compterait jugerait une
 *   marche, pas une règle ;
 * - **les contreparties de la permadeath** (A28, posé par la mesure du
 *   2026-09-14 : telle qu'écrite, elle vide le roster à la salle 1), à
 *   9 salles seulement, aucune ne touche au moteur. Les deux du handover :
 *   **« perdue »** (a), une unité tombée ne quitte le coffre que dans une
 *   bataille **perdue** — gagnée ou nulle, elle est K.O. et revient ;
 *   **« recrue »** (b), après une salle **gagnée**, si le roster est court, le
 *   bot capture le premier Indéchiffré de l'étage (`recrueDe` : `captureDe`
 *   puis `objetDePorte`, la lecture de `partie.indechiffresDe`), une feuille
 *   comme tout `prendre`, et seulement s'il garde après une feuille par salle
 *   qui reste à franchir (`peutDepenser`). **(b) mesure un chantier, pas le
 *   jeu tel que codé**, et le mesure au plus favorable — son chiffre est un
 *   plafond : la capsule est gratuite et illimitée (`prendreDansCoffre` en
 *   exige une du coffre et la consomme ; le bot n'en a aucune), la capture
 *   réussit toujours (ni parade, ni capsule brisée), la recrue se bat dans la
 *   run même (dans le jeu une capture va au **sac** et n'entre au coffre qu'au
 *   sommet ou à la porte, `veillee-tour.ts`), et c'est l'abattu qui se relève
 *   (bible §5.3 : une capsule lancée sur un Indéchiffré se brise ; handover
 *   §4 : `tour.abattus` pour ne pas capturer un mort). Puis une **quatrième
 *   option, posée par ce lot** (d) : **« réserve »**, le coffre porte
 *   `reserve` objets (6, 9, 12 — les trois premiers sont le roster des autres
 *   configurations), les trois premiers vivants entrent en lice dans l'ordre
 *   du coffre comme `combattants` les range, une tombée ne revient pas ; c'est
 *   le jeu tel que codé (`MAX_COFFRE` borne la lice, pas le coffre), que la
 *   mesure de 5a avait réduit à trois objets. Et (a) avec (d) : « perdue »
 *   sur une réserve de 6 ou 9, une défaite coûte la lice entière et la
 *   réserve prend la suite. Enfin **le cran en dessous, demandé par l'auteur
 *   le 2026-09-15 sur les chiffres de (a)** — « perdre coûte l'équipe entière,
 *   n'est-ce pas trop punir ? » — **« perdue-1 »** (e) : une défaite ne coûte
 *   que **la première tombée**, la cible du premier coup `retiree` du journal
 *   porté contre le coffre (`premiereTombee` : le moteur l'écrit dans l'ordre,
 *   riposte comprise, rien n'est rejoué) ; les deux autres se relèvent comme
 *   après une victoire ; sur 3 objets (la lice se bat ensuite à deux, puis à
 *   une) et sur 6 (la réserve la recomplète trois fois). On lit en plus les
 *   unités **perdues** et les **recrues** par run — le seul puits réel du jeu
 *   (`SPEC_PUITS.md` §6) se chiffre ici, et c'est lui que (a) et (e) arbitrent :
 *   trois objets par défaite, ou un ;
 * - **le bot qui ramasse** (A17, demandé par l'auteur le 2026-09-15 : « sous
 *   « une mort à 32 », le joueur a-t-il plus de chances de finir les salles ? ») :
 *   `butin` gestes par salle **gagnée** — la salle se lit quand elle est vide,
 *   bible §5.2 —, une feuille chacun (parler, creuser, ouvrir, prendre coûtent
 *   tous une feuille dans `veillee-tour.ts`), sous la garde de `peutDepenser` :
 *   il garde une feuille par salle qui reste à franchir, rien pour les
 *   batailles à venir. On lit les gestes pris et voulus, les runs où l'arbre en
 *   a refusé un, et les arbres vides en bataille (`epuisesMille`) — le sac
 *   perdu du joueur qui a dépensé sa marge. Sur le roster qui revient, pour que
 *   l'arbre se lise seul ; la survie est mesurée à côté ;
 * - **le budget** : `arbre` feuilles ; chaque franchir en coûte une ; en
 *   combat, règle « coup » : le moteur décrémente lui-même `feuilles` à chaque
 *   coup du coffre et finit la bataille sur `epuise` à zéro ; règle « mort » :
 *   le moteur reçoit un budget que rien n'entame, et chaque Indéchiffré retiré
 *   (riposte comprise) coûte une feuille après coup. **L'arbre nu est une fin**
 *   sous les deux règles, comme dans `veillee.ts` (`gestes.length >= 64` ⇒
 *   `epuise`, sauf le sommet) : un budget à zéro après une bataille ou un
 *   franchir épuise la run là où elle se tient — sauf si ce franchir était le
 *   dernier, qui est le sommet ; aucune salle n'est jamais abordée à zéro.
 *   Ce que la bible §4.4 propose pour l'arbre nu (« il blesse au lieu de
 *   tuer ») n'est pas modélisé.
 *
 * Quarante-cinq configurations : les deux règles à leur arbre (coup 64, mort
 * 32), sur 27 et 9 salles, plus le repli de la bible §4.5 (mort 64) — chacune
 * avec le roster qui revient et en permadeath telle qu'écrite (douze) ; puis,
 * sur les trois socles à 9 salles, les neuf contreparties d'A28 (vingt-sept) ;
 * puis, sur les mêmes, le bot qui ramasse un ou deux gestes par salle (six).
 * Ce qu'on lit par configuration : la part des runs qui atteignent la dernière salle,
 * les feuilles restantes à l'arrivée (médiane, quartiles), la part des
 * arrivés qui gardent plus de `INUTILISEES` feuilles, les épuisements et leur
 * salle médiane, coups et morts par bataille, unités perdues et recrues par
 * run, et chaque bataille dans une case et une seule — gagnée, perdue, nulle
 * ou épuisée (« coup » seulement : l'arbre vide en pleine bataille), les
 * quatre sommant à 1 000 ‰. Les **seuils** sont ceux de
 * la bible §4.5, écrits avant la mesure : moins de `ARRIVEE_MIN` (30 %) des
 * runs arrivent ⇒ l'arbre est **trop court** pour cette règle ; plus de
 * `GARDENT_MAX` (80 %) des arrivés gardent plus de 6 feuilles ⇒ **trop long**.
 *
 * Ce que le banc ne mesure pas, et qu'il faut lire à côté des chiffres : ce
 * que le butin rapporte (le bot paie des gestes, il ne lit ni hôte ni alcôve —
 * hors des six configurations qui ramassent, les feuilles « restantes » sont le
 * plafond du butin, pas son compte), la fuite par une sortie de salle (V3, non
 * codée), et ce qu'une salle perdue coûte au jeu (rien ici : ni butin, ni
 * feuille — c'est la règle d'aujourd'hui).
 *
 * `bancVeillee("rapide")` est l'échantillon du test : 24 runs par configuration
 * sur 6 jours, ≈ 32 s sur ce poste (i7-7700HQ, Node 22) quand la machine est
 * libre, ≈ 65 s avec les contrôles run par run — `npm test` le paie à chaque
 * passage ; `--complet` rejoue 1 000 runs sur 40 jours, hors CI, ≈ 50 min, ou
 * configuration par configuration (un appel borné à dix minutes en tient huit
 * ou neuf : lancer par lots).
 *
 * Usage : node --experimental-strip-types scripts/banc-veillee.ts [--rapide|--complet] [configuration ...]
 * (sans nom : les quarante-cinq ; `npm run banc-veillee` est le complet entier)
 *
 * LIMITE : la politique est celle du dépôt, des deux côtés ; un joueur humain
 * rend d'autres chiffres. C'est précisément pourquoi c'est elle et aucune
 * autre : les cibles mesurent le couple moteur + politique.
 */

import { formeProche } from "../src/lib/eidos/bestiaire.ts";
import { captureDe } from "../src/lib/eidos/capsules.ts";
import { hexOf, sha256d, utf8 } from "../src/lib/eidos/hash.ts";
import { objetDePorte } from "../src/lib/eidos/inventaire.ts";
import { tourVide } from "../src/lib/eidos/jauge.ts";
import { ageDeOctet, objetDepuisGraine, type Objet } from "../src/lib/eidos/objets.ts";
import {
  BANDES,
  CHOIX,
  CRANS,
  ETAGES_PAR_BANDE,
  debutBande,
  etageDe,
  penduleInitial,
  transition,
} from "../src/lib/eidos/pendule.ts";
import { xorshift } from "../src/lib/eidos/pendule-phase0.ts";
import { ouvrirBataille } from "../src/lib/eidos/tactique/bataille.ts";
import { TOURS_MAX, jouerBataille } from "../src/lib/eidos/tactique/ia.ts";
import { caseLibre, indechiffresDe, posesDuCoffre } from "../src/lib/eidos/tactique/partie.ts";
import { uniteDepuisObjet, vivante } from "../src/lib/eidos/tactique/unite.ts";
import type { Case, Classe, EtatBataille, Unite } from "../src/lib/eidos/tactique/types.ts";
import { qDeMot } from "../src/lib/eidos/resonance.ts";
import { ETAGES, dalleDe, occupantsDe } from "../src/lib/eidos/tour.ts";
import { FEUILLES, graineDuJour } from "../src/lib/eidos/veillee.ts";

export type Regle = "coup" | "mort";

/**
 * Ce qui retient la permadeath (A28) : rien (telle qu'écrite) ; « perdue »,
 * seule une bataille perdue retire les tombées ; « perdue-1 », seule une
 * bataille perdue retire une unité, la première tombée ; « recrue », une
 * capture par salle gagnée quand le roster est court.
 */
export type Contrepartie = "aucune" | "perdue" | "perdue-1" | "recrue";

export type Configuration = {
  readonly nom: string;
  readonly regle: Regle;
  readonly arbre: number;
  readonly salles: number;
  /** `ETAGES_PAR_BANDE` rejoué : 3 pour 27 salles, 1 pour 9. */
  readonly parBande: number;
  /** une unité tombée ne revient pas (A5) ; sinon le roster revient entier à chaque salle */
  readonly permadeath: boolean;
  /** en permadeath seulement ; « aucune » sinon */
  readonly contrepartie: Contrepartie;
  /** objets du coffre : `ROSTER` (la lice seule) ou plus — les trois premiers vivants entrent */
  readonly reserve: number;
  /** gestes de butin par salle gagnée, une feuille chacun ; 0 = le bot ne ramasse rien */
  readonly butin: number;
};

type Socle = Omit<Configuration, "permadeath" | "contrepartie" | "reserve" | "butin">;

/** Unités du coffre en lice : `partie.MAX_COFFRE`, la bible §5.4 (trois au plus). */
export const ROSTER = 3;

const SOCLES: readonly Socle[] = [
  { nom: "coup-64-27", regle: "coup", arbre: FEUILLES, salles: 27, parBande: 3 },
  { nom: "coup-64-9", regle: "coup", arbre: FEUILLES, salles: 9, parBande: 1 },
  { nom: "mort-32-27", regle: "mort", arbre: 32, salles: 27, parBande: 3 },
  { nom: "mort-32-9", regle: "mort", arbre: 32, salles: 9, parBande: 1 },
  { nom: "mort-64-27", regle: "mort", arbre: FEUILLES, salles: 27, parBande: 3 },
  { nom: "mort-64-9", regle: "mort", arbre: FEUILLES, salles: 9, parBande: 1 },
];

/**
 * Les neuf contreparties d'A28, à 9 salles : (a) perdue, (b) recrue, (d) une
 * réserve de 6, 9 ou 12 objets, (a) sur une réserve de 6 ou 9, puis (e)
 * perdue-1 sur 3 et 6 objets.
 */
const CONTREPARTIES: readonly { suffixe: string; contrepartie: Contrepartie; reserve: number }[] = [
  { suffixe: "pd-perdue", contrepartie: "perdue", reserve: ROSTER },
  { suffixe: "pd-recrue", contrepartie: "recrue", reserve: ROSTER },
  { suffixe: "pd-r6", contrepartie: "aucune", reserve: 6 },
  { suffixe: "pd-r9", contrepartie: "aucune", reserve: 9 },
  { suffixe: "pd-r12", contrepartie: "aucune", reserve: 12 },
  { suffixe: "pd-perdue-r6", contrepartie: "perdue", reserve: 6 },
  { suffixe: "pd-perdue-r9", contrepartie: "perdue", reserve: 9 },
  { suffixe: "pd-perdue1", contrepartie: "perdue-1", reserve: ROSTER },
  { suffixe: "pd-perdue1-r6", contrepartie: "perdue-1", reserve: 6 },
];

/** Les appétits du bot qui ramasse (A17) : un ou deux gestes par salle gagnée. */
const APPETITS: readonly number[] = [1, 2];

/**
 * Les quarante-cinq configurations : les six socles, le roster qui revient
 * puis en permadeath telle qu'écrite ; puis les trois socles à 9 salles sous
 * chaque contrepartie ; puis, le roster qui revient, sous chaque appétit.
 */
export const CONFIGURATIONS: readonly Configuration[] = [
  ...SOCLES.map((c) => ({ ...c, permadeath: false, contrepartie: "aucune" as const, reserve: ROSTER, butin: 0 })),
  ...SOCLES.map((c) => ({ ...c, nom: `${c.nom}-pd`, permadeath: true, contrepartie: "aucune" as const, reserve: ROSTER, butin: 0 })),
  ...SOCLES.filter((c) => c.salles === 9).flatMap((c) =>
    CONTREPARTIES.map((p) => ({
      ...c,
      nom: `${c.nom}-${p.suffixe}`,
      permadeath: true,
      contrepartie: p.contrepartie,
      reserve: p.reserve,
      butin: 0,
    })),
  ),
  ...SOCLES.filter((c) => c.salles === 9).flatMap((c) =>
    APPETITS.map((b) => ({ ...c, nom: `${c.nom}-b${b}`, permadeath: false, contrepartie: "aucune" as const, reserve: ROSTER, butin: b })),
  ),
];

/** Budget que rien n'entame, pour la règle « mort » : le moteur ne finit jamais sur `epuise`. */
export const FEUILLES_SANS_FOND = 60_000;

/** Les seuils de la bible §4.5, en millièmes, écrits avant la mesure. */
export const SEUILS = { arriveeMin: 300, gardentMax: 800, inutilisees: 6 } as const;

/** Ce que le test gèle d'une configuration, et ce qu'il compare au protocole complet. */
export type EtalonVeillee = {
  readonly arrivesMille: number;
  readonly restantesMediane: number | null;
  readonly gardentMille: number | null;
  readonly coupsParBatailleMille: number;
  readonly mortsParBatailleMille: number;
  readonly verdict: { readonly tropCourt: boolean; readonly tropLong: boolean; readonly tient: boolean };
};

/**
 * Dérive tolérée entre l'échantillon et son étalon (le même code, hier) :
 * millièmes pour les arrivés, feuilles pour la médiane, millièmes de coup et
 * de mort par bataille ; `verdict` est la marge, en millièmes, en deçà de
 * laquelle un verdict de l'échantillon ne se compare pas à celui du complet
 * (à 24 runs, un run vaut 42 ‰).
 */
export const TOLERANCES_VEILLEE = { arrives: 100, restantes: 3, coups: 600, morts: 200, verdict: 100 } as const;

export type ModeVeillee = "rapide" | "complet";

export type ParametresVeillee = { readonly runs: number; readonly jours: number };

export const PARAMETRES_VEILLEE: Record<ModeVeillee, ParametresVeillee> = {
  rapide: { runs: 24, jours: 6 },
  complet: { runs: 1000, jours: 40 },
};

const CLASSES: readonly Classe[] = ["arme", "defense", "accessoire"];

/** La classe d'un mot, comme `ficheDe` la lit : la forme la plus proche du catalogue, `accessoire` à défaut. */
export function classeDuMot(mot: number): Classe {
  const c = formeProche(qDeMot(mot)).classe;
  return (CLASSES as readonly string[]).includes(c) ? (c as Classe) : "accessoire";
}

/** L'échantillon (24 runs × 6 jours), gelé le 2026-09-14 ; se regèle avec le moteur, jamais à la main. */
export const ETALONS_VEILLEE_RAPIDE: Record<string, EtalonVeillee> = {
  "coup-64-27": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3778, mortsParBatailleMille: 1711, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9": { arrivesMille: 1000, restantesMediane: 24, gardentMille: 1000, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-27": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3872, mortsParBatailleMille: 1767, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9": { arrivesMille: 1000, restantesMediane: 9, gardentMille: 875, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-27": { arrivesMille: 42, restantesMediane: 0, gardentMille: 0, coupsParBatailleMille: 4070, mortsParBatailleMille: 1791, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9": { arrivesMille: 1000, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-27-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 4133, mortsParBatailleMille: 1711, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3983, mortsParBatailleMille: 1717, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-27-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 4133, mortsParBatailleMille: 1711, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3983, mortsParBatailleMille: 1717, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-27-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 4133, mortsParBatailleMille: 1711, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3983, mortsParBatailleMille: 1717, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-perdue": { arrivesMille: 292, restantesMediane: 25, gardentMille: 1000, coupsParBatailleMille: 4172, mortsParBatailleMille: 1851, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-recrue": { arrivesMille: 250, restantesMediane: 20, gardentMille: 1000, coupsParBatailleMille: 4077, mortsParBatailleMille: 1859, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-r6": { arrivesMille: 125, restantesMediane: 18, gardentMille: 1000, coupsParBatailleMille: 3685, mortsParBatailleMille: 1629, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-r9": { arrivesMille: 542, restantesMediane: 20, gardentMille: 1000, coupsParBatailleMille: 4105, mortsParBatailleMille: 1796, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-r12": { arrivesMille: 917, restantesMediane: 20, gardentMille: 1000, coupsParBatailleMille: 4203, mortsParBatailleMille: 1854, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue": { arrivesMille: 292, restantesMediane: 9, gardentMille: 1000, coupsParBatailleMille: 4172, mortsParBatailleMille: 1851, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd-recrue": { arrivesMille: 250, restantesMediane: 4, gardentMille: 333, coupsParBatailleMille: 4077, mortsParBatailleMille: 1859, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd-r6": { arrivesMille: 125, restantesMediane: 9, gardentMille: 1000, coupsParBatailleMille: 3685, mortsParBatailleMille: 1629, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd-r9": { arrivesMille: 542, restantesMediane: 9, gardentMille: 1000, coupsParBatailleMille: 4105, mortsParBatailleMille: 1796, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-r12": { arrivesMille: 917, restantesMediane: 9, gardentMille: 864, coupsParBatailleMille: 4203, mortsParBatailleMille: 1854, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue": { arrivesMille: 292, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4172, mortsParBatailleMille: 1851, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd-recrue": { arrivesMille: 250, restantesMediane: 36, gardentMille: 1000, coupsParBatailleMille: 4077, mortsParBatailleMille: 1859, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd-r6": { arrivesMille: 125, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 3685, mortsParBatailleMille: 1629, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd-r9": { arrivesMille: 542, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4105, mortsParBatailleMille: 1796, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-r12": { arrivesMille: 917, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4203, mortsParBatailleMille: 1854, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue-r6": { arrivesMille: 667, restantesMediane: 24, gardentMille: 1000, coupsParBatailleMille: 4053, mortsParBatailleMille: 1905, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue-r9": { arrivesMille: 1000, restantesMediane: 23, gardentMille: 1000, coupsParBatailleMille: 4073, mortsParBatailleMille: 1901, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue-r6": { arrivesMille: 667, restantesMediane: 10, gardentMille: 875, coupsParBatailleMille: 4053, mortsParBatailleMille: 1905, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue-r9": { arrivesMille: 1000, restantesMediane: 9, gardentMille: 875, coupsParBatailleMille: 4073, mortsParBatailleMille: 1901, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue-r6": { arrivesMille: 667, restantesMediane: 42, gardentMille: 1000, coupsParBatailleMille: 4053, mortsParBatailleMille: 1905, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue-r9": { arrivesMille: 1000, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4073, mortsParBatailleMille: 1901, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue1": { arrivesMille: 417, restantesMediane: 23, gardentMille: 1000, coupsParBatailleMille: 3714, mortsParBatailleMille: 1636, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue1-r6": { arrivesMille: 1000, restantesMediane: 23, gardentMille: 1000, coupsParBatailleMille: 4094, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue1": { arrivesMille: 417, restantesMediane: 9, gardentMille: 800, coupsParBatailleMille: 3714, mortsParBatailleMille: 1636, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-pd-perdue1-r6": { arrivesMille: 1000, restantesMediane: 9, gardentMille: 875, coupsParBatailleMille: 4094, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue1": { arrivesMille: 417, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 3714, mortsParBatailleMille: 1636, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue1-r6": { arrivesMille: 1000, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4094, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-b1": { arrivesMille: 1000, restantesMediane: 17, gardentMille: 1000, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-b2": { arrivesMille: 1000, restantesMediane: 10, gardentMille: 625, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-b1": { arrivesMille: 958, restantesMediane: 2, gardentMille: 87, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-b2": { arrivesMille: 250, restantesMediane: 0, gardentMille: 0, coupsParBatailleMille: 4130, mortsParBatailleMille: 1842, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-b1": { arrivesMille: 1000, restantesMediane: 34, gardentMille: 1000, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-b2": { arrivesMille: 1000, restantesMediane: 27, gardentMille: 1000, coupsParBatailleMille: 4167, mortsParBatailleMille: 1859, verdict: { tropCourt: false, tropLong: true, tient: false } },
};

/**
 * Le protocole complet (1 000 runs × 40 jours) : `npm run banc-veillee`. Les
 * douze socles rejoués le 2026-09-14 en ≈ 14 min ; les vingt et une premières
 * contreparties d'A28 le 2026-09-15, en trois lots de sept (une règle par
 * lot, ≈ 6,5 min chacun), puis les six de « perdue-1 » le même jour en deux
 * lots de trois (≈ 3,5 et 4 min), puis les six du bot qui ramasse, en deux lots
 * de trois (≈ 6 min chacun, sous charge) — ≈ 50 min pour les quarante-cinq
 * d'une traite.
 */
export const ETALONS_VEILLEE_COMPLET: Record<string, EtalonVeillee> = {
  "coup-64-27": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3687, mortsParBatailleMille: 1694, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9": { arrivesMille: 997, restantesMediane: 23, gardentMille: 985, coupsParBatailleMille: 4192, mortsParBatailleMille: 1882, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-27": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3799, mortsParBatailleMille: 1757, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9": { arrivesMille: 1000, restantesMediane: 9, gardentMille: 842, coupsParBatailleMille: 4193, mortsParBatailleMille: 1883, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-27": { arrivesMille: 57, restantesMediane: 1, gardentMille: 35, coupsParBatailleMille: 3944, mortsParBatailleMille: 1778, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9": { arrivesMille: 1000, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4193, mortsParBatailleMille: 1883, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-27-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3649, mortsParBatailleMille: 1647, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd": { arrivesMille: 4, restantesMediane: 17, gardentMille: 1000, coupsParBatailleMille: 3904, mortsParBatailleMille: 1753, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-27-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3649, mortsParBatailleMille: 1647, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd": { arrivesMille: 4, restantesMediane: 7, gardentMille: 750, coupsParBatailleMille: 3904, mortsParBatailleMille: 1753, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-27-pd": { arrivesMille: 0, restantesMediane: null, gardentMille: null, coupsParBatailleMille: 3649, mortsParBatailleMille: 1647, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd": { arrivesMille: 4, restantesMediane: 39, gardentMille: 1000, coupsParBatailleMille: 3904, mortsParBatailleMille: 1753, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-perdue": { arrivesMille: 227, restantesMediane: 19, gardentMille: 956, coupsParBatailleMille: 4417, mortsParBatailleMille: 1982, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-recrue": { arrivesMille: 120, restantesMediane: 16, gardentMille: 933, coupsParBatailleMille: 4108, mortsParBatailleMille: 1914, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-r6": { arrivesMille: 90, restantesMediane: 20, gardentMille: 989, coupsParBatailleMille: 3864, mortsParBatailleMille: 1702, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "coup-64-9-pd-r9": { arrivesMille: 431, restantesMediane: 22, gardentMille: 993, coupsParBatailleMille: 4090, mortsParBatailleMille: 1810, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-r12": { arrivesMille: 818, restantesMediane: 22, gardentMille: 991, coupsParBatailleMille: 4208, mortsParBatailleMille: 1866, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue-r6": { arrivesMille: 631, restantesMediane: 21, gardentMille: 979, coupsParBatailleMille: 4288, mortsParBatailleMille: 1901, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue-r9": { arrivesMille: 904, restantesMediane: 22, gardentMille: 985, coupsParBatailleMille: 4279, mortsParBatailleMille: 1896, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue": { arrivesMille: 230, restantesMediane: 7, gardentMille: 648, coupsParBatailleMille: 4420, mortsParBatailleMille: 1983, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd-recrue": { arrivesMille: 108, restantesMediane: 3, gardentMille: 111, coupsParBatailleMille: 4107, mortsParBatailleMille: 1913, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd-r6": { arrivesMille: 90, restantesMediane: 8, gardentMille: 789, coupsParBatailleMille: 3864, mortsParBatailleMille: 1702, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-32-9-pd-r9": { arrivesMille: 431, restantesMediane: 9, gardentMille: 821, coupsParBatailleMille: 4090, mortsParBatailleMille: 1810, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-r12": { arrivesMille: 818, restantesMediane: 9, gardentMille: 828, coupsParBatailleMille: 4208, mortsParBatailleMille: 1866, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue-r6": { arrivesMille: 634, restantesMediane: 8, gardentMille: 782, coupsParBatailleMille: 4290, mortsParBatailleMille: 1902, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-pd-perdue-r9": { arrivesMille: 907, restantesMediane: 9, gardentMille: 817, coupsParBatailleMille: 4280, mortsParBatailleMille: 1897, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue": { arrivesMille: 230, restantesMediane: 39, gardentMille: 1000, coupsParBatailleMille: 4420, mortsParBatailleMille: 1983, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd-recrue": { arrivesMille: 120, restantesMediane: 34, gardentMille: 1000, coupsParBatailleMille: 4108, mortsParBatailleMille: 1914, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd-r6": { arrivesMille: 90, restantesMediane: 40, gardentMille: 1000, coupsParBatailleMille: 3864, mortsParBatailleMille: 1702, verdict: { tropCourt: true, tropLong: false, tient: false } },
  "mort-64-9-pd-r9": { arrivesMille: 431, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4090, mortsParBatailleMille: 1810, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-r12": { arrivesMille: 818, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4208, mortsParBatailleMille: 1866, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue-r6": { arrivesMille: 634, restantesMediane: 40, gardentMille: 1000, coupsParBatailleMille: 4290, mortsParBatailleMille: 1902, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue-r9": { arrivesMille: 907, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4280, mortsParBatailleMille: 1897, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue1": { arrivesMille: 458, restantesMediane: 22, gardentMille: 969, coupsParBatailleMille: 3883, mortsParBatailleMille: 1703, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-pd-perdue1-r6": { arrivesMille: 992, restantesMediane: 22, gardentMille: 983, coupsParBatailleMille: 4239, mortsParBatailleMille: 1887, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-32-9-pd-perdue1": { arrivesMille: 461, restantesMediane: 8, gardentMille: 779, coupsParBatailleMille: 3884, mortsParBatailleMille: 1703, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-pd-perdue1-r6": { arrivesMille: 995, restantesMediane: 9, gardentMille: 830, coupsParBatailleMille: 4240, mortsParBatailleMille: 1888, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue1": { arrivesMille: 461, restantesMediane: 40, gardentMille: 1000, coupsParBatailleMille: 3884, mortsParBatailleMille: 1703, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-pd-perdue1-r6": { arrivesMille: 995, restantesMediane: 41, gardentMille: 1000, coupsParBatailleMille: 4240, mortsParBatailleMille: 1888, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-b1": { arrivesMille: 983, restantesMediane: 17, gardentMille: 914, coupsParBatailleMille: 4188, mortsParBatailleMille: 1880, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "coup-64-9-b2": { arrivesMille: 930, restantesMediane: 11, gardentMille: 711, coupsParBatailleMille: 4166, mortsParBatailleMille: 1871, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-b1": { arrivesMille: 895, restantesMediane: 3, gardentMille: 123, coupsParBatailleMille: 4192, mortsParBatailleMille: 1883, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-32-9-b2": { arrivesMille: 342, restantesMediane: 0, gardentMille: 26, coupsParBatailleMille: 4160, mortsParBatailleMille: 1877, verdict: { tropCourt: false, tropLong: false, tient: true } },
  "mort-64-9-b1": { arrivesMille: 1000, restantesMediane: 34, gardentMille: 1000, coupsParBatailleMille: 4193, mortsParBatailleMille: 1883, verdict: { tropCourt: false, tropLong: true, tient: false } },
  "mort-64-9-b2": { arrivesMille: 1000, restantesMediane: 28, gardentMille: 1000, coupsParBatailleMille: 4193, mortsParBatailleMille: 1883, verdict: { tropCourt: false, tropLong: true, tient: false } },
};

export type FinRun = "sommet" | "epuise";

export type Run = {
  readonly fin: FinRun;
  /** salle atteinte : la dernière jouée (0-based) */
  readonly salle: number;
  readonly feuilles: number;
  readonly batailles: number;
  readonly coups: number;
  readonly morts: number;
  readonly nuls: number;
  readonly victoires: number;
  readonly defaites: number;
  /** batailles finies par le moteur sur `epuise` (règle « coup » : l'arbre vide en pleine bataille) */
  readonly epuisees: number;
  /** salle de la première bataille perdue, ou null */
  readonly premiereDefaite: number | null;
  /** salle où le roster s'est vidé (permadeath), ou null */
  readonly rosterBalaye: number | null;
  /** unités qui ont quitté le coffre (permadeath) */
  readonly perdues: number;
  /** captures qui l'ont rejoint (« recrue »), une feuille chacune */
  readonly recrues: number;
  /** gestes de butin pris, une feuille chacun */
  readonly butin: number;
  /** gestes de butin voulus et refusés par la garde (l'arbre ne les finançait plus) */
  readonly butinRefuse: number;
};

export type MesuresConfiguration = {
  readonly nom: string;
  readonly regle: Regle;
  readonly arbre: number;
  readonly salles: number;
  readonly permadeath: boolean;
  readonly contrepartie: Contrepartie;
  readonly reserve: number;
  readonly runs: number;
  /** runs arrivés au sommet — en permadeath, avec un roster vivant */
  readonly arrivesMille: number;
  readonly epuisesMille: number;
  readonly salleEpuiseMediane: number | null;
  /** batailles perdues sur batailles jouées */
  readonly defaitesBatailleMille: number;
  /** runs qui ont perdu au moins une bataille */
  readonly runsAvecDefaiteMille: number;
  readonly premiereDefaiteMediane: number | null;
  /** permadeath : runs dont le roster s'est vidé, et à quelle salle en médiane */
  readonly rosterBalayeMille: number;
  readonly salleBalayeMediane: number | null;
  /** permadeath : unités perdues et recrues par run, en millièmes (le puits) */
  readonly perduesParRunMille: number;
  readonly recruesParRunMille: number;
  /** le bot qui ramasse : gestes pris et voulus par run, en millièmes ; runs où l'arbre en a refusé au moins un */
  readonly butinParRunMille: number;
  readonly butinVouluParRunMille: number;
  readonly butinRefuseMille: number;
  /** parmi les arrivés */
  readonly restantesQ1: number | null;
  readonly restantesMediane: number | null;
  readonly restantesQ3: number | null;
  readonly gardentMille: number | null;
  readonly coupsParBatailleMille: number;
  readonly mortsParBatailleMille: number;
  readonly nulsMille: number;
  readonly victoiresMille: number;
  readonly epuiseesBatailleMille: number;
  readonly verdict: { tropCourt: boolean; tropLong: boolean; tient: boolean };
};

export type ResultatVeillee = {
  readonly mode: ModeVeillee;
  readonly parametres: ParametresVeillee;
  readonly seuils: typeof SEUILS;
  readonly toursMax: number;
  readonly configurations: readonly MesuresConfiguration[];
};

function u32De(tag: string): number {
  const h = sha256d(utf8(tag));
  return ((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0;
}

/**
 * `pendule.etageDe`, avec le nombre d'étages par bande en paramètre. À 3 c'est
 * la fonction du dépôt (contrôlé par le test) ; à 1, la bande est l'étape et
 * le décalage balaie la bande entière, ce que la bible §6.1 décrit.
 */
export function etageDeSalles(i: number, p: number, parBande: number): number {
  if (i === 0) return 0;
  const k = Math.floor(i / parBande);
  const j = i % parBande;
  const debut = debutBande(k);
  const fin = k + 1 < BANDES ? debutBande(k + 1) - 1 : ETAGES - 1;
  const taille = fin - debut + 1;
  const decalage = Math.floor((p * (taille - parBande)) / (CRANS - 1));
  return Math.min(fin, debut + decalage + j);
}

export type Membre = { readonly objet: Objet; readonly classe: Classe };

/**
 * Le roster d'un run : `reserve` objets tirés par empreinte du seul rang `k`
 * — les trois premiers sont la même équipe pour toutes les configurations,
 * une réserve plus longue les prolonge sans les changer —, la classe lue du
 * mot (`classeDuMot`, la règle de `partie.ts`) et attachée à l'objet : en
 * permadeath, un survivant garde sa classe quand un coéquipier tombe.
 */
export function rosterDe(k: number, reserve: number = ROSTER): Membre[] {
  return Array.from({ length: reserve }, (_, j) => {
    const objet = objetDepuisGraine(sha256d(utf8(`roster-${k}-${j}`)), ageDeOctet(k + j));
    return { objet, classe: classeDuMot(objet.mot) };
  });
}

/**
 * La recrue d'une salle gagnée (« recrue ») : le premier Indéchiffré de
 * l'étage, lu comme `partie.indechiffresDe` le lit — `captureDe` puis
 * `objetDePorte`, la classe du mot. Le même objet que celui qu'on vient
 * d'abattre : la capture le relève, elle n'en invente pas un autre — ce que
 * le jeu ne permet pas aujourd'hui (voir l'en-tête : (b) est un plafond).
 */
export function recrueDe(etage: number): Membre {
  const objet = objetDePorte(captureDe(occupantsDe(etage)[0]!, etage, 0));
  return { objet, classe: classeDuMot(objet.mot) };
}

/**
 * La garde d'un geste (recrue, butin) : il coûte une feuille, le bot ne la
 * paie que s'il garde ensuite une feuille par salle qui reste à franchir — de
 * la salle `salle` à la dernière (`derniere`), `derniere − salle` franchirs,
 * le dernier étant le sommet, qui peut vider l'arbre. Il ne réserve rien pour
 * les batailles à venir : un joueur prudent en garderait, et sous « une mort »
 * il peut compter les occupants de la salle suivante — le bot, non.
 */
export function peutDepenser(budget: number, salle: number, derniere: number): boolean {
  return budget - 1 >= derniere - salle;
}

/**
 * La première tombée du coffre (« perdue-1 ») : la cible du premier coup du
 * journal qui retire une unité du coffre — le moteur écrit le journal dans
 * l'ordre des coups, riposte comprise, une unité retirée ne l'est qu'une fois.
 * Une bataille perdue en a toujours une : la défaite est le coffre entier
 * retiré. Refuse une bataille où rien du coffre n'est tombé.
 */
export function premiereTombee(etat: Pick<EtatBataille, "journal" | "unites">): number {
  const coffre = new Set(etat.unites.filter((u) => u.camp === "coffre").map((u) => u.id));
  const coup = etat.journal.find((c) => c.retiree && coffre.has(c.cible));
  if (coup === undefined) throw new Error("aucune unité du coffre retirée au journal");
  return coup.cible;
}

function armee(roster: readonly Membre[], etage: number): Unite[] {
  const obstacles = dalleDe(etage);
  const poses = posesDuCoffre(roster.length);
  const prises: Case[] = [];
  return roster.map((m, j) => {
    const pos = caseLibre(obstacles, prises, poses[j]!);
    prises.push(pos);
    return uniteDepuisObjet(m.objet, j, "coffre", pos, m.classe);
  });
}

function mediane(valeurs: readonly number[]): number | null {
  if (valeurs.length === 0) return null;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = t.length >> 1;
  return t.length % 2 === 1 ? t[m]! : Math.trunc((t[m - 1]! + t[m]!) / 2);
}

function quartile(valeurs: readonly number[], q: 1 | 3): number | null {
  if (valeurs.length === 0) return null;
  const t = [...valeurs].sort((a, b) => a - b);
  return t[Math.min(t.length - 1, Math.floor((t.length * q) / 4))]!;
}

function mille(x: number): number {
  return Math.round(x * 1000);
}

/**
 * Un run entier sous une configuration : le jour `d`, le roster `k`, le
 * xorshift du run — tous trois indépendants de la configuration. Les salles
 * `0 … salles − 2` se jouent, chacune suivie d'un franchir ; le dernier
 * franchir est le sommet. Le coffre (`roster`) garde l'ordre du tirage ; en
 * lice, ses `ROSTER` premiers vivants — l'unité d'id `j` est `roster[j]`.
 */
export function jouerRun(cfg: Configuration, d: number, k: number): Run {
  const graine = graineDuJour(hexOf(sha256d(utf8(`banc-veillee/jour-${d}`))));
  const alea = xorshift(u32De(`run-${d}-${k}`));
  const rosterInitial = rosterDe(k, cfg.reserve);
  const mot = rosterInitial[0]!.objet.mot;
  const coffreVide = { objets: [], tour: tourVide() };
  let roster = rosterInitial;
  let budget = cfg.arbre;
  let p = penduleInitial(graine);
  let etage = 0;
  let batailles = 0;
  let coups = 0;
  let morts = 0;
  let nuls = 0;
  let victoires = 0;
  let defaites = 0;
  let epuisees = 0;
  let premiereDefaite: number | null = null;
  let rosterBalaye: number | null = null;
  let perdues = 0;
  let recrues = 0;
  let butin = 0;
  let butinRefuse = 0;
  const epuise = (salle: number): Run => ({
    fin: "epuise",
    salle,
    feuilles: 0,
    batailles,
    coups,
    morts,
    nuls,
    victoires,
    defaites,
    epuisees,
    premiereDefaite,
    rosterBalaye,
    perdues,
    recrues,
    butin,
    butinRefuse,
  });
  const derniere = cfg.salles - 1;
  for (let salle = 0; salle < derniere; salle++) {
    etage = etageDeSalles(salle, p, cfg.parBande);
    if (roster.length > 0) {
      const enLice = roster.slice(0, ROSTER);
      const coffre = armee(enLice, etage);
      const ennemis = indechiffresDe(
        coffreVide,
        etage,
        coffre.map((u) => u.pos),
      );
      const joue = jouerBataille(
        ouvrirBataille(etage, coffre, ennemis, cfg.regle === "coup" ? budget : FEUILLES_SANS_FOND),
      );
      const etat = joue.etat;
      batailles += 1;
      const nCoffre = coffre.length;
      const coupsIci = etat.journal.filter((c) => !c.riposte && c.attaquant < nCoffre).length;
      const mortsIci = etat.unites.filter((u) => u.camp === "indechiffre" && !vivante(u)).length;
      coups += coupsIci;
      morts += mortsIci;
      const perdue = etat.fin !== null && etat.fin.issue === "defaite";
      const gagnee = etat.fin !== null && etat.fin.issue === "victoire";
      if (etat.fin === null) nuls += 1;
      else if (gagnee) victoires += 1;
      else if (perdue) {
        defaites += 1;
        if (premiereDefaite === null) premiereDefaite = salle;
      } else epuisees += 1;
      budget = cfg.regle === "coup" ? etat.feuilles : budget - mortsIci;
      if (cfg.permadeath) {
        // « perdue » et « perdue-1 » : gagnée ou nulle, une tombée est K.O. et revient ; perdue,
        // la lice entière quitte le coffre (« perdue »), ou la première tombée seule (« perdue-1 »)
        const retire = (cfg.contrepartie !== "perdue" && cfg.contrepartie !== "perdue-1") || perdue;
        const tombees = new Set(
          !retire
            ? []
            : cfg.contrepartie === "perdue-1"
              ? [premiereTombee(etat)]
              : etat.unites.filter((u) => u.camp === "coffre" && !vivante(u)).map((u) => u.id),
        );
        roster = roster.filter((_, j) => !tombees.has(j));
        perdues += tombees.size;
        // « recrue » : une capture par salle gagnée, une feuille, si le roster est court
        // et qu'il reste après une feuille par salle encore à franchir
        if (cfg.contrepartie === "recrue" && gagnee && roster.length < ROSTER && peutDepenser(budget, salle, derniere)) {
          roster = [...roster, recrueDe(etage)];
          recrues += 1;
          budget -= 1;
        }
        if (roster.length === 0 && rosterBalaye === null) rosterBalaye = salle;
      }
      // le bot qui ramasse : `butin` gestes par salle gagnée (la salle se lit quand elle est
      // vide, bible §5.2), une feuille chacun, tant que la garde le permet ; refusé sinon
      if (gagnee) {
        for (let g = 0; g < cfg.butin; g++) {
          if (peutDepenser(budget, salle, derniere)) {
            budget -= 1;
            butin += 1;
          } else butinRefuse += 1;
        }
      }
      // l'arbre nu est une fin : sous « coup » le moteur l'a dit (`epuise`),
      // sous « mort » un retrait de plus que de feuilles l'est aussi
      if (budget <= 0) return epuise(salle);
    }
    budget -= 1;
    const choix = CHOIX[Math.floor(alea() * CHOIX.length)]!;
    p = transition(graine, salle, p, etage, choix, mot).p;
    // le dernier franchir est le sommet, même s'il vide l'arbre (veillee.ts : sommet avant épuisé)
    if (salle + 1 === derniere) break;
    if (budget <= 0) return epuise(salle + 1);
  }
  return {
    fin: "sommet",
    salle: derniere,
    feuilles: budget,
    batailles,
    coups,
    morts,
    nuls,
    victoires,
    defaites,
    epuisees,
    premiereDefaite,
    rosterBalaye,
    perdues,
    recrues,
    butin,
    butinRefuse,
  };
}

export function mesurer(cfg: Configuration, runs: readonly Run[]): MesuresConfiguration {
  const n = runs.length;
  // en permadeath, arriver c'est arriver vivant : un roster mort ne lit aucune salle
  const arrives = runs.filter((r) => r.fin === "sommet" && (!cfg.permadeath || r.rosterBalaye === null));
  const epuises = runs.filter((r) => r.fin === "epuise");
  const restantes = arrives.map((r) => r.feuilles);
  const batailles = runs.reduce((s, r) => s + r.batailles, 0);
  const somme = (f: (r: Run) => number) => runs.reduce((s, r) => s + f(r), 0);
  const parBataille = (f: (r: Run) => number) => (batailles > 0 ? mille(somme(f) / batailles) : 0);
  const gardent = arrives.filter((r) => r.feuilles > SEUILS.inutilisees).length;
  const arrivesMille = mille(arrives.length / n);
  const gardentMille = arrives.length > 0 ? mille(gardent / arrives.length) : null;
  const tropCourt = arrivesMille < SEUILS.arriveeMin;
  // « trop long » ne se lit que sur un arbre qui arrive : quatre runs sur mille qui gardent tout ne disent rien
  const tropLong = !tropCourt && gardentMille !== null && gardentMille > SEUILS.gardentMax;
  const avecDefaite = runs.filter((r) => r.premiereDefaite !== null);
  const balayes = runs.filter((r) => r.rosterBalaye !== null);
  return {
    nom: cfg.nom,
    regle: cfg.regle,
    arbre: cfg.arbre,
    salles: cfg.salles,
    permadeath: cfg.permadeath,
    contrepartie: cfg.contrepartie,
    reserve: cfg.reserve,
    runs: n,
    arrivesMille,
    epuisesMille: mille(epuises.length / n),
    salleEpuiseMediane: mediane(epuises.map((r) => r.salle)),
    defaitesBatailleMille: parBataille((r) => r.defaites),
    runsAvecDefaiteMille: mille(avecDefaite.length / n),
    premiereDefaiteMediane: mediane(avecDefaite.map((r) => r.premiereDefaite!)),
    rosterBalayeMille: mille(balayes.length / n),
    salleBalayeMediane: mediane(balayes.map((r) => r.rosterBalaye!)),
    perduesParRunMille: mille(somme((r) => r.perdues) / n),
    recruesParRunMille: mille(somme((r) => r.recrues) / n),
    butinParRunMille: mille(somme((r) => r.butin) / n),
    butinVouluParRunMille: mille(somme((r) => r.butin + r.butinRefuse) / n),
    butinRefuseMille: mille(runs.filter((r) => r.butinRefuse > 0).length / n),
    restantesQ1: quartile(restantes, 1),
    restantesMediane: mediane(restantes),
    restantesQ3: quartile(restantes, 3),
    gardentMille,
    coupsParBatailleMille: parBataille((r) => r.coups),
    mortsParBatailleMille: parBataille((r) => r.morts),
    nulsMille: parBataille((r) => r.nuls),
    victoiresMille: parBataille((r) => r.victoires),
    epuiseesBatailleMille: parBataille((r) => r.epuisees),
    verdict: { tropCourt, tropLong, tient: !tropCourt && !tropLong },
  };
}

/** Le banc entier, ou les seules configurations nommées (`noms`) : le protocole complet se découpe en lots. */
export function bancVeillee(mode: ModeVeillee = "rapide", noms: readonly string[] = []): ResultatVeillee {
  const p = PARAMETRES_VEILLEE[mode];
  const choisies = noms.length === 0 ? CONFIGURATIONS : CONFIGURATIONS.filter((c) => noms.includes(c.nom));
  if (choisies.length !== (noms.length === 0 ? CONFIGURATIONS.length : noms.length))
    throw new Error(`configuration inconnue parmi ${noms.join(", ")}`);
  const configurations = choisies.map((cfg) => {
    const runs: Run[] = [];
    for (let k = 0; k < p.runs; k++) runs.push(jouerRun(cfg, k % p.jours, k));
    return mesurer(cfg, runs);
  });
  return { mode, parametres: p, seuils: SEUILS, toursMax: TOURS_MAX, configurations };
}

/** Le tableau lisible d'un résultat, une ligne par configuration. */
export function formaterResultat(r: ResultatVeillee): string {
  const lignes = [
    `banc de la veillée — ${r.mode} : ${r.parametres.runs} runs sur ${r.parametres.jours} jours par configuration ; seuils : arrivés ≥ ${r.seuils.arriveeMin} ‰, gardent > ${r.seuils.inutilisees} feuilles ≤ ${r.seuils.gardentMax} ‰`,
    "configuration | arrivés ‰ (pd : roster vivant) | épuisés ‰ (salle méd.) | restantes Q1/méd/Q3 | gardent > 6 ‰ | coups/bat. | morts/bat. | bat. gagnées/perdues/nulles/épuisées ‰ | runs avec défaite ‰ (1re, méd.) | roster balayé ‰ (salle méd.) | perdues/run | recrues/run | butin pris/voulu par run | runs où l'arbre a refusé un geste ‰ | verdict",
  ];
  for (const c of r.configurations) {
    const v = c.verdict.tient ? "tient" : [c.verdict.tropCourt ? "trop court" : "", c.verdict.tropLong ? "trop long" : ""].filter(Boolean).join(", ");
    lignes.push(
      `${c.nom} | ${c.arrivesMille} | ${c.epuisesMille} (${c.salleEpuiseMediane ?? "—"}) | ${c.restantesQ1 ?? "—"}/${c.restantesMediane ?? "—"}/${c.restantesQ3 ?? "—"} | ${c.gardentMille ?? "—"} | ${(c.coupsParBatailleMille / 1000).toFixed(2)} | ${(c.mortsParBatailleMille / 1000).toFixed(2)} | ${c.victoiresMille}/${c.defaitesBatailleMille}/${c.nulsMille}/${c.epuiseesBatailleMille} | ${c.runsAvecDefaiteMille} (${c.premiereDefaiteMediane ?? "—"}) | ${c.rosterBalayeMille} (${c.salleBalayeMediane ?? "—"}) | ${(c.perduesParRunMille / 1000).toFixed(2)} | ${(c.recruesParRunMille / 1000).toFixed(2)} | ${(c.butinParRunMille / 1000).toFixed(2)}/${(c.butinVouluParRunMille / 1000).toFixed(2)} | ${c.butinRefuseMille} | ${v}`,
    );
  }
  return lignes.join("\n");
}

function argumentMode(args: readonly string[]): { mode: ModeVeillee; noms: string[] } {
  const [premier, ...reste] = args;
  if (premier === undefined || premier === "--rapide") return { mode: "rapide", noms: reste };
  if (premier === "--complet") return { mode: "complet", noms: reste };
  throw new Error("usage : banc-veillee.ts [--rapide|--complet] [configuration ...]");
}

if (process.argv[1]?.endsWith("banc-veillee.ts")) {
  const { mode, noms } = argumentMode(process.argv.slice(2));
  const debut = Date.now();
  const resultat = bancVeillee(mode, noms);
  console.log(formaterResultat(resultat));
  console.log(JSON.stringify({ ...resultat, secondes: Math.round((Date.now() - debut) / 1000) }, null, 2));
}

// `etageDe` et `ETAGES_PAR_BANDE` sont importés pour que le test affirme l'identité à 3.
export { etageDe as etageDuDepot, ETAGES_PAR_BANDE as PAR_BANDE_DU_DEPOT };
