/**
 * La politique — ce que fait une unité qui ne joue pas à la main.
 *
 * Un seul objet, employé à trois endroits : elle **annonce** l'intention des
 * Indéchiffrés avant le tour du joueur (la télégraphie), elle **joue** leur
 * phase, et elle sert de main aux deux camps sur un banc de mesure. Trois
 * usages, une seule règle : si la politique change, les trois changent
 * ensemble, et aucune mesure ne porte sur un moteur que personne ne joue.
 *
 * **Le moteur ne connaît aucune politique.** `bataille.ts` n'importe rien
 * d'ici ; c'est `ia.ts` qui importe le moteur. `ouvrirBataille` et
 * `finDePhase` rendent un état sans intentions, et `annoncer` les y pose.
 * Une bataille jouée sans jamais appeler `annoncer` est une bataille sans
 * télégraphie, pas une bataille fausse — la doctrine du dépôt veut que le
 * moteur rejoue et ne croie rien, pas qu'il décide à la place de quiconque.
 *
 * **La politique est exhaustive sur le tour, pas au-delà.** Elle énumère
 * toutes les suites d'au plus `PA_PAR_TOUR` actes que l'unité peut jouer —
 * la suite vide, chaque acte seul, chaque paire — les rejoue sur une copie
 * de l'état, et garde la meilleure. Aucun élagage, aucun ordre de recherche :
 * l'énumération suit l'ordre canonique d'`actesPossibles`, donc deux appels
 * sur le même état rendent le même plan, à l'octet. Elle ne regarde pas le
 * tour d'après, ni ce que fera son camp : un plan est bon pour une unité.
 *
 * **Le score est lexicographique, et c'est un choix de fond.** Aucun poids,
 * aucune table de concepteur, aucune conversion inventée entre une feuille et
 * un point de tenue. Cinq rangs, comparés dans l'ordre, le premier qui
 * départage tranche :
 *
 *   1. `abattus`     — unités adverses retirées, décroissant. Abattre passe
 *                      avant tout : cela retire un tour adverse pour toujours.
 *   2. `echange`     — tenue ôtée à l'adversaire moins tenue perdue (la
 *                      riposte), décroissant. Les deux se comptent dans la
 *                      même unité, donc la soustraction a un sens.
 *   3. `feuilles`    — feuilles consommées, croissant. À dégât égal, un coup
 *                      vaut mieux que deux.
 *   4. `approche`    — distance à la proie vivante la plus proche à l'arrivée,
 *                      croissant. C'est ce rang qui fait qu'une bataille a lieu.
 *   5. `exposition`  — adversaires vivants dont la portée couvre l'arrivée,
 *                      croissant. À approche égale, on se découvre le moins.
 *
 * Un ordre lexicographique **n'échange jamais un rang contre un autre** : la
 * politique ne sacrifiera pas un point de tenue pour économiser une feuille,
 * ni une case d'approche pour se couvrir. C'est assumé, et c'est ce qui la
 * rend lisible ; un score pondéré demanderait cinq nombres que personne n'a
 * mesurés.
 *
 * LIMITE : **elle hésite à engager quand l'échange est mauvais.** Le rang 2
 * compare le coup porté à la riposte encaissée ; quand la riposte fait plus
 * mal que le coup, la suite vide (échange 0) bat la frappe (échange négatif),
 * et l'unité se tient au contact sans frapper. La bataille finit alors en
 * `epuise` — une fin définie, pas un blocage. C'est un comportement émergent,
 * pas un réglage : il n'a **pas** été mesuré, et c'est au banc de dire s'il
 * est fréquent.
 *
 * LIMITE : **elle ne joue qu'un tour d'avance et qu'une unité à la fois.**
 * Pas de formation, pas de garde d'un couloir, pas de sacrifice. `eperon`
 * décide seul de l'ordre (`ordreDePhase`), donc la première unité choisit
 * sans savoir ce que la deuxième fera.
 *
 * LIMITE : **le coût.** Une unité coûte environ `1 + 2·|A|` parcours de la
 * dalle, où `|A|` est le nombre d'actes possibles (une douzaine en pratique) :
 * quelques centaines de BFS sur 81 cases par unité et par tour. Négligeable à
 * l'écran, à surveiller sur un banc qui rejoue des centaines de milliers de
 * batailles.
 *
 * LIMITE : **l'annonce est une figure.** Elle se lit sur l'échiquier tel qu'il
 * est, en dotant les Indéchiffrés des points d'action qu'ils auront à leur
 * tour, et le camp du coffre laissé exactement où il se trouve. Elle ne
 * prédit ni ce que le joueur va faire, ni la reprise que `finDePhase`
 * accordera à qui n'aura rien fait. Le joueur la rend fausse en jouant, et le
 * moteur ne la lui oppose jamais.
 */

