/**
 * Le bot de la veillée — la falsification de la bible §2.4, mesurée.
 *
 * Un bot xorshift32 (pendule-phase0.ts : l'aléa est celui du bot, jamais
 * celui du jeu) joue des veillées **libres** sur le jour du vecteur `veillee`
 * de vecteurs.json, dans un coffre d'atelier (portes ouvertes, graine
 * publique : une démonstration), avec les vraies fonctions de veillee-tour.ts —
 * l'acte d'abord, la feuille ensuite. Trois politiques :
 *
 *   avare     26 franchir, rien d'autre : le run A de la bible §4.4 sans l'hôte
 *   gourmand  à chaque salle, les trois gestes de butin que ce coffre permet,
 *             avant de franchir : parler (hôte présent, pas encore honoré),
 *             creuser la case d'arrivée, ouvrir l'alcôve ; jamais prendre,
 *             faute de capsule
 *   mesuré    chaque geste disponible tenté avec une probabilité p, tirée une
 *             fois par run dans ]0, 1[
 *
 * Le choix de fin de salle (monter / lire / offrir) est tiré par le bot, pour
 * les trois politiques. Chaque politique a son propre flux xorshift, dérivé de
 * la graine du bot par SHA-256d : le run k d'une politique ne dépend ni du
 * nombre de runs ni des autres politiques, et se rejoue à l'identique. La
 * réserve d'indice est propre à chaque run (jamais le registre de session de
 * veillee-tour.ts) : le bot ne touche à aucun état hors de lui.
 *
 * Mesures par politique : taux de sommet, feuilles brûlées en moyenne et au
 * plus, butin moyen, part des sommets à exactement 38 de butin (64 − 26),
 * distribution des fins. Verdict contre §2.4, lu sur la politique mesurée :
 * **dilemme absent** si plus de 80 % des sommets ont 38 de butin (on prend
 * toujours tout) ; **budget trop court** si moins de 30 % des runs touchent
 * le sommet. Le rapport dit aussi si le **budget a mordu** — un run au moins
 * a brûlé ses 64 feuilles — sans quoi les deux seuils sont hors de portée du
 * bot et le verdict ne falsifie rien.
 *
 *   node --experimental-strip-types src/lib/eidos/veillee-bot.ts [runs]
 *
 * Module Node (node:fs, process.argv) : un script et son test, jamais importé
 * par l'atelier. Chaque run rebâtit l'arbre de 64 feuilles (1,3 à 1,6 s sur ce
 * poste : ouvrirVeilleeDansCoffre le reconstruit à chaque ouverture) puis
 * signe chaque geste : un run coûte 2,5 à 4 s, les 1 000 veillées de §2.4
 * (× 3 politiques) plusieurs heures — un script de nuit, pas un test.
 *
 * LIMITE : ce bot ne peut pas atteindre les seuils de §2.4. Un coffre
 * d'atelier « vide » ne porte ni capsule ni pièce : il ne prend jamais, ne
 * creuse que la case d'arrivée (trois bêches par étage seraient possibles), et
 * les demandes des hôtes (preuve, orbite, sceau…) sont insatisfaites sur ce
 * coffre — « parler » n'y brûle une feuille que là où la demande est « rien ».
 * Surtout, le sac de la veillée (veillee-tour.ts, 27 places) se remplit des
 * dons d'arrivée et de chaque trouvaille : sac plein, tout geste de butin est
 * refusé sans rien brûler (compté dans `refus`). Le gourmand plafonne donc
 * vers 20 feuilles de butin sur 38, aucun run ne s'épuise, `partSommets38`
 * vaut 0 et `budgetMordu` est faux : le verdict est une lecture d'un bot que
 * le budget ne mord pas, jamais une preuve. Pour que §2.4 se falsifie, le bot
 * devra creuser les cases pleines de la dalle (une bêche brûle une feuille
 * sans remplir le sac) — une décision d'auteur, qui régénère la table gelée.
 */

