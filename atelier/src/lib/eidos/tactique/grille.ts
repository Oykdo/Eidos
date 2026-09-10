/**
 * Grille de bataille — la géométrie de la dalle 9×9 (`tour.ts`, `dalleDe`).
 *
 * **Quatre directions, distance de Manhattan.** Pas de diagonale : sur une
 * grille carrée elle vaut 1 case ou 1,4 selon l'école, et les deux réponses
 * demandent un arbitrage — l'une ment sur la géométrie, l'autre demande un
 * flottant. Une somme de valeurs absolues ne demande rien. Tout est entier,
 * tout se rejoue.
 *
 * **Le parcours est un BFS à coût unitaire**, exploré dans l'ordre N, E, S, O.
 * Cet ordre est la règle, pas un détail : deux appels de `chemin` sur le même
 * état rendent la même suite de cases, à la case près. Un juge en CI rejoue
 * une bataille sans se demander quel plus court chemin le client a choisi.
 *
 * **Zone de contrôle.** Une unité tient ses quatre cases adjacentes. On y
 * entre, on n'en repart pas : le coût y est terminal. La case de départ ne
 * compte pas — une unité engagée se dégage, mais elle ne traverse pas.
 *
 * **Le dos.** Une unité qui vient d'avancer reste tournée vers la case
 * qu'elle a quittée : elle surveille d'où elle vient. Son dos est du côté
 * opposé. On la prend de dos quand elle se tient exactement entre la case
 * quittée et l'attaquant, sur une même ligne ou colonne. Une unité qui n'a
 * pas bougé n'a pas de dos : elle regarde partout.
 *
 * LIMITE : la portée ignore les murs et la ligne de vue. `casesAPortee` et
 * `cible` mesurent une distance, pas un tir : on frappe à travers une case
 * pleine. C'est assumé — la dalle fait 9 cases de côté, et une règle de vue
 * demanderait un tracé, donc un arbitrage de plus à geler.
 */

import { CAMPS, GRILLE_N, RejetTactique, type Camp, type Case, type Unite } from "./types.ts";

/** N, E, S, O. `y` croît vers le sud, comme les lignes de `dalleDe`. */
const CARDINAUX: readonly Case[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** Clé de case pour les tables du parcours. `"x,y"`, jamais un index calculé. */
export function cle(c: Case): string {
  return `${c.x},${c.y}`;
}

/** Inverse de `cle`. Refuse tout ce qui n'est pas une case de la dalle. */
export function depuisCle(k: string): Case {
  const i = k.indexOf(",");
  const c = { x: Number(k.slice(0, i)), y: Number(k.slice(i + 1)) };
  if (i < 0 || !dansGrille(c)) {
    throw new RejetTactique(`clé "${k}" au lieu de "x,y" dans la dalle`);
  }
  return c;
}

/** Les cases d'une carte d'accessibilité, en ordre de lecture. */
export function casesDe(couts: ReadonlyMap<string, number>): Case[] {
  return trier([...couts.keys()].map(depuisCle));
}

export function campAdverse(camp: Camp): Camp {
  return camp === CAMPS[0] ? CAMPS[1] : CAMPS[0];
}

/** Entiers, dans `0..GRILLE_N-1`. Un demi-pas n'est pas une case. */
export function dansGrille(c: Case): boolean {
  return (
    Number.isInteger(c.x) &&
    Number.isInteger(c.y) &&
    c.x >= 0 &&
    c.x < GRILLE_N &&
    c.y >= 0 &&
    c.y < GRILLE_N
  );
}

export function memeCase(a: Case, b: Case): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Manhattan. Symétrique, nulle sur soi, entière. */
export function distance(a: Case, b: Case): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function exigerCase(c: Case, role: string): void {
  if (!dansGrille(c)) {
    throw new RejetTactique(
      `${role} (${c.x},${c.y}) hors de la dalle ${GRILLE_N}×${GRILLE_N}`,
    );
  }
}

function exigerCompte(n: number, nom: string): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new RejetTactique(`${nom} ${n} au lieu d'un entier de 0 ou plus`);
  }
}

