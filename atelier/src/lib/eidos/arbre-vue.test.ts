import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { hexOf } from "./hash.ts";
import { parserTeteReseau } from "./temoin.ts";
import { DALLE_N, ETAGES } from "./tour.ts";
import { ARG_ALCOVE } from "./veillee-tour.ts";
import {
  FEUILLES,
  HAUTEUR_VEILLEE,
  construireArbre,
  feuillesRestantes,
  graineArbre,
  ouvrirVeillee,
  signerGeste,
  type Veillee,
} from "./veillee.ts";
import {
  BOITE_ARBRE,
  cheminAuthentification,
  dernierChemin,
  derniereFeuille,
  detailGeste,
  etatFeuille,
  etatsFeuilles,
  geometrieArbre,
  gesteDeFeuille,
  indexNoeud,
  parentDe,
} from "./arbre-vue.ts";

type TeteBrute = Record<string, unknown>;
const VEC = JSON.parse(readFileSync(new URL("../../../../vecteurs.json", import.meta.url), "utf8")) as {
  veillee: { veille: TeteBrute; premier_du_jour: TeteBrute };
};

function tete(raw: TeteBrute) {
  const t = parserTeteReseau(raw);
  if ("erreur" in t) throw new Error(t.erreur);
  return t;
}
const veille = tete(VEC.veillee.veille);
const jour = tete(VEC.veillee.premier_du_jour);
// une veillée libre : les mêmes salles, le même arbre, aucune pièce — il suffit pour lire l'arbre
const arbre = construireArbre(graineArbre("coffre-de-test", jour.idBloc, null));

function ouvrir(): Veillee {
  const v = ouvrirVeillee(arbre, jour, veille, null);
  if ("erreur" in v) throw new Error(v.erreur);
  return v;
}

function signer(v: Veillee, geste: { g: "franchir" | "parler" | "ouvrir" | "prendre"; arg: number; mot?: number }): Veillee {
  const r = signerGeste(v, arbre, geste);
  if ("erreur" in r) throw new Error(r.erreur);
  return r;
}

describe("la géométrie : un arbre binaire complet, feuilles en bas, racine en haut", () => {
  it("h = 6 : 127 nœuds, 64 feuilles strictement croissantes en x, chaque parent au milieu de ses enfants", () => {
    const noeuds = geometrieArbre();
    assert.equal(noeuds.length, 127);
    const feuilles = noeuds.filter((n) => n.niveau === 0);
    assert.equal(feuilles.length, FEUILLES);
    for (let i = 0; i < feuilles.length; i++) {
      const f = feuilles[i]!;
      assert.equal(f.indice, i);
      assert.equal(noeuds[indexNoeud(HAUTEUR_VEILLEE, 0, i)], f, "indexNoeud retrouve la feuille");
      if (i > 0) assert.ok(f.x > feuilles[i - 1]!.x, `feuille ${i} à droite de la ${i - 1}`);
      assert.ok(f.x > BOITE_ARBRE.marge && f.x < BOITE_ARBRE.largeur - BOITE_ARBRE.marge);
    }
    const racines = noeuds.filter((n) => n.niveau === HAUTEUR_VEILLEE);
    assert.equal(racines.length, 1);
    assert.equal(noeuds[noeuds.length - 1], racines[0], "la racine ferme la liste");
    assert.equal(racines[0]!.y, BOITE_ARBRE.marge, "la racine en haut");
    assert.equal(feuilles[0]!.y, BOITE_ARBRE.hauteur - BOITE_ARBRE.marge, "les feuilles en bas");
    for (const n of noeuds) {
      if (n.niveau === 0) continue;
      const g = noeuds[indexNoeud(HAUTEUR_VEILLEE, n.niveau - 1, 2 * n.indice)]!;
      const d = noeuds[indexNoeud(HAUTEUR_VEILLEE, n.niveau - 1, 2 * n.indice + 1)]!;
      assert.ok(Math.abs(n.x - (g.x + d.x) / 2) < 1e-9, `nœud ${n.niveau}/${n.indice} au milieu`);
      assert.ok(n.y < g.y, "un niveau plus haut");
      assert.deepEqual(parentDe(g), { niveau: n.niveau, indice: n.indice });
      assert.deepEqual(parentDe(d), { niveau: n.niveau, indice: n.indice });
    }
    assert.equal(parentDe(racines[0]!), null);
  });

  it("h = 4 : 31 nœuds ; h = 1 : deux feuilles et la racine ; une hauteur hors de 1..20, un niveau ou un indice hors de l'arbre sont refusés", () => {
    const petit = geometrieArbre(4);
    assert.equal(petit.length, 31);
    assert.equal(petit.filter((n) => n.niveau === 0).length, 16);
    assert.equal(indexNoeud(4, 4, 0), 30);
    const minime = geometrieArbre(1);
    assert.equal(minime.length, 3);
    assert.equal(indexNoeud(1, 1, 0), 2);
    assert.equal(minime[2]!.y, BOITE_ARBRE.marge, "la racine en haut, même à h = 1");
    assert.ok(Math.abs(minime[2]!.x - (minime[0]!.x + minime[1]!.x) / 2) < 1e-9);
    assert.deepEqual(cheminAuthentification(0, 1), { freres: [{ niveau: 0, indice: 1 }], ancetres: [{ niveau: 1, indice: 0 }] });
    assert.deepEqual(etatsFeuilles({ gestes: [], hauteur: 1 }), ["vive", "vive"]);
    assert.throws(() => etatsFeuilles({ gestes: [], hauteur: 0 }), /hauteur/, "une hauteur nulle ne dessine pas une feuille en silence");
    assert.throws(() => etatsFeuilles({ gestes: [], hauteur: 30 }), /hauteur/, "une hauteur de preuve étrangère ne boucle pas un milliard de fois");
    assert.throws(() => etatFeuille({ gestes: [], hauteur: 21 }, 0), /hauteur/);
    assert.throws(() => geometrieArbre(0), /hauteur/);
    assert.throws(() => geometrieArbre(21), /hauteur/);
    assert.throws(() => geometrieArbre(2.5), /hauteur/);
    assert.throws(() => indexNoeud(4, 5, 0), /niveau/);
    assert.throws(() => indexNoeud(4, 0, 16), /indice/);
    assert.throws(() => indexNoeud(4, 3, 2), /indice/);
  });
});