import { readFileSync } from "node:fs";
import { spawnIci } from "./fouilles.ts";
import { concat, sha256d, utf8 } from "./hash.ts";
import { aUnHote, donHonore } from "./hotes.ts";
import { tourDe } from "./jauge.ts";
import { CHOIX, ETAPES, type Choix } from "./pendule.ts";
import { xorshift } from "./pendule-phase0.ts";
import { aUneAlcove } from "./secrets.ts";
import { parserTeteReseau, type TeteReseau } from "./temoin.ts";
import type { Coffre } from "./types.ts";
import {
  FEUILLES,
  FRANCHIR_AU_SOMMET,
  GESTES,
  jourDe,
  lectureVeillee,
  scoreVeillee,
  type Fin,
  type GesteId,
} from "./veillee.ts";
import {
  abandonnerVeilleeDansCoffre,
  creuserDansCoffre,
  franchirDansCoffre,
  ouvrirAlcoveDansCoffre,
  ouvrirVeilleeDansCoffre,
  parlerDansCoffre,
  veilleeDe,
  type GesteOk,
  type RefusVeillee,
  type Reserver,
} from "./veillee-tour.ts";
import { coffreAtelier } from "./wallet.ts";

export const TAG_BOT = utf8("eidos-veillee-bot/1");

export const POLITIQUES = ["avare", "gourmand", "mesure"] as const;
export type Politique = (typeof POLITIQUES)[number];

export const FINS = ["sommet", "epuise", "porte", "abandon"] as const satisfies readonly Fin[];

/** 64 − 26 : les feuilles qui ne sont pas dues au franchir. */
export const BUTIN_MAX = FEUILLES - FRANCHIR_AU_SOMMET;

export const SEUILS = {
  /** Part des sommets à exactement BUTIN_MAX de butin ; au-dessus, on prend toujours tout : dilemme absent (§2.4). */
  partSommets38Max: 0.8,
  /** Taux de sommet ; en dessous, le budget est trop court (§2.4). */
  tauxSommetMin: 0.3,
} as const;

export type JourDeVeillee = { tete: TeteReseau; veille: TeteReseau };

export type Run = {
  politique: Politique;
  /** la probabilité du bot : 0 pour l'avare, 1 pour le gourmand, tirée pour le mesuré */
  p: number;
  fin: Fin;
  /** feuilles brûlées : gestes signés */
  feuilles: number;
  franchir: number;
  butin: number;
  salles: number;
  score: number;
  /** gestes signés par sorte */
  gestes: Record<GesteId, number>;
  /** gestes tentés et refusés avant la feuille (acte impossible, sac plein) : rien de brûlé */
  refus: number;
};

export type Mesures = {
  runs: number;
  sommets: number;
  tauxSommet: number;
  feuillesMoyennes: number;
  /** le plus de feuilles brûlées par un run ; FEUILLES = le budget a mordu */
  feuillesMax: number;
  butinMoyen: number;
  /** part des runs au sommet ayant dépensé exactement BUTIN_MAX feuilles de butin (0 sans sommet) */
  partSommets38: number;
  fins: Record<Fin, number>;
};

export type Verdict = { dilemmeAbsent: boolean; budgetTropCourt: boolean; ok: boolean };

export type Rapport = {
  runs: number;
  graineBot: number;
  jour: number;
  hauteur: number;
  idBloc: string;
  politiques: Record<Politique, Mesures>;
  detail: Record<Politique, Run[]>;
  /** un run au moins a brûlé ses FEUILLES feuilles ; sinon les seuils de §2.4 sont hors de portée */
  budgetMordu: boolean;
  /** lu sur la politique mesurée */
  verdict: Verdict;
};

// ---------------------------------------------------------------------------
// Le jour du vecteur
// ---------------------------------------------------------------------------
let jourCache: JourDeVeillee | null = null;

/** La veille et le premier bloc du jour, famille `veillee` de vecteurs.json ; lus une fois par processus. */
export function jourDuVecteur(): JourDeVeillee {
  if (jourCache) return jourCache;
  const raw = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
    veillee: { veille: unknown; premier_du_jour: unknown };
  };
  const tete = parserTeteReseau(raw.veillee.premier_du_jour);
  if ("erreur" in tete) throw new Error(`premier_du_jour : ${tete.erreur}`);
  const veille = parserTeteReseau(raw.veillee.veille);
  if ("erreur" in veille) throw new Error(`veille : ${veille.erreur}`);
  jourCache = { tete, veille };
  return jourCache;
}

// ---------------------------------------------------------------------------
// Le bot
// ---------------------------------------------------------------------------
/** La graine xorshift d'une politique : SHA-256d(tag ‖ graine du bot ‖ politique), quatre octets. */
export function graineDePolitique(graineBot: number, politique: Politique): number {
  const h = sha256d(concat(TAG_BOT, utf8(`${graineBot >>> 0}/${politique}`)));
  return ((h[0]! << 24) | (h[1]! << 16) | (h[2]! << 8) | h[3]!) >>> 0;
}

