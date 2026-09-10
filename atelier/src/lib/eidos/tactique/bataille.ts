/**
 * Bataille tactique — phases, résolution, télégraphie. Le moteur, rien d'autre.
 *
 * Une bataille s'ouvre sur la dalle d'un étage (`dalleDe`), le coffre d'abord,
 * les Indéchiffrés ensuite. Chaque fonction rend un **nouvel** `EtatBataille` :
 * rien n'est muté, l'état d'entrée reste intact, une suite d'actes se rejoue à
 * l'identique. Aucun flottant, aucun tirage, aucune horloge.
 *
 * La résolution d'un coup, sans un seul dé :
 *
 *     base    = COUP_BASE + attaquant.axes.lame
 *     accord  = constructif +base/DIV_ACCORD | neutre 0 | destructif −base/DIV_ACCORD
 *     dos     = pris de dos ? +base/DIV_DOS : 0
 *     allonge = hors de la portée de la cible ? +base/DIV_ALLONGE : 0
 *     charge  = CHARGE_PAR_CASE × cases parcourues ce tour
 *     porte   = max(COUP_MIN, base + accord + dos + allonge + charge)
 *
 * Toutes les divisions sont entières (`Math.trunc`). La polarité n'est pas une
 * table de designer : c'est le produit scalaire de deux quaternions, lu par
 * `resonance.ts` (même classe : destructif — deux armes s'interfèrent). Le dos
 * est purement positionnel (`estDeDos`), aucune orbite n'y entre.
 *
 * **Chaque axe est payé une fois, et une seule.** `ecu` achète la tenue
 * (`unite.ts`) et rien d'autre : il ne réduit plus le coup encaissé, sans
 * quoi il se paierait deux fois et vaudrait le double des trois autres —
 * mesuré, r(ecu, victoire) tombe de +0,59 à +0,14 en le lui retirant.
 * `lame` achète le coup, au-dessus du même socle que la tenue (`COUP_BASE`).
 * `eperon` achète le pas, le rang de phase, la **riposte** et la **charge**.
 * `arc` achète la portée, la reprise, l'**allonge** — et, par la portée,
 * l'immunité à la riposte : frapper de plus loin que la cible ne porte, c'est
 * un bonus *et* aucun coup rendu. Les deux axes faibles s'entretiennent.
 * La charge est additive là où tout le reste est en fraction de la base :
 * c'est voulu, elle doit valoir davantage à qui frappe faible, sinon `eperon`
 * reste mort à l'extrême (mesuré : 5,85 % de victoires au tier le plus haut).
 *
 * Se déplacer, passer, lire une intention : gratuit. **Frapper signe** : un
 * coup consomme une feuille. Une **riposte** n'en consomme aucune — ce n'est
 * pas un acte, personne ne la choisit — et ne dépense pas la frappe du tour
 * du riposteur. À zéro feuille l'arbre est vide, la bataille est `epuise` —
 * une fin, pas un blocage.
 *
 * LIMITE mesurée — **l'extrémité d'un mot reste un malus, pas un sidegrade.**
 * Sur 330 144 duels du moteur (2 000 mots, huit distances d'engagement, trois
 * politiques), le taux de victoire décroît de 55,6 % au tier le plus bas à
 * 19,5 % au plus haut. Ce n'est pas un artefact de la mesure contre un pool
 * moyen : il décroît aussi **dans la niche**, c'est-à-dire contre le quartile
 * d'adversaires le plus favorable à chacun (93,9 % → 57,6 %). On pouvait
 * espérer que l'agrandissement des salles — `dalleDe` est passée d'un bit à
 * deux par case, la plus grande salle d'un tenant de 19,8 à 56,8 cases sur
 * 81 — donne enfin au spécialiste la place d'atteindre sa niche : **elle ne
 * la lui donne pas.** L'écart de niche ne se referme que de 41,5 à 36,4
 * points, et la bande sur le pool s'ouvre au lieu de se fermer. La cause est
 * arithmétique et non réglable par une constante : abattre demande de tenir
 * *et* de frapper, un produit, et concentrer un budget fixe sur un seul axe
 * minore un produit. Ce que le prix des axes corrige, c'est *lequel* des
 * quatre on pointe (rapport lame/ecu contre eperon/arc : 19,6× à l'origine,
 * 0,85 à 1,36× après) ; ce qu'il ne corrige pas, c'est *combien* on pointe.
 *
 * LIMITE : la bataille est une jauge. Elle ne touche ni le carnet, ni la
 * chaîne, ni le format des transactions ; seules la preuve exportée et les
 * sceaux engagent. L'intention annoncée est une **figure** : le joueur la rend
 * fausse en déplaçant la cible, et le moteur ne la lui oppose jamais. La règle
 * d'intention de ce fichier est provisoire (PR 3 apporte `ia.ts`), l'orientation
 * d'une unité est une convention de lecture (voir `precedenteDe`), et
 * `rejouer` n'applique que des actes : les passages de main restent explicites,
 * un juge doit intercaler ses `finDePhase`.
 */

