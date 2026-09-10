/**
 * Contrat de la bataille tactique — types partagés, aucune logique.
 *
 * Une bataille se joue sur la dalle 9×9 de l'étage (`tour.ts`, `dalleDe`), en
 * phases (le coffre, puis les Indéchiffrés). Une unité est un **mot** : son
 * identité ne bouge jamais. Ce qui bouge est sa `case` et sa `tenue` — une
 * lecture de `ecu` (`combat.ts`) dépensée en encaissant, **jetée à la fin
 * de la bataille**. Aucune loi de `integrite.ts` n'est touchée : la norme du
 * mot est conservée, l'objet ne mute pas, un palier ne multiplie rien.
 *
 * Un tour d'unité vaut **deux points d'action** (`PA_PAR_TOUR`). Se déplacer
 * en coûte un, frapper en coûte un *et une feuille*, passer les rend tous.
 * Les deux gestes se combinent librement : avancer puis frapper, frapper puis
 * se retirer, avancer deux fois, frapper deux fois. Le prix est **plat pour
 * toutes les unités** — `eperon` a déjà quatre prix (le pas, le rang de
 * phase, la riposte, la charge), il n'en reçoit pas un cinquième.
 *
 * Se déplacer, mesurer une portée, lire une intention : gratuit. **Frapper
 * signe** : un coup consomme une feuille de l'arbre XMSS de la veillée
 * (`veillee.ts`), dans l'ordre, sans retour. C'est la seule dépense — la
 * **riposte** n'en est pas une : personne ne la choisit, elle ne se signe pas,
 * et elle ne coûte **aucun PA** au riposteur.
 *
 * Tout est entier. Aucun flottant, aucun `Math.random`, aucune date : deux
 * rejeux d'une même suite d'actes rendent le même état, à l'octet. C'est la
 * condition pour qu'un juge en CI puisse refaire la bataille (`depot.ts`).
 *
 * Immuable : chaque fonction du moteur rend un **nouvel** état, jamais une
 * mutation en place — le rejeu et la télégraphie en dépendent.
 *
 * AVERTISSEMENT : une bataille est une jauge. Elle ne touche ni le carnet, ni
 * la chaîne, ni le format des transactions. Seules la preuve exportée et les
 * sceaux engagent. L'intention ennemie, la tenue et le classement sont des
 * figures ; la feuille signée est la seule preuve.
 */

import type { AxeCombat, Combat } from "../combat.ts";
import type { Classe } from "../cosmos.ts";
import type { SignatureId } from "../signatures.ts";
import type { NomAge } from "../types.ts";

/** Côté de la dalle. La grille de bataille est celle de l'étage. */
export const GRILLE_N = 9;

/**
 * Socle du coup, exact miroir de `TENUE_BASE` (`unite.ts`). Sans lui, `lame`
 * a un levier illimité — 0 à 64, rapport infini — quand celui de `ecu` vaut 9
 * (tenue 8 à 72) : mesuré, r(lame, victoire) = +0,67 contre +0,14 à `ecu`.
 * Avec le même socle des deux côtés, un point de `lame` et un point de `ecu`
 * se paient au même prix, et c'est le seul réglage qui l'obtienne.
 */
export const COUP_BASE = 16;

/**
 * Plancher d'un coup : un garde-fou, plus un réglage. Le coup vaut au moins
 * `COUP_BASE − COUP_BASE/DIV_ACCORD`, donc 6 : le plancher ne mord jamais sur
 * les tirages réels, il interdit seulement qu'un cumul de malus rende un coup
 * nul. Il valait 7 quand `ecu` réduisait chaque coup encaissé ; cette
 * absorption a disparu (elle payait `ecu` deux fois), le pansement avec elle.
 */
export const COUP_MIN = 1;

/** Diviseurs entiers de la résolution. Jamais de flottant, jamais d'arrondi. */
export const DIV_ACCORD = 4;
export const DIV_DOS = 2;
export const DIV_REPRISE = 8;
/** Frapper de plus loin que la cible ne riposte. Le prix de `arc`. */
export const DIV_ALLONGE = 2;