function gestesVides(): Record<GesteId, number> {
  const out = {} as Record<GesteId, number>;
  for (const g of GESTES) out[g] = 0;
  return out;
}

/** La réserve d'indice d'un seul run : la règle de `reserverEnSession`, jamais son registre. */
function reserveDuRun(): Reserver {
  const reserves = new Map<string, number>();
  return (racine, i) => {
    const dernier = reserves.get(racine) ?? 0;
    if (i < dernier) return false;
    reserves.set(racine, i + 1);
    return true;
  };
}

/**
 * Un run : une veillée libre jouée jusqu'à sa fin. `pFixe` force la probabilité
 * du mesuré (0 rejoue l'avare, 1 rejoue le gourmand, sur le même flux) ; la
 * probabilité n'est tirée que si elle n'est pas fixée, et ne consomme le flux
 * que si elle est strictement entre 0 et 1.
 */
export function jouerVeillee(politique: Politique, alea: () => number, jour = jourDuVecteur(), pFixe?: number): Run {
  const p = politique === "avare" ? 0 : politique === "gourmand" ? 1 : (pFixe ?? alea());
  if (!(p >= 0 && p <= 1)) throw new Error("probabilité hors de [0, 1]");
  const ouverture = ouvrirVeilleeDansCoffre(coffreAtelier("vide"), jour.tete, jour.veille, null);
  if (!ouverture.ok) throw new Error(ouverture.motif);
  let c: Coffre = ouverture.coffre;
  const reserver = reserveDuRun();
  const gestes = gestesVides();
  let refus = 0;
  const tente = (): boolean => p >= 1 || (p > 0 && alea() < p);
  const finie = (): boolean => veilleeDe(c)!.v.fin !== null;
  const applique = (r: GesteOk | RefusVeillee): void => {
    if (r.ok) {
      c = r.coffre;
      gestes[r.geste] += 1;
    } else {
      refus += 1;
    }
  };
  // chaque tour de boucle franchit une salle ou s'arrête : 26 franchir au plus, la borne est un garde-fou
  for (let tour = 0; tour <= ETAPES && !finie(); tour++) {
    const etage = tourDe(c).etage;
    if (aUnHote(etage) && !donHonore(c, etage) && tente()) applique(parlerDansCoffre(c, [], reserver));
    if (finie()) break;
    const s = spawnIci(c, etage);
    if (s && tente()) applique(creuserDansCoffre(c, s.x, s.y, reserver));
    if (finie()) break;
    if (aUneAlcove(etage) && !tourDe(c).alcoves.includes(etage) && tente()) applique(ouvrirAlcoveDansCoffre(c, reserver));
    if (finie()) break;
    const choix: Choix = CHOIX[Math.floor(alea() * CHOIX.length)]!;
    const f = franchirDansCoffre(c, [], choix, reserver);
    if (!f.ok) break;
    c = f.coffre;
    if (f.fin !== "porte") gestes.franchir += 1;
  }
  // sans fin (une salle qui ne se franchit pas) : le bot s'efface
  if (!finie()) c = abandonnerVeilleeDansCoffre(c);
  const v = veilleeDe(c)!.v;
  const l = lectureVeillee(v);
  return {
    politique,
    p,
    fin: v.fin!,
    feuilles: l.feuilles,
    franchir: l.salles - 1,
    butin: l.butin,
    salles: l.salles,
    score: scoreVeillee(l),
    gestes,
    refus,
  };
}

// ---------------------------------------------------------------------------
// Mesures et verdict
// ---------------------------------------------------------------------------
export function mesuresDe(runs: readonly Run[]): Mesures {
  const fins = {} as Record<Fin, number>;
  for (const f of FINS) fins[f] = 0;
  let sommets = 0;
  let sommets38 = 0;
  let feuilles = 0;
  let feuillesMax = 0;
  let butin = 0;
  for (const r of runs) {
    fins[r.fin] += 1;
    feuilles += r.feuilles;
    if (r.feuilles > feuillesMax) feuillesMax = r.feuilles;
    butin += r.butin;
    if (r.fin === "sommet") {
      sommets += 1;
      if (r.butin === BUTIN_MAX) sommets38 += 1;
    }
  }
  const n = runs.length;
  return {
    runs: n,
    sommets,
    tauxSommet: n > 0 ? sommets / n : 0,
    feuillesMoyennes: n > 0 ? feuilles / n : 0,
    feuillesMax,
    butinMoyen: n > 0 ? butin / n : 0,
    partSommets38: sommets > 0 ? sommets38 / sommets : 0,
    fins,
  };
}