import { concat, hexOf, sha256d, u16, u32, utf8 } from "../hash.ts";
import { paireDe, qDeMot } from "../resonance.ts";
import { dalleDe, etageDe } from "../tour.ts";
import {
  accessibles,
  casesAPortee,
  casesDe,
  chemin,
  cible as ciblesDe,
  cle,
  dansGrille,
  distance,
  estDeDos,
  estObstacle,
  memeCase,
  occupantDe,
  voisines,
} from "./grille.ts";
import {
  deplacer,
  encaisser,
  nouveauTour,
  pas,
  portee,
  poser,
  reprendre,
  vivante,
} from "./unite.ts";
import {
  CAMPS,
  CHARGE_PAR_CASE,
  COUP_BASE,
  COUP_MIN,
  DIV_ACCORD,
  DIV_ALLONGE,
  DIV_DOS,
  GRILLE_N,
  RejetTactique,
  type Acte,
  type Camp,
  type Case,
  type Coup,
  type EtatBataille,
  type Fin,
  type Intention,
  type Unite,
} from "./types.ts";

export const TAG_BATAILLE = utf8("eidos-bataille/1");

const AUTRE_CAMP: Record<Camp, Camp> = {
  coffre: "indechiffre",
  indechiffre: "coffre",
};

/** Division entière. Sur des entiers positifs, `trunc` et `floor` coïncident. */
function div(n: number, d: number): number {
  return Math.trunc(n / d);
}

function u8(n: number): Uint8Array {
  return new Uint8Array([n & 255]);
}

function nomCase(c: Case): string {
  return `(${c.x},${c.y})`;
}

function uniteDe(etat: EtatBataille, id: number): Unite {
  const u = etat.unites.find((x) => x.id === id);
  if (u === undefined)
    throw new RejetTactique(
      `unité ${id} inconnue au lieu de l'une des ${etat.unites.length} en lice`,
    );
  return u;
}

/** Les unités qui comptent. Une unité à 0 reste au journal, plus sur la dalle. */
function vivantesDe(etat: EtatBataille): Unite[] {
  return etat.unites.filter((u) => vivante(u));
}

function remplacer(unites: readonly Unite[], neuve: Unite): Unite[] {
  return unites.map((u) => (u.id === neuve.id ? neuve : u));
}

/** À égalité de distance, le plus petit id. Aucun autre départage. */
function plusProche(u: Unite, autres: readonly Unite[]): Unite | null {
  let choix: Unite | null = null;
  let meilleure = 0;
  for (const a of autres) {
    const d = distance(u.pos, a.pos);
    if (choix === null || d < meilleure || (d === meilleure && a.id < choix.id)) {
      choix = a;
      meilleure = d;
    }
  }
  return choix;
}