function exigerDalle(obstacles: readonly (readonly boolean[])[]): void {
  if (obstacles.length !== GRILLE_N) {
    throw new RejetTactique(
      `dalle de ${obstacles.length} lignes au lieu de ${GRILLE_N}`,
    );
  }
  for (let y = 0; y < GRILLE_N; y++) {
    const ligne = obstacles[y];
    if (!ligne || ligne.length !== GRILLE_N) {
      throw new RejetTactique(
        `ligne ${y} de ${ligne ? ligne.length : 0} cases au lieu de ${GRILLE_N}`,
      );
    }
  }
}

/** Ordre de lecture : ligne, puis colonne. Le même partout, pour le rejeu. */
function trier(cases: Case[]): Case[] {
  return cases.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.x - b.x));
}

/** Les quatre orthogonales qui tombent dans la dalle, dans l'ordre N, E, S, O. */
export function voisines(c: Case): Case[] {
  exigerCase(c, "case");
  const out: Case[] = [];
  for (const d of CARDINAUX) {
    const v = { x: c.x + d.x, y: c.y + d.y };
    if (dansGrille(v)) out.push(v);
  }
  return out;
}

/** Hors dalle vaut plein : on ne sort pas de l'étage par le bord. */
export function estObstacle(
  obstacles: readonly (readonly boolean[])[],
  c: Case,
): boolean {
  if (!dansGrille(c)) return true;
  const ligne = obstacles[c.y];
  return ligne !== undefined && ligne[c.x] === true;
}

/**
 * L'unité vivante qui tient la case, ou `null`. Une unité retirée
 * (`tenue <= 0`) n'occupe plus rien : elle ne barre pas le passage.
 * Si deux unités partagent une case — un état incohérent — rend la première
 * du tableau, sans trancher.
 */
export function occupantDe(unites: readonly Unite[], c: Case): Unite | null {
  for (const u of unites) {
    if (u.tenue > 0 && memeCase(u.pos, c)) return u;
  }
  return null;
}

/**
 * Les cases tenues par le camp adverse à `contre` : les orthogonales de
 * chacune de ses unités vivantes. Géométrique — une case pleine ou occupée
 * y figure, c'est le parcours qui refuse d'y entrer.
 */
export function zoneDeControle(unites: readonly Unite[], contre: Camp): Case[] {
  const vues = new Set<string>();
  const out: Case[] = [];
  for (const u of unites) {
    if (u.tenue <= 0 || u.camp === contre) continue;
    if (!dansGrille(u.pos)) continue;
    for (const v of voisines(u.pos)) {
      const k = cle(v);
      if (vues.has(k)) continue;
      vues.add(k);
      out.push(v);
    }
  }
  return trier(out);
}

type Parcours = {
  readonly couts: Map<string, number>;
  readonly precedents: Map<string, Case>;
};

/**
 * BFS entier depuis `unite.pos`. Une case pleine ou tenue par une unité
 * vivante ne se traverse pas ; une case sous contrôle adverse s'atteint mais
 * ne se quitte pas. File en ordre d'insertion, voisines en N, E, S, O :
 * l'exploration est la même à chaque appel.
 */
function parcourir(
  obstacles: readonly (readonly boolean[])[],
  unites: readonly Unite[],
  unite: Unite,
  pas: number,
): Parcours {
  exigerDalle(obstacles);
  exigerCase(unite.pos, "case de départ");
  exigerCompte(pas, "pas");
  const controle = new Set(zoneDeControle(unites, unite.camp).map(cle));
  const depart = { x: unite.pos.x, y: unite.pos.y };
  const couts = new Map<string, number>([[cle(depart), 0]]);
  const precedents = new Map<string, Case>();
  const file: Case[] = [depart];
  let tete = 0;
  while (tete < file.length) {
    const c = file[tete]!;
    tete += 1;
    const cout = couts.get(cle(c))!;
    if (cout >= pas) continue;
    // On entre sous contrôle adverse, on n'en repart pas. Le départ est libre.
    if (cout > 0 && controle.has(cle(c))) continue;
    for (const v of voisines(c)) {
      const k = cle(v);
      if (couts.has(k)) continue;
      if (estObstacle(obstacles, v)) continue;
      const occ = occupantDe(unites, v);
      if (occ !== null && occ.id !== unite.id) continue;
      couts.set(k, cout + 1);
      precedents.set(k, c);
      file.push(v);
    }
  }
  return { couts, precedents };
}