/**
 * La charge : ce que chaque case parcourue avant de frapper ajoute au coup.
 *
 * C'est le second prix de `eperon`, et il est **additif** exprès. La riposte
 * le paie en moyenne mais pas à l'extrême : une unité qui n'a que de
 * l'initiative rend un coup de `COUP_BASE`, et ne tue rien. Un bonus en
 * fraction de la base aurait profité d'abord aux grosses `lame` ; un bonus
 * absolu profite proportionnellement plus à qui frappe faible — mesuré, la
 * pointe `eperon` au tier le plus haut passe de 5,85 % à 12,33 % de victoires
 * (×2,1), sans qu'aucun des quatre axes ne sorte de |r| < 0,13.
 *
 * LIMITE : 12,33 % reste loin des 41 % de la pointe `arc` au même tier. La
 * charge ne referme pas le trou, elle le réduit de moitié ; ce qui manque à
 * une unité qui n'a que de l'initiative est de pouvoir frapper **puis** se
 * retirer hors d'atteinte, donc un pas qui se dépense en deux temps autour de
 * la frappe. C'est une règle de plus, pas une constante : elle n'est pas ici.
 *
 * L'élan se lit sur le déplacement du tour, il vaut donc au plus `pas(u)`,
 * et il s'éteint à la fin de la phase : on ne riposte jamais en charge.
 */
export const CHARGE_PAR_CASE = 4;

/**
 * Points d'action d'une unité par tour. Deux, et plats : la même dotation
 * pour un colosse et pour un coureur.
 *
 * Deux drapeaux (`aDeplace`, `aFrappe`) tenaient ce compte avant : ils
 * autorisaient un déplacement **et** une frappe, jamais deux du même geste.
 * Un compteur les remplace, et ce qu'il ouvre est ce qu'on cherchait — le
 * **double pas** (approcher ou décrocher de `2·pas` en un tour, sans frapper)
 * et la **double frappe** (deux coups, donc deux feuilles). La feuille est le
 * frein : un tour à deux coups vaut deux tours d'arbre.
 *
 * Pourquoi pas trois, ni un par axe : trois PA rendraient le double pas *et*
 * la frappe possibles dans le même tour, ce qui annule la zone de contrôle ;
 * un PA acheté par un axe ferait de `eperon` un cinquième prix et rouvrirait
 * le §9 ter de `SPEC_TACTIQUE.md`.
 */
export const PA_PAR_TOUR = 2;

/** Ce que coûte un pas. Un geste, un point : aucune remise, aucun supplément. */
export const PA_DEPLACER = 1;

/** Ce que coûte un coup porté — en plus de la feuille signée. */
export const PA_FRAPPER = 1;

/** Deux camps. Les Indéchiffrés sont les mots qu'aucune forme ne range. */
export const CAMPS = ["coffre", "indechiffre"] as const;
export type Camp = (typeof CAMPS)[number];

/** Case de la dalle, `0 <= x,y < GRILLE_N`. `y` est la ligne, comme `dalleDe`. */
export type Case = { readonly x: number; readonly y: number };

/**
 * Une unité en bataille.
 *
 * `mot`, `archetype`, `age`, `classe`, `axes` sont l'identité : figés pour
 * toute la bataille et au-delà. `pos`, `tenue`, `pa` sont l'état éphémère :
 * jeté à la fin.
 */