// ---------------------------------------------------------------------------
// Ouverture
// ---------------------------------------------------------------------------

/**
 * Pose les deux camps sur la dalle de l'étage. Les identifiants sont réattribués
 * dans l'ordre — le coffre d'abord, les Indéchiffrés ensuite — les drapeaux de
 * tour repartent à faux et la case quittée à `null` : une bataille qui s'ouvre
 * n'a pas de passé. La tenue reçue est gardée telle quelle, c'est `unite.ts`
 * qui la lit du mot.
 */
export function ouvrirBataille(
  etage: number,
  coffre: readonly Unite[],
  indechiffres: readonly Unite[],
  feuilles: number,
): EtatBataille {
  if (!Number.isInteger(feuilles) || feuilles < 0)
    throw new RejetTactique(`feuilles ${feuilles} au lieu d'un entier positif ou nul`);
  const e = etageDe(etage);
  const obstacles = dalleDe(e);
  const unites: Unite[] = [];
  const rangees: readonly (readonly [readonly Unite[], Camp])[] = [
    [coffre, "coffre"],
    [indechiffres, "indechiffre"],
  ];
  for (const [lot, camp] of rangees) {
    for (const brute of lot) {
      const u: Unite = {
        ...brute,
        id: unites.length,
        camp,
        precedente: null,
        elan: 0,
        aFrappe: false,
        aDeplace: false,
      };
      if (!dansGrille(u.pos))
        throw new RejetTactique(
          `unité ${u.id} en ${nomCase(u.pos)} au lieu d'une case de la dalle`,
        );
      if (estObstacle(obstacles, u.pos))
        throw new RejetTactique(
          `unité ${u.id} sur la case pleine ${nomCase(u.pos)} au lieu d'une case libre`,
        );
      const tenant = unites.find((v) => memeCase(v.pos, u.pos));
      if (tenant !== undefined)
        throw new RejetTactique(
          `unité ${u.id} en ${nomCase(u.pos)} au lieu d'une case libre : l'unité ${tenant.id} y est`,
        );
      unites.push(u);
    }
  }
  const ouverte: EtatBataille = {
    etage: e,
    obstacles,
    unites,
    tour: 1,
    phase: "coffre",
    feuilles,
    intentions: [],
    journal: [],
    fin: null,
  };
  return telegraphier(avecFin(ouverte));
}

// ---------------------------------------------------------------------------
// Résolution — zéro dé
// ---------------------------------------------------------------------------

/**
 * Le coup, calculé et rien de plus : `resoudreCoup` ne touche pas l'état, ne
 * consomme pas de feuille, ne vérifie ni la portée ni la phase. C'est `jouer`
 * qui décide si le coup a le droit d'exister ; c'est la télégraphie qui s'en
 * sert pour montrer sans engager.
 */
export function resoudreCoup(etat: EtatBataille, attaquant: number, cible: number): Coup {
  const a = uniteDe(etat, attaquant);
  const d = uniteDe(etat, cible);
  if (a.id === d.id)
    throw new RejetTactique(`unité ${a.id} contre elle-même au lieu d'une autre unité`);
  const base = COUP_BASE + a.axes.lame;
  const lecture = paireDe(
    { q: qDeMot(a.mot), classe: a.classe },
    { q: qDeMot(d.mot), classe: d.classe },
    a.id,
    d.id,
  );
  const cran = div(base, DIV_ACCORD);
  const accord =
    lecture.polarite === "constructif" ? cran : lecture.polarite === "destructif" ? -cran : 0;
  // Sans souvenir de déplacement, on rend au défenseur sa propre case :
  // `estDeDos` y lit l'absence de dos. Une unité qui n'a pas bougé regarde partout.
  const dos = estDeDos(a, d, d.precedente ?? d.pos) ? div(base, DIV_DOS) : 0;
  // Frapper de plus loin que la cible ne riposte. Le prix de `arc`.
  const allonge = distance(a.pos, d.pos) > portee(d) ? div(base, DIV_ALLONGE) : 0;
  // La charge : chaque case parcourue avant de frapper pèse sur le coup.
  // C'est le second prix de `eperon`, et le seul terme additif.
  const charge = CHARGE_PAR_CASE * a.elan;
  // `ecu` n'entre pas ici : il paie la tenue, une fois, dans `unite.ts`.
  const porte = Math.max(COUP_MIN, base + accord + dos + allonge + charge);
  const tenueApres = Math.max(0, d.tenue - porte);
  return {
    attaquant: a.id,
    cible: d.id,
    base,
    accord,
    dos,
    allonge,
    charge,
    porte,
    tenueApres,
    retiree: tenueApres === 0,
    riposte: false,
  };
}