/** `"x,y"` → coût en pas depuis `unite.pos`, la case de départ à 0 incluse. */
export function accessibles(
  obstacles: readonly (readonly boolean[])[],
  unites: readonly Unite[],
  unite: Unite,
  pas: number,
): Map<string, number> {
  return parcourir(obstacles, unites, unite, pas).couts;
}

/**
 * Le plus court chemin, case de départ exclue, `vers` incluse. `[]` si la
 * case est inaccessible — trop loin, pleine, occupée, derrière une zone de
 * contrôle — ou si c'est déjà celle de l'unité. À longueur égale, celui que
 * l'ordre N, E, S, O a trouvé le premier.
 */
export function chemin(
  obstacles: readonly (readonly boolean[])[],
  unites: readonly Unite[],
  unite: Unite,
  vers: Case,
  pas: number,
): Case[] {
  exigerCase(vers, "case visée");
  const { couts, precedents } = parcourir(obstacles, unites, unite, pas);
  if (!couts.has(cle(vers))) return [];
  const out: Case[] = [];
  let c: Case | undefined = { x: vers.x, y: vers.y };
  while (c !== undefined && !memeCase(c, unite.pos)) {
    out.push({ x: c.x, y: c.y });
    c = precedents.get(cle(c));
  }
  out.reverse();
  return out;
}

/**
 * Toutes les cases de la dalle à `1 <= distance <= portee`. Ordre de lecture.
 * Ni murs ni ligne de vue : c'est une portée, pas un tir (voir LIMITE).
 */
export function casesAPortee(depart: Case, portee: number): Case[] {
  exigerCase(depart, "case de tir");
  exigerCompte(portee, "portée");
  const out: Case[] = [];
  for (let y = 0; y < GRILLE_N; y++) {
    for (let x = 0; x < GRILLE_N; x++) {
      const d = distance(depart, { x, y });
      if (d >= 1 && d <= portee) out.push({ x, y });
    }
  }
  return out;
}

/** Les unités vivantes du camp d'en face à portée, par id croissant. */
export function cible(
  unites: readonly Unite[],
  attaquant: Unite,
  portee: number,
): Unite[] {
  exigerCompte(portee, "portée");
  const out: Unite[] = [];
  for (const u of unites) {
    if (u.tenue <= 0 || u.camp === attaquant.camp) continue;
    const d = distance(attaquant.pos, u.pos);
    if (d >= 1 && d <= portee) out.push(u);
  }
  return out.sort((a, b) => a.id - b.id);
}

/**
 * Le dos est pris quand le défenseur se tient **entre** la case qu'il vient
 * de quitter et l'attaquant, sur une même ligne ou colonne : l'attaquant
 * frappe dans l'axe de la marche, du côté opposé au regard.
 *
 * Faux de face (l'attaquant est du côté de la case quittée), faux de flanc
 * (rien n'est aligné), faux si le défenseur n'a pas bougé — `precedente`
 * égale sa case — et faux si `precedente` n'est pas une case de la dalle :
 * sans souvenir de déplacement, il n'y a pas de dos.
 */
export function estDeDos(
  attaquant: Unite,
  defenseur: Unite,
  precedente: Case,
): boolean {
  if (!dansGrille(precedente)) return false;
  const a = attaquant.pos;
  const d = defenseur.pos;
  if (memeCase(precedente, d)) return false;
  if (memeCase(a, d)) return false;
  const alignes =
    (a.x === d.x && d.x === precedente.x) || (a.y === d.y && d.y === precedente.y);
  if (!alignes) return false;
  return distance(a, precedente) === distance(a, d) + distance(d, precedente);
}