export type Unite = {
  readonly id: number;
  readonly camp: Camp;
  readonly mot: number;
  readonly archetype: SignatureId;
  readonly age: NomAge;
  readonly classe: Classe;
  /** `combatDe(objet)` — somme toujours 64. Lecture figée, jamais recalculée. */
  readonly axes: Combat;
  readonly pos: Case;
  /** Case quittée au dernier déplacement. `null` si l'unité n'a pas encore bougé. */
  readonly precedente: Case | null;
  /**
   * Cases parcourues au déplacement de ce tour, `0` sinon. Entre dans la
   * résolution (la charge), donc dans `traceBataille` : c'est un état, pas
   * une lecture. S'éteint à la fin de la phase de son camp.
   */
  readonly elan: number;
  /** Éphémère. Part de `axes.ecu`, tombe à 0 : l'unité est retirée. */
  readonly tenue: number;
  /**
   * Points d'action restants dans le tour, `0..PA_PAR_TOUR`. Entre dans la
   * trace : deux échiquiers qui ne diffèrent que par les PA sont deux états
   * distincts, parce qu'ils n'offrent pas les mêmes suites.
   */
  readonly pa: number;
};

/**
 * Un acte du joueur ou de l'IA. `deplacer` et `frapper` coûtent chacun un PA ;
 * seul `frapper` consomme en plus une feuille. `passer` rend le tour de
 * l'unité : ses PA tombent à zéro, elle ne reprend pas.
 */
export type Acte =
  | { readonly geste: "deplacer"; readonly unite: number; readonly vers: Case }
  | { readonly geste: "frapper"; readonly unite: number; readonly cible: number }
  | { readonly geste: "passer"; readonly unite: number };

/** Le détail d'un coup, tel que la télégraphie l'annonce et que le juge le rejoue. */
export type Coup = {
  readonly attaquant: number;
  readonly cible: number;
  /** `COUP_BASE + lame` de l'attaquant. */
  readonly base: number;
  readonly accord: number;
  readonly dos: number;
  /** Hors de la portée de la cible : elle encaisse sans pouvoir riposter. */
  readonly allonge: number;
  /** `CHARGE_PAR_CASE` par case parcourue avant de frapper. Le second prix de `eperon`. */
  readonly charge: number;
  readonly porte: number;
  readonly tenueApres: number;
  readonly retiree: boolean;
  /**
   * Coup rendu par la frappée, hors de son tour et sans feuille. Une riposte
   * n'appelle jamais de riposte : le drapeau la reconnaît au journal.
   */
  readonly riposte: boolean;
};

/**
 * Ce qu'un Indéchiffré fera au prochain tour, annoncé avant que le joueur
 * n'agisse. Une **figure** : le joueur peut la rendre fausse en déplaçant la
 * cible. Elle n'engage rien et ne coûte aucune feuille à lire.
 */
export type Intention = {
  readonly unite: number;
  /**
   * Le tour annoncé : au plus `PA_PAR_TOUR` actes, dans l'ordre. Vide quand
   * l'unité ne bougera pas — ce qui n'est pas `passer`, lequel vide ses points
   * d'action et lui interdit la reprise.
   */
  readonly actes: readonly Acte[];
  /** Cases couvertes une fois le tour annoncé joué, pour l'affichage. */
  readonly menace: readonly Case[];
};

export type Issue = "victoire" | "defaite" | "epuise";

export type Fin = {
  readonly issue: Issue;
  readonly tour: number;
};

/** L'état complet d'une bataille. Rien d'autre n'est nécessaire pour la rejouer. */
export type EtatBataille = {
  readonly etage: number;
  /** `dalleDe(etage)` — `true` = case pleine, infranchissable. `[y][x]`. */
  readonly obstacles: readonly (readonly boolean[])[];
  readonly unites: readonly Unite[];
  readonly tour: number;
  readonly phase: Camp;
  /** Feuilles XMSS restantes. Un coup en coûte une. À zéro, on ne frappe plus. */
  readonly feuilles: number;
  readonly intentions: readonly Intention[];
  readonly journal: readonly Coup[];
  readonly fin: Fin | null;
};

/**
 * Refus du moteur. Le message dit *quoi* et *au lieu de quoi*
 * (« portée 2 au lieu de 4 »), comme `U.Rejet` côté Python.
 */
export class RejetTactique extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RejetTactique";
  }
}

export type { AxeCombat, Combat, Classe, NomAge, SignatureId };