import {
  casesAPortee,
  distance,
} from "./grille.ts";
import { nouveauTour, portee, vivante } from "./unite.ts";
import { actesPossibles, finDePhase, jouer, ordreDePhase } from "./bataille.ts";
import {
  PA_PAR_TOUR,
  RejetTactique,
  type Acte,
  type Camp,
  type Case,
  type EtatBataille,
  type Intention,
  type Unite,
} from "./types.ts";

/**
 * Un tour d'unité tel que la politique le voit : la suite d'actes retenue et
 * les cases que l'unité couvrira une fois la suite jouée. `actes` est vide
 * quand ne rien faire est le meilleur tour — ce n'est pas `passer`, qui vide
 * les points d'action et interdit la reprise.
 */
export type Plan = {
  readonly unite: number;
  readonly actes: readonly Acte[];
  readonly menace: readonly Case[];
};

/** Les cinq rangs, dans l'ordre où ils tranchent. */
type Bilan = {
  readonly abattus: number;
  readonly echange: number;
  readonly feuilles: number;
  readonly approche: number;
  readonly exposition: number;
};

/** Nombre de tours au-delà duquel `jouerBataille` rend la main sans conclure. */
export const TOURS_MAX = 64;

function uniteDe(etat: EtatBataille, id: number): Unite {
  const u = etat.unites.find((x) => x.id === id);
  if (u === undefined)
    throw new RejetTactique(`unité ${id} au lieu de l'une des ${etat.unites.length} en lice`);
  return u;
}

/**
 * L'échiquier tel qu'il sera au début de la phase de `camp` : la main lui
 * revient et ses unités retrouvent leurs points d'action. Rien d'autre ne
 * bouge — voir la LIMITE sur l'annonce. Rendu tel quel si `camp` a déjà la main.
 */
function commeAuDepart(etat: EtatBataille, camp: Camp): EtatBataille {
  if (etat.phase === camp) return etat;
  return {
    ...etat,
    phase: camp,
    unites: etat.unites.map((u) => (u.camp === camp ? nouveauTour(u) : u)),
  };
}

/** Somme des tenues perdues par un camp entre deux états. Jamais négative. */
function tenuePerdue(avant: EtatBataille, apres: EtatBataille, camp: Camp): number {
  let total = 0;
  for (const a of avant.unites) {
    if (a.camp !== camp) continue;
    const b = apres.unites.find((x) => x.id === a.id);
    if (b === undefined) continue;
    total += Math.max(0, a.tenue - b.tenue);
  }
  return total;
}

/** Unités vivantes d'un camp qui ne le sont plus. */
function abattusDe(avant: EtatBataille, apres: EtatBataille, camp: Camp): number {
  let n = 0;
  for (const a of avant.unites) {
    if (a.camp !== camp || !vivante(a)) continue;
    const b = apres.unites.find((x) => x.id === a.id);
    if (b !== undefined && !vivante(b)) n += 1;
  }
  return n;
}

