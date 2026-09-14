/**
 * Traits — la télégraphie dessinée : ce que chaque intention annoncée trace
 * sur la dalle, calculé une fois, entier.
 *
 * `annoncer` (`ia.ts`) pose sur l'état des intentions : par Indéchiffré, la
 * suite d'actes qu'il jouera si rien ne bouge, et les cases que ce tour
 * couvre (`menace`). La scène peint déjà la menace case par case ; il lui
 * manque la **direction** — où chacun va, et qui il frappe. C'est ce que
 * rendent les traits :
 *
 *     traitsDe(etat)  →  Trait[]   { unite, genre: "pas" | "coup", de, a }
 *
 * Un `pas` est une suite de traits d'une case à sa voisine, le parcours de
 * `chemin` depuis la case courante de l'unité (celle qu'elle occupe, puis
 * celle où l'acte précédent l'a posée) ; un `coup` est un trait de la case
 * d'où l'on frappe à la case de la cible. Les actes sont relus dans l'ordre
 * de l'intention, sans être joués : rien ne change à l'état, et une intention
 * qui vise une case aujourd'hui inaccessible ne trace rien pour ce pas.
 *
 * LIMITE : une figure, lue sur l'échiquier tel qu'il est — comme l'annonce
 * elle-même (`ia.ts`, LIMITE sur l'annonce). Le joueur la rend fausse en
 * jouant, et c'est le but.
 */

import { chemin } from "./grille.ts";
import { pas, vivante } from "./unite.ts";
import type { Case, EtatBataille } from "./types.ts";

export type Trait = {
  readonly unite: number;
  readonly genre: "pas" | "coup";
  readonly de: Case;
  readonly a: Case;
};

export function traitsDe(etat: EtatBataille): Trait[] {
  const out: Trait[] = [];
  const vivantes = etat.unites.filter(vivante);
  for (const intention of etat.intentions) {
    const u = vivantes.find((x) => x.id === intention.unite);
    if (u === undefined) continue;
    let ici: Case = { x: u.pos.x, y: u.pos.y };
    for (const acte of intention.actes) {
      if (acte.geste === "deplacer") {
        const suite = chemin(etat.obstacles, vivantes, { ...u, pos: ici }, acte.vers, pas(u));
        let de = ici;
        for (const a of suite) {
          out.push({ unite: u.id, genre: "pas", de, a });
          de = a;
        }
        if (suite.length > 0) ici = suite[suite.length - 1]!;
      } else if (acte.geste === "frapper") {
        const cible = vivantes.find((x) => x.id === acte.cible);
        if (cible === undefined) continue;
        out.push({ unite: u.id, genre: "coup", de: ici, a: { x: cible.pos.x, y: cible.pos.y } });
      }
    }
  }
  return out;
}
