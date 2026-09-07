/**
 * L'arbre de feuilles à l'écran — la géométrie d'un arbre binaire complet et
 * l'état de chaque feuille, lus dans une veillée (veillee.ts). Bible §2.4 et §7.
 *
 * L'arbre XMSS d'une veillée a 2^h feuilles (h = 6 : soixante-quatre) ; on le
 * dessine comme l'arbre de Merkle qu'il est : les feuilles en bas, d'indice 0
 * à 2^h − 1 de gauche à droite, la racine en haut, chaque nœud interne au
 * milieu de ses deux enfants. `geometrieArbre` rend les 2^(h+1) − 1 nœuds,
 * niveau par niveau depuis les feuilles ; `indexNoeud` retrouve un nœud dans
 * cette liste.
 *
 * L'état d'une feuille se lit dans les gestes : la feuille i est **brûlée** si
 * i < gestes.length (elle a signé le geste i), **dernière** si c'est la
 * dernière brûlée, **vive** sinon. Le **chemin d'authentification** de la
 * feuille i est la suite des frères remontés : au niveau k, le nœud d'indice
 * (i >> k) ^ 1 — exactement ce que porte `sig.chemin` du geste i, hachage
 * par hachage — et les ancêtres (i >> k) jusqu'à la racine. `detailGeste`
 * traduit l'argument d'un geste en ce qu'il désigne (choix et objet porté,
 * hôte, case ou alcôve, occupant) pour la légende.
 *
 * LIMITE : une lecture pour l'écran. Rien ici ne vérifie une signature ; ce
 * que l'arbre dessine se juge par `jugerVeillee`, jamais par sa figure. L'état
 * d'une feuille se lit à la position du geste dans la liste, pas à son
 * `sig.indice` : une preuve étrangère mal formée (indices en désordre, plus de
 * gestes que de feuilles) se dessine faux et se juge refusée. Les positions
 * sont en unités de boîte SVG, sans rapport avec un pixel.
 */

import { CHOIX, type Choix } from "./pendule.ts";
import { DALLE_N, ETAGES } from "./tour.ts";
import { ARG_ALCOVE } from "./veillee-tour.ts";
import { HAUTEUR_VEILLEE, type Geste, type GesteSigne, type Veillee } from "./veillee.ts";

export type Boite = { largeur: number; hauteur: number; marge: number };
/** La boîte par défaut : 640 × 180, une marge de 12 pour la racine et les feuilles. */
export const BOITE_ARBRE: Boite = { largeur: 640, hauteur: 180, marge: 12 };

export type RefNoeud = { niveau: number; indice: number };
/** niveau 0 = feuilles … niveau h = racine ; indice de gauche à droite dans le niveau. */
export type Noeud = RefNoeud & { x: number; y: number };

function hauteurValide(h: number): void {
  if (!Number.isInteger(h) || h < 1 || h > 20) throw new Error("hauteur 1..20");
}

/** Position dans la liste de `geometrieArbre` : les 2^h feuilles d'abord, puis chaque niveau. */
export function indexNoeud(h: number, niveau: number, indice: number): number {
  hauteurValide(h);
  if (!Number.isInteger(niveau) || niveau < 0 || niveau > h) throw new Error("niveau hors de l'arbre");
  if (!Number.isInteger(indice) || indice < 0 || indice >= 1 << (h - niveau)) throw new Error("indice hors du niveau");
  return (1 << (h + 1)) - (1 << (h - niveau + 1)) + indice;
}

/** Les 2^(h+1) − 1 nœuds d'un arbre binaire complet dans la boîte, feuilles en bas, racine en haut. */
export function geometrieArbre(h = HAUTEUR_VEILLEE, boite: Boite = BOITE_ARBRE): Noeud[] {
  hauteurValide(h);
  const { largeur, hauteur, marge } = boite;
  const utile = largeur - 2 * marge;
  const pas = (hauteur - 2 * marge) / h;
  const noeuds: Noeud[] = [];
  for (let niveau = 0; niveau <= h; niveau++) {
    const n = 1 << (h - niveau);
    const y = hauteur - marge - niveau * pas;
    for (let indice = 0; indice < n; indice++) {
      noeuds.push({ niveau, indice, x: marge + ((indice + 0.5) * utile) / n, y });
    }
  }
  return noeuds;
}

/** Le parent d'un nœud ; null pour la racine. */
export function parentDe(n: RefNoeud, h = HAUTEUR_VEILLEE): RefNoeud | null {
  if (n.niveau >= h) return null;
  return { niveau: n.niveau + 1, indice: n.indice >> 1 };
}