/**
 * La riposte, ou `null` s'il n'y en a pas.
 *
 * Frappée à une distance d'où elle atteint son attaquant, une unité plus vive
 * que lui lui rend le coup. Trois conditions, toutes entières et toutes
 * lisibles avant de frapper :
 *
 *   1. la frappée tient encore — `tenue > 0` après le coup ; on ne relève
 *      pas un mot tombé ;
 *   2. l'attaquant est dans sa portée — `distance <= portee(d)` ; c'est
 *      exactement la négation de l'allonge : un coup qui gagne `+base/4`
 *      d'allonge n'appelle jamais de riposte, et réciproquement ;
 *   3. `d.eperon > a.eperon`, **strictement** : à égalité, personne ne rend
 *      rien. C'est là qu'`eperon` se paie.
 *
 * La riposte n'est pas un acte : elle ne consomme aucune feuille, elle ne
 * dépense pas la frappe du tour du riposteur, elle ne se refuse pas. Elle
 * entre au journal comme un `Coup` marqué `riposte`. **On ne riposte jamais
 * à une riposte** : `jouer` est le seul appelant, et il ne l'appelle que sur
 * le coup porté.
 *
 * L'état passé doit être celui d'**après** le coup — la tenue de la frappée
 * y est déjà entamée — sinon la condition 1 se lit sur une tenue périmée.
 */
export function riposteDe(etat: EtatBataille, coup: Coup): Coup | null {
  if (coup.riposte) return null;
  const a = uniteDe(etat, coup.attaquant);
  const d = uniteDe(etat, coup.cible);
  if (!vivante(d)) return null;
  if (d.axes.eperon <= a.axes.eperon) return null;
  if (distance(d.pos, a.pos) > portee(d)) return null;
  return { ...resoudreCoup(etat, d.id, a.id), riposte: true };
}

// ---------------------------------------------------------------------------
// Actes
// ---------------------------------------------------------------------------

/**
 * Ce que l'unité peut encore faire dans la phase. Une lecture : gratuite,
 * elle n'engage rien. Ordre canonique — déplacements par (y, x), frappes par
 * id de cible, puis `passer`, toujours possible pour qui est en lice.
 */
export function actesPossibles(etat: EtatBataille, unite: number): Acte[] {
  if (etat.fin !== null) return [];
  const u = etat.unites.find((x) => x.id === unite);
  if (u === undefined || u.camp !== etat.phase || !vivante(u)) return [];
  const vis = vivantesDe(etat);
  const out: Acte[] = [];
  if (!u.aDeplace) {
    const cases = casesDe(accessibles(etat.obstacles, vis, u, pas(u))).filter(
      (c) => !memeCase(c, u.pos),
    );
    for (const vers of cases) out.push({ geste: "deplacer", unite: u.id, vers });
  }
  if (!u.aFrappe && (u.camp !== "coffre" || etat.feuilles > 0)) {
    for (const p of ciblesDe(vis, u, portee(u)))
      out.push({ geste: "frapper", unite: u.id, cible: p.id });
  }
  out.push({ geste: "passer", unite: u.id });
  return out;
}