/** Distance à la proie vivante la plus proche, ou 0 s'il n'en reste aucune. */
function approcheDe(etat: EtatBataille, u: Unite): number {
  let meilleure = -1;
  for (const p of etat.unites) {
    if (p.camp === u.camp || !vivante(p)) continue;
    const d = distance(u.pos, p.pos);
    if (meilleure < 0 || d < meilleure) meilleure = d;
  }
  return meilleure < 0 ? 0 : meilleure;
}

/** Adversaires vivants dont la portée couvre la case de `u`. */
function expositionDe(etat: EtatBataille, u: Unite): number {
  let n = 0;
  for (const e of etat.unites) {
    if (e.camp === u.camp || !vivante(e)) continue;
    const d = distance(e.pos, u.pos);
    if (d >= 1 && d <= portee(e)) n += 1;
  }
  return n;
}

function bilanDe(avant: EtatBataille, apres: EtatBataille, unite: number, camp: Camp): Bilan {
  const adverse: Camp = camp === "coffre" ? "indechiffre" : "coffre";
  const u = apres.unites.find((x) => x.id === unite);
  return {
    abattus: abattusDe(avant, apres, adverse),
    echange: tenuePerdue(avant, apres, adverse) - tenuePerdue(avant, apres, camp),
    feuilles: avant.feuilles - apres.feuilles,
    approche: u === undefined ? 0 : approcheDe(apres, u),
    exposition: u === undefined ? 0 : expositionDe(apres, u),
  };
}

/**
 * Vrai si `a` l'emporte **strictement** sur `b`. Le premier rang qui départage
 * tranche ; à égalité parfaite, faux — et c'est ce qui fait que le premier
 * trouvé dans l'ordre canonique d'`actesPossibles` garde la place.
 */
function meilleurQue(a: Bilan, b: Bilan): boolean {
  if (a.abattus !== b.abattus) return a.abattus > b.abattus;
  if (a.echange !== b.echange) return a.echange > b.echange;
  if (a.feuilles !== b.feuilles) return a.feuilles < b.feuilles;
  if (a.approche !== b.approche) return a.approche < b.approche;
  if (a.exposition !== b.exposition) return a.exposition < b.exposition;
  return false;
}

/**
 * Le tour d'une unité, choisi. Une **lecture** : rien n'est joué sur l'état
 * passé, qui ressort intact.
 *
 * Rend un plan vide pour une unité retirée ou d'un autre camp que celui qu'on
 * fait jouer. Refuse un identifiant qui n'est pas en lice — c'est une erreur
 * d'appel, pas une situation de jeu.
 */
export function planDe(etat: EtatBataille, unite: number): Plan {
  const u0 = uniteDe(etat, unite);
  const vide: Plan = { unite, actes: [], menace: [] };
  if (etat.fin !== null || !vivante(u0)) return vide;
  const depart = commeAuDepart(etat, u0.camp);
  const camp = u0.camp;

  let retenus: readonly Acte[] = [];
  let meilleur = bilanDe(depart, depart, unite, camp);

  for (const a1 of actesPossibles(depart, unite)) {
    const e1 = jouer(depart, a1);
    const b1 = bilanDe(depart, e1, unite, camp);
    if (meilleurQue(b1, meilleur)) {
      meilleur = b1;
      retenus = [a1];
    }
    // `passer` vide les points d'action : il ne reste rien à enchaîner.
    if (a1.geste === "passer" || e1.fin !== null) continue;
    for (const a2 of actesPossibles(e1, unite)) {
      if (a2.geste === "passer") continue;
      const e2 = jouer(e1, a2);
      const b2 = bilanDe(depart, e2, unite, camp);
      if (meilleurQue(b2, meilleur)) {
        meilleur = b2;
        retenus = [a1, a2];
      }
    }
  }

  if (retenus.length > PA_PAR_TOUR)
    throw new RejetTactique(
      `plan de ${retenus.length} actes au lieu de ${PA_PAR_TOUR} au plus`,
    );

  // La menace se lit à l'arrivée : les cases que l'unité couvrira une fois son
  // plan joué. Une portée, pas un tir — ni murs ni ligne de vue (`grille.ts`).
  let fin = depart;
  for (const a of retenus) fin = jouer(fin, a);
  const arrivee = fin.unites.find((x) => x.id === unite);
  const menace =
    arrivee === undefined || !vivante(arrivee)
      ? []
      : casesAPortee(arrivee.pos, portee(arrivee));
  return { unite, actes: retenus, menace };
}