describe("le chemin d'authentification : les frères remontés, ce que la signature porte", () => {
  it("longueur h, frère (i >> k) ^ 1 au niveau k, ancêtres jusqu'à la racine, et les hachages de sig.chemin", () => {
    const c0 = cheminAuthentification(0);
    assert.equal(c0.freres.length, HAUTEUR_VEILLEE);
    assert.equal(c0.ancetres.length, HAUTEUR_VEILLEE);
    assert.deepEqual(
      c0.freres.map((f) => f.indice),
      [1, 1, 1, 1, 1, 1],
    );
    assert.deepEqual(c0.ancetres[HAUTEUR_VEILLEE - 1], { niveau: HAUTEUR_VEILLEE, indice: 0 });
    const c37 = cheminAuthentification(37);
    assert.deepEqual(
      c37.freres.map((f) => f.indice),
      [36, 19, 8, 5, 3, 0],
    );
    assert.deepEqual(
      c37.ancetres.map((a) => a.indice),
      [18, 9, 4, 2, 1, 0],
    );
    for (let k = 0; k < HAUTEUR_VEILLEE; k++) {
      assert.equal(c37.freres[k]!.niveau, k);
      assert.deepEqual(parentDe(c37.freres[k]!), c37.ancetres[k]);
    }
    // le chemin dessiné est celui de la signature : frère par frère, le hachage de l'arbre
    let v = ouvrir();
    for (let k = 0; k < 6; k++) v = signer(v, { g: "ouvrir", arg: k });
    const i = derniereFeuille(v)!;
    assert.equal(i, 5);
    const chemin = dernierChemin(v)!;
    const g = gesteDeFeuille(v, i)!;
    assert.equal(g.sig.chemin.length, HAUTEUR_VEILLEE);
    chemin.freres.forEach((f, k) => {
      assert.equal(g.sig.chemin[k], hexOf(arbre.niveaux[f.niveau]![f.indice]!), `frère au niveau ${k}`);
    });
    assert.equal(v.racine, hexOf(arbre.niveaux[HAUTEUR_VEILLEE]![0]!), "la racine annotée est celle de l'arbre");
    assert.throws(() => cheminAuthentification(FEUILLES), /hors de l'arbre/);
    assert.throws(() => cheminAuthentification(-1), /hors de l'arbre/);
    assert.throws(() => cheminAuthentification(3, 0), /hauteur/);
  });
});

describe("l'état des feuilles, lu dans une veillée du vecteur", () => {
  it("sans geste : tout est vif, pas de dernière ; quatre gestes : 0..2 brûlées, 3 dernière, 4..63 vives", () => {
    const v0 = ouvrir();
    assert.ok(etatsFeuilles(v0).every((e) => e === "vive"));
    assert.equal(derniereFeuille(v0), null);
    assert.equal(dernierChemin(v0), null);
    assert.equal(gesteDeFeuille(v0, 0), null);

    let v = signer(v0, { g: "parler", arg: 0 });
    v = signer(v, { g: "franchir", arg: 0, mot: 1000 });
    v = signer(v, { g: "franchir", arg: 1, mot: 1001 });
    v = signer(v, { g: "ouvrir", arg: 5 * DALLE_N + 4 });
    const etats = etatsFeuilles(v);
    assert.equal(etats.length, FEUILLES);
    assert.deepEqual(etats.slice(0, 5), ["brulee", "brulee", "brulee", "derniere", "vive"]);
    assert.equal(etats.filter((e) => e === "vive").length, feuillesRestantes(v));
    assert.equal(etats.filter((e) => e !== "vive").length, v.gestes.length);
    assert.equal(derniereFeuille(v), 3);
    assert.equal(etatFeuille(v, FEUILLES - 1), "vive");
    // cliquer une feuille montre le geste qu'elle a signé, avec son étape et son étage lus du parcours
    const g1 = gesteDeFeuille(v, 1)!;
    assert.equal(g1.g, "franchir");
    assert.equal(g1.i, 1);
    assert.equal(g1.etape, 0);
    assert.equal(g1.etage, 0);
    const g3 = gesteDeFeuille(v, 3)!;
    assert.equal(g3.g, "ouvrir");
    assert.equal(g3.etape, 2, "après deux franchir, la troisième salle");
    assert.ok(g3.etage > 0);
    assert.equal(gesteDeFeuille(v, 4), null, "une feuille vive n'a rien signé");
    assert.throws(() => etatFeuille(v, FEUILLES), /hors de l'arbre/);
    assert.throws(() => etatFeuille(v, -1), /hors de l'arbre/);
  });

  it("l'arbre nu : 64 gestes, tout est brûlé, la 63ᵉ est la dernière, zéro restante", () => {
    let v = ouvrir();
    for (let k = 0; k < FEUILLES; k++) v = signer(v, { g: k % 2 ? "prendre" : "ouvrir", arg: k });
    assert.equal(v.fin, "epuise");
    const etats = etatsFeuilles(v);
    assert.equal(etats.filter((e) => e === "vive").length, 0);
    assert.equal(etats[FEUILLES - 1], "derniere");
    assert.equal(etats.filter((e) => e === "brulee").length, FEUILLES - 1);
    assert.equal(feuillesRestantes(v), 0);
    assert.deepEqual(dernierChemin(v)!.freres.map((f) => f.indice), [62, 30, 14, 6, 2, 0]);
  });
});

describe("la légende : ce que l'argument d'un geste désigne", () => {
  it("choix et objet porté, hôte, case (x, y), alcôve, occupant ; un choix, un étage ou une case hors borne sont refusés", () => {
    assert.deepEqual(detailGeste({ g: "franchir", arg: 0, mot: 1000 }), { genre: "choix", choix: "monter", mot: 1000 });
    assert.deepEqual(detailGeste({ g: "franchir", arg: 2, mot: 7 }), { genre: "choix", choix: "offrir", mot: 7 });
    assert.deepEqual(detailGeste({ g: "parler", arg: 41, mot: 0 }), { genre: "hote", etage: 41 });
    assert.deepEqual(detailGeste({ g: "ouvrir", arg: 5 * DALLE_N + 4, mot: 0 }), { genre: "case", x: 5, y: 4 });
    assert.deepEqual(detailGeste({ g: "ouvrir", arg: 0, mot: 0 }), { genre: "case", x: 0, y: 0 });
    assert.deepEqual(detailGeste({ g: "ouvrir", arg: ARG_ALCOVE, mot: 0 }), { genre: "alcove" });
    assert.deepEqual(detailGeste({ g: "prendre", arg: 3, mot: 0 }), { genre: "occupant", k: 3 });
    assert.deepEqual(detailGeste({ g: "parler", arg: ETAGES - 1, mot: 0 }), { genre: "hote", etage: ETAGES - 1 });
    assert.throws(() => detailGeste({ g: "franchir", arg: 3, mot: 0 }), /choix/);
    assert.throws(() => detailGeste({ g: "parler", arg: ETAGES, mot: 0 }), /Tour/);
    assert.throws(() => detailGeste({ g: "ouvrir", arg: ARG_ALCOVE + 1, mot: 0 }), /dalle/);
  });
});