/** Applique un acte. Refuse, sinon, en disant quoi au lieu de quoi. */
export function jouer(etat: EtatBataille, acte: Acte): EtatBataille {
  if (etat.fin !== null)
    throw new RejetTactique(`bataille finie (${etat.fin.issue}) au lieu d'ouverte`);
  const u = uniteDe(etat, acte.unite);
  if (u.camp !== etat.phase)
    throw new RejetTactique(`phase ${etat.phase} au lieu de ${u.camp}`);
  if (!vivante(u)) throw new RejetTactique(`unité ${u.id} tenue 0 au lieu de 1 au moins`);
  const vis = vivantesDe(etat);
  if (acte.geste === "deplacer") {
    if (u.aDeplace)
      throw new RejetTactique(
        `unité ${u.id} déjà déplacée au lieu d'un déplacement par tour`,
      );
    const couts = accessibles(etat.obstacles, vis, u, pas(u));
    if (memeCase(acte.vers, u.pos) || !couts.has(cle(acte.vers)))
      throw new RejetTactique(
        `case ${nomCase(acte.vers)} au lieu de l'une des ${couts.size - 1} accessibles en ${pas(u)} pas`,
      );
    return avecFin({
      ...etat,
      unites: remplacer(etat.unites, marquerDeplacee(u, acte.vers, couts.get(cle(acte.vers))!)),
    });
  }
  if (acte.geste === "frapper") {
    if (u.aFrappe)
      throw new RejetTactique(`unité ${u.id} a déjà frappé au lieu d'une frappe par tour`);
    // L'arbre est celui du joueur : seuls ses coups brûlent une feuille.
    // Un Indéchiffré frappe sans rien signer — il n'a pas de clé.
    if (u.camp === "coffre" && etat.feuilles < 1)
      throw new RejetTactique(`${etat.feuilles} feuille au lieu de 1`);
    const proies = ciblesDe(vis, u, portee(u));
    const d = proies.find((p) => p.id === acte.cible);
    if (d === undefined)
      throw new RejetTactique(
        `cible ${acte.cible} au lieu de l'une des ${proies.length} à portée ${portee(u)}`,
      );
    const coup = resoudreCoup(etat, u.id, d.id);
    const unites = etat.unites.map((x) =>
      x.id === u.id
        ? { ...x, aFrappe: true }
        : x.id === d.id
          ? encaisser(x, coup.porte)
          : x,
    );
    const apres: EtatBataille = {
      ...etat,
      unites,
      feuilles: u.camp === "coffre" ? etat.feuilles - 1 : etat.feuilles,
      journal: [...etat.journal, coup],
    };
    // La riposte se lit sur l'état d'après le coup : une frappée tombée ne
    // rend rien. Elle ne coûte ni feuille ni frappe, et n'en appelle pas d'autre.
    const rendu = riposteDe(apres, coup);
    if (rendu === null) return avecFin(apres);
    return avecFin({
      ...apres,
      unites: apres.unites.map((x) => (x.id === u.id ? encaisser(x, rendu.porte) : x)),
      journal: [...apres.journal, rendu],
    });
  }
  return avecFin({
    ...etat,
    unites: remplacer(etat.unites, { ...u, aFrappe: true, aDeplace: true }),
  });
}

/**
 * La case quittée se note au moment du pas : c'est elle que le défenseur
 * surveille, et c'est d'elle que `estDeDos` tire le dos. Le **coût du chemin**
 * s'y note aussi — c'est l'élan, et c'est lui que la charge paie : contourner
 * un mur coûte les cases du détour, pas la distance à vol d'oiseau.
 */
function marquerDeplacee(u: Unite, vers: Case, cout: number): Unite {
  return { ...deplacer(u, vers, cout), precedente: u.pos, aDeplace: true };
}

/** Rejoue une suite d'actes. Les passages de main ne sont pas des actes. */
export function rejouer(etat: EtatBataille, actes: readonly Acte[]): EtatBataille {
  let e = etat;
  for (const a of actes) e = jouer(e, a);
  return e;
}