/** Les deux seuils de §2.4 : dilemme absent (tout prendre paie toujours), budget trop court. */
export function verdictDe(m: Pick<Mesures, "sommets" | "partSommets38" | "tauxSommet">): Verdict {
  const dilemmeAbsent = m.sommets > 0 && m.partSommets38 > SEUILS.partSommets38Max;
  const budgetTropCourt = m.tauxSommet < SEUILS.tauxSommetMin;
  return { dilemmeAbsent, budgetTropCourt, ok: !dilemmeAbsent && !budgetTropCourt };
}

export function simuler(nRuns: number, graineBot = 7, jour = jourDuVecteur()): Rapport {
  if (!Number.isInteger(nRuns) || nRuns < 1) throw new Error("au moins un run");
  const detail = {} as Record<Politique, Run[]>;
  const politiques = {} as Record<Politique, Mesures>;
  for (const politique of POLITIQUES) {
    const alea = xorshift(graineDePolitique(graineBot, politique));
    const runs: Run[] = [];
    for (let k = 0; k < nRuns; k++) runs.push(jouerVeillee(politique, alea, jour));
    detail[politique] = runs;
    politiques[politique] = mesuresDe(runs);
  }
  return {
    runs: nRuns,
    graineBot,
    jour: jourDe(jour.tete.ts),
    hauteur: jour.tete.hauteur,
    idBloc: jour.tete.idBloc,
    politiques,
    detail,
    budgetMordu: POLITIQUES.some((p) => politiques[p].feuillesMax >= FEUILLES),
    verdict: verdictDe(politiques.mesure),
  };
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)} %`;
}

export function formaterRapport(r: Rapport): string {
  const l: string[] = [];
  l.push(`veillée — bot xorshift, ${r.runs} runs × ${POLITIQUES.length} politiques, graine ${r.graineBot}`);
  l.push(`jour ${r.jour} · bloc ${r.hauteur} · ${r.idBloc.slice(0, 16)}… · veillées libres, coffre d'atelier`);
  l.push(`budget ${FEUILLES} feuilles : ${FRANCHIR_AU_SOMMET} de franchir, ${BUTIN_MAX} de butin`);
  for (const politique of POLITIQUES) {
    const m = r.politiques[politique];
    l.push("");
    l.push(
      `${politique.padEnd(9)} sommet ${pct(m.tauxSommet).padStart(8)}  feuilles ${m.feuillesMoyennes.toFixed(2).padStart(6)} (max ${m.feuillesMax})  butin ${m.butinMoyen.toFixed(2).padStart(6)}  sommets à ${BUTIN_MAX} ${pct(m.partSommets38).padStart(8)}`,
    );
    l.push(`          fins  ${FINS.map((f) => `${f} ${m.fins[f]}`).join(" · ")}`);
    // la table gelée du test se relit ici : fin, feuilles, butin, run par run
    if (r.runs <= 8) l.push(`          runs  ${r.detail[politique].map((x) => `${x.fin} ${x.feuilles}/${x.butin}`).join(" · ")}`);
  }
  l.push("");
  l.push(
    `dilemme absent    (> ${SEUILS.partSommets38Max * 100} % des sommets à ${BUTIN_MAX}, mesuré)  ${r.verdict.dilemmeAbsent ? "OUI : coût 2 pour « prendre »" : "non"}`,
  );
  l.push(
    `budget trop court (< ${SEUILS.tauxSommetMin * 100} % de sommets, mesuré)        ${r.verdict.budgetTropCourt ? "OUI : coût 0 pour « parler »" : "non"}`,
  );
  l.push(
    `budget mordu      (un run au moins à ${FEUILLES} feuilles)             ${r.budgetMordu ? "oui" : "NON : les deux seuils sont hors de portée de ce bot"}`,
  );
  if (!r.budgetMordu) {
    l.push("verdict : rien de falsifié — le budget n'a pas mordu ; une lecture du bot, pas une preuve.");
  } else {
    l.push(r.verdict.ok ? "verdict : §2.4 tient — une lecture du bot, pas une preuve." : "verdict : §2.4 à réviser, comme elle le prévoit.");
  }
  return l.join("\n");
}

if (process.argv[1] && /veillee-bot\.[mc]?ts$/.test(process.argv[1])) {
  const n = Number(process.argv[2] ?? 60);
  const t = Date.now();
  const r = simuler(n);
  console.log(formaterRapport(r));
  console.log(`(${((Date.now() - t) / 1000).toFixed(1)} s)`);
  process.exit(r.verdict.ok ? 0 : 1);
}