export type Chemin = {
  /** les h frères remontés depuis la feuille : ce que `sig.chemin` porte, niveau par niveau */
  freres: RefNoeud[];
  /** les h ancêtres, du parent à la racine */
  ancetres: RefNoeud[];
};

/** Le chemin d'authentification de la feuille i : au niveau k, le frère (i >> k) ^ 1. */
export function cheminAuthentification(i: number, h = HAUTEUR_VEILLEE): Chemin {
  hauteurValide(h);
  if (!Number.isInteger(i) || i < 0 || i >= 1 << h) throw new Error("feuille hors de l'arbre");
  const freres: RefNoeud[] = [];
  const ancetres: RefNoeud[] = [];
  for (let k = 0; k < h; k++) {
    freres.push({ niveau: k, indice: (i >> k) ^ 1 });
    ancetres.push({ niveau: k + 1, indice: i >> (k + 1) });
  }
  return { freres, ancetres };
}

// ---------------------------------------------------------------------------
// L'état des feuilles, lu dans la veillée
// ---------------------------------------------------------------------------
export type EtatFeuille = "vive" | "brulee" | "derniere";

type Lue = Pick<Veillee, "gestes" | "hauteur">;

/** brûlée : a signé le geste i ; dernière : la dernière brûlée ; vive : rien signé. */
export function etatFeuille(v: Lue, i: number): EtatFeuille {
  hauteurValide(v.hauteur);
  if (!Number.isInteger(i) || i < 0 || i >= 1 << v.hauteur) throw new Error("feuille hors de l'arbre");
  const n = v.gestes.length;
  if (i >= n) return "vive";
  return i === n - 1 ? "derniere" : "brulee";
}

/** Les 2^h états, de la feuille 0 à la dernière ; une hauteur hors de 1..20 est refusée. */
export function etatsFeuilles(v: Lue): EtatFeuille[] {
  hauteurValide(v.hauteur);
  const etats: EtatFeuille[] = [];
  for (let i = 0; i < 1 << v.hauteur; i++) etats.push(etatFeuille(v, i));
  return etats;
}

/** L'indice de la dernière feuille brûlée ; null quand rien n'a signé. */
export function derniereFeuille(v: Pick<Veillee, "gestes">): number | null {
  return v.gestes.length > 0 ? v.gestes.length - 1 : null;
}

/** Le chemin d'authentification du dernier geste ; null quand rien n'a signé. */
export function dernierChemin(v: Lue): Chemin | null {
  const i = derniereFeuille(v);
  return i === null ? null : cheminAuthentification(i, v.hauteur);
}

/** Le geste signé par la feuille i ; null pour une feuille vive. */
export function gesteDeFeuille(v: Pick<Veillee, "gestes">, i: number): GesteSigne | null {
  return v.gestes[i] ?? null;
}

// ---------------------------------------------------------------------------
// Ce qu'un geste désigne, pour la légende
// ---------------------------------------------------------------------------
export type DetailGeste =
  | { genre: "choix"; choix: Choix; mot: number }
  | { genre: "hote"; etage: number }
  | { genre: "case"; x: number; y: number }
  | { genre: "alcove" }
  | { genre: "occupant"; k: number };

/** franchir : le choix et l'objet porté ; parler : l'hôte ; ouvrir : la case ou l'alcôve ; prendre : l'occupant.
 *  Un choix, un étage ou une case hors borne sont refusés : la légende dit alors l'argument nu. */
export function detailGeste(g: Pick<Geste, "g" | "arg" | "mot">): DetailGeste {
  switch (g.g) {
    case "franchir": {
      const choix = CHOIX[g.arg];
      if (!choix) throw new Error(`choix ${g.arg} inconnu`);
      return { genre: "choix", choix, mot: g.mot };
    }
    case "parler":
      if (!Number.isInteger(g.arg) || g.arg < 0 || g.arg >= ETAGES) throw new Error(`étage ${g.arg} hors de la Tour`);
      return { genre: "hote", etage: g.arg };
    case "ouvrir":
      if (g.arg === ARG_ALCOVE) return { genre: "alcove" };
      if (g.arg < 0 || g.arg >= ARG_ALCOVE) throw new Error(`case ${g.arg} hors de la dalle`);
      return { genre: "case", x: Math.floor(g.arg / DALLE_N), y: g.arg % DALLE_N };
    case "prendre":
      return { genre: "occupant", k: g.arg };
  }
}