// ---------------------------------------------------------------------------
// Fin
// ---------------------------------------------------------------------------

function issueDe(etat: EtatBataille): Fin | null {
  const vis = vivantesDe(etat);
  if (!vis.some((u) => u.camp === "indechiffre")) return { issue: "victoire", tour: etat.tour };
  if (!vis.some((u) => u.camp === "coffre")) return { issue: "defaite", tour: etat.tour };
  if (etat.feuilles === 0) return { issue: "epuise", tour: etat.tour };
  return null;
}

/** Une bataille finie n'annonce plus rien : la télégraphie s'éteint avec elle. */
function avecFin(etat: EtatBataille): EtatBataille {
  const fin = issueDe(etat);
  return { ...etat, fin, intentions: fin === null ? etat.intentions : [] };
}

// ---------------------------------------------------------------------------
// Phases et télégraphie
// ---------------------------------------------------------------------------

/**
 * L'ordre d'un camp : `eperon` décroissant, à égalité id croissant. Imposé aux
 * Indéchiffrés ; pour le coffre, une suggestion — le moteur n'oppose aucun
 * ordre au joueur.
 */
export function ordreDePhase(etat: EtatBataille, camp: Camp = etat.phase): number[] {
  return vivantesDe(etat)
    .filter((u) => u.camp === camp)
    .sort((a, b) => (a.axes.eperon !== b.axes.eperon ? b.axes.eperon - a.axes.eperon : a.id - b.id))
    .map((u) => u.id);
}

/**
 * Passe la main. Les unités du camp sortant qui n'ont rien fait de tout le tour
 * reprennent (`arc/DIV_REPRISE`, dans `unite.ts`) ; celles du camp entrant
 * retrouvent leurs deux gestes. Le tour avance quand la main revient au coffre.
 * Une bataille finie ne passe plus la main.
 */
export function finDePhase(etat: EtatBataille): EtatBataille {
  if (etat.fin !== null) return etat;
  const sortant = etat.phase;
  const entrant = AUTRE_CAMP[sortant];
  const unites = etat.unites.map((u) => {
    // Le camp qui sort s'arrête : son élan retombe, une riposte n'est jamais
    // une charge. Celui qui n'a rien fait de tout le tour reprend.
    if (u.camp === sortant)
      return poser(vivante(u) && !u.aFrappe && !u.aDeplace ? reprendre(u) : u);
    if (u.camp === entrant) return nouveauTour(u);
    return u;
  });
  const suivant: EtatBataille = {
    ...etat,
    unites,
    phase: entrant,
    tour: entrant === "coffre" ? etat.tour + 1 : etat.tour,
  };
  return telegraphier(suivant);
}

/**
 * Annonce ce que feront les Indéchiffrés — seulement quand la main revient au
 * coffre : c'est au joueur que la télégraphie s'adresse. Pendant la phase
 * adverse, l'annonce du tour reste affichée telle quelle.
 *
 * PROVISOIRE : viser l'unité du coffre vivante la plus proche (à égalité, le
 * plus petit id), la frapper si elle est à portée, sinon s'en rapprocher.
 * `ia.ts` (PR 3) remplacera cette règle. Une figure, dans tous les cas.
 */