/**
 * Les plans d'un camp entier, dans l'ordre où ses unités joueront
 * (`ordreDePhase` : `eperon` décroissant, à égalité id croissant).
 *
 * Chaque plan est lu **sur le même échiquier**, celui d'aujourd'hui : la
 * deuxième unité ne sait pas ce que la première aura fait. C'est ce que le
 * joueur voit, et c'est plus honnête que d'annoncer une chaîne que le premier
 * coup rendrait fausse.
 */
export function intentionsDe(etat: EtatBataille, camp: Camp): Intention[] {
  if (etat.fin !== null) return [];
  const out: Intention[] = [];
  for (const id of ordreDePhase(etat, camp)) {
    const plan = planDe(etat, id);
    out.push({ unite: plan.unite, actes: plan.actes, menace: plan.menace });
  }
  return out;
}

/**
 * Pose la télégraphie sur l'état : ce que feront les Indéchiffrés, annoncé
 * avant que le joueur n'agisse.
 *
 * Elle ne s'écrit que quand la main est au coffre — c'est à lui qu'elle
 * s'adresse. Pendant la phase adverse, l'état ressort tel quel et l'annonce du
 * tour reste affichée. Une bataille finie n'annonce plus rien.
 */
export function annoncer(etat: EtatBataille): EtatBataille {
  if (etat.fin !== null) return etat.intentions.length === 0 ? etat : { ...etat, intentions: [] };
  if (etat.phase !== "coffre") return etat;
  return { ...etat, intentions: intentionsDe(etat, "indechiffre") };
}

/**
 * Joue la phase du camp qui a la main, unité par unité, dans l'ordre de
 * `ordreDePhase`. Ne passe **pas** la main : `finDePhase` reste l'affaire de
 * l'appelant, qui sait s'il veut annoncer ensuite.
 *
 * Le plan de chaque unité est relu sur l'état **courant**, celui que les
 * unités précédentes ont laissé — contrairement à `intentionsDe`, qui annonce
 * tout sur l'échiquier de départ. Jouer, c'est savoir ; annoncer, c'est lire.
 */
export function jouerPhase(etat: EtatBataille): EtatBataille {
  let e = etat;
  for (const id of ordreDePhase(etat)) {
    if (e.fin !== null) break;
    const u = e.unites.find((x) => x.id === id);
    if (u === undefined || !vivante(u) || u.camp !== e.phase) continue;
    for (const acte of planDe(e, id).actes) {
      e = jouer(e, acte);
      if (e.fin !== null) break;
    }
  }
  return e;
}

/**
 * Une bataille entière, les deux camps tenus par la politique. Rend l'état
 * final et le nombre de passages de main consommés.
 *
 * `tours` borne le compte de phases jouées : sans lui, deux camps qui se
 * regardent sans frapper (voir la LIMITE sur l'engagement) ne s'arrêteraient
 * jamais, puisque seul un coup du coffre consomme une feuille. Atteindre la
 * borne rend un état dont `fin` vaut `null` : ce n'est pas une issue, c'est un
 * abandon de mesure, et un banc doit le compter à part.
 */
export function jouerBataille(
  etat: EtatBataille,
  tours: number = TOURS_MAX,
): { readonly etat: EtatBataille; readonly phases: number } {
  if (!Number.isInteger(tours) || tours < 0)
    throw new RejetTactique(`borne de tours ${tours} au lieu d'un entier de 0 ou plus`);
  let e = etat;
  let phases = 0;
  while (e.fin === null && phases < tours) {
    e = jouerPhase(e);
    if (e.fin !== null) break;
    e = finDePhase(e);
    phases += 1;
  }
  return { etat: e, phases };
}