function telegraphier(etat: EtatBataille): EtatBataille {
  if (etat.fin !== null) return { ...etat, intentions: [] };
  if (etat.phase !== "coffre") return etat;
  const vis = vivantesDe(etat);
  const proies = vis.filter((u) => u.camp === "coffre");
  const intentions: Intention[] = [];
  for (const id of ordreDePhase(etat, "indechiffre")) {
    const u = vis.find((x) => x.id === id);
    if (u === undefined) continue;
    const proie = plusProche(u, proies);
    if (proie === null) {
      intentions.push({ unite: u.id, acte: { geste: "passer", unite: u.id }, menace: [] });
      continue;
    }
    if (ciblesDe(vis, u, portee(u)).some((p) => p.id === proie.id)) {
      intentions.push({
        unite: u.id,
        acte: { geste: "frapper", unite: u.id, cible: proie.id },
        menace: [proie.pos],
      });
      continue;
    }
    const vers = approche(etat, vis, u, proie.pos);
    if (vers === null) {
      intentions.push({ unite: u.id, acte: { geste: "passer", unite: u.id }, menace: [] });
      continue;
    }
    intentions.push({
      unite: u.id,
      acte: { geste: "deplacer", unite: u.id, vers },
      menace: casesAPortee(vers, portee(u)),
    });
  }
  return { ...etat, intentions };
}

/**
 * La case la plus avancée, ce tour-ci, sur le chemin qui mène au contact.
 *
 * On vise un abord libre de la proie — sa case est occupée, personne n'y va —
 * et on suit le chemin tant qu'il reste dans les cases atteignables : le BFS
 * porte sur la dalle entière (`GRILLE_N²`), le pas du tour le tronque. Chemin
 * coupé : la case atteignable la plus proche du but, en ordre de lecture, et
 * seulement si elle rapproche.
 */
function approche(
  etat: EtatBataille,
  vis: readonly Unite[],
  u: Unite,
  but: Case,
): Case | null {
  const couts = accessibles(etat.obstacles, vis, u, pas(u));
  const atteignables = casesDe(couts).filter((c) => !memeCase(c, u.pos));
  if (atteignables.length === 0) return null;
  const abords = voisines(but)
    .filter((c) => !estObstacle(etat.obstacles, c) && occupantDe(vis, c) === null)
    .sort((p, q) => distance(u.pos, p) - distance(u.pos, q));
  for (const abord of abords) {
    let sur: Case | null = null;
    for (const c of chemin(etat.obstacles, vis, u, abord, GRILLE_N * GRILLE_N)) {
      if (!couts.has(cle(c))) break;
      sur = c;
    }
    if (sur !== null && !memeCase(sur, u.pos)) return sur;
  }
  let choix = atteignables[0]!;
  for (const c of atteignables) if (distance(c, but) < distance(choix, but)) choix = c;
  return distance(choix, but) < distance(u.pos, but) ? choix : null;
}

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

/** Une case en un octet, `y·GRILLE_N + x` ; 255 pour « aucune ». */
function octetCase(c: Case | null): Uint8Array {
  return u8(c === null || !dansGrille(c) ? 255 : c.y * GRILLE_N + c.x);
}

/**
 * L'empreinte de l'échiquier : étage, unités par id (camp, mot, case, case
 * quittée, élan, tenue, drapeaux), tour, phase, feuilles. La case quittée et
 * l'élan en font partie parce qu'ils entrent dans la résolution — d'eux
 * viennent le dos et la charge. Ni le journal ni les intentions n'y entrent : le journal se déduit des
 * actes rejoués, l'intention est une figure. Deux états identiques rendent la
 * même trace ; un octet d'écart la change.
 */
export function traceBataille(etat: EtatBataille): string {
  const rangs = [...etat.unites].sort((a, b) => a.id - b.id);
  const morceaux: Uint8Array[] = [TAG_BATAILLE, u32(etat.etage), u16(rangs.length)];
  for (const u of rangs) {
    morceaux.push(
      u16(u.id),
      u8(CAMPS.indexOf(u.camp)),
      u32(u.mot),
      octetCase(u.pos),
      octetCase(u.precedente),
      u8(u.elan),
      u16(u.tenue),
      u8((u.aFrappe ? 1 : 0) | (u.aDeplace ? 2 : 0)),
    );
  }
  morceaux.push(u32(etat.tour), u8(CAMPS.indexOf(etat.phase)), u16(etat.feuilles));
  return hexOf(sha256d(concat(...morceaux)));
}
