import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Combat } from "../combat.ts";
import {
  accessibles,
  campAdverse,
  casesAPortee,
  casesDe,
  chemin,
  cible,
  cle,
  dansGrille,
  depuisCle,
  distance,
  estDeDos,
  estObstacle,
  memeCase,
  occupantDe,
  voisines,
  zoneDeControle,
} from "./grille.ts";
import {
  GRILLE_N,
  PA_PAR_TOUR,
  type Camp,
  type Case,
  type Unite,
} from "./types.ts";

/** Axes d'essai : somme 64, quatre parts égales. On teste la grille, pas le mot. */
const AXES: Combat = {
  lame: 16,
  ecu: 16,
  eperon: 16,
  arc: 16,
  somme: 64,
  pointe: "lame",
};

function u(id: number, camp: Camp, x: number, y: number, tenue = 8): Unite {
  return {
    id,
    camp,
    precedente: null,
    elan: 0,
    mot: 0,
    archetype: "mars",
    age: "Satya",
    classe: "arme",
    axes: AXES,
    pos: { x, y },
    tenue,
    pa: PA_PAR_TOUR,
  };
}

function dalleSi(plein: (x: number, y: number) => boolean): boolean[][] {
  const m: boolean[][] = [];
  for (let y = 0; y < GRILLE_N; y++) {
    const ligne: boolean[] = [];
    for (let x = 0; x < GRILLE_N; x++) ligne.push(plein(x, y));
    m.push(ligne);
  }
  return m;
}

const VIDE = dalleSi(() => false);
/** Un couloir d'une case de large sur la ligne 4, le reste plein. */
const COULOIR = dalleSi((_x, y) => y !== 4);

describe("grille", () => {
  it("distance de Manhattan : nulle sur soi, symétrique, sans diagonale", () => {
    const a: Case = { x: 1, y: 2 };
    const b: Case = { x: 4, y: 6 };
    assert.equal(distance(a, a), 0);
    assert.equal(distance(a, b), 7);
    assert.equal(distance(b, a), 7);
    // La diagonale coûte deux pas : c'est tout le sens du choix orthogonal.
    assert.equal(distance({ x: 3, y: 3 }, { x: 4, y: 4 }), 2);
    assert.equal(campAdverse("coffre"), "indechiffre");
    assert.equal(campAdverse("indechiffre"), "coffre");
  });

  it("dansGrille et memeCase : la dalle, ses bords, et rien d'autre", () => {
    assert.equal(dansGrille({ x: 0, y: 0 }), true);
    assert.equal(dansGrille({ x: 8, y: 8 }), true);
    assert.equal(dansGrille({ x: -1, y: 0 }), false);
    assert.equal(dansGrille({ x: 0, y: 9 }), false);
    assert.equal(dansGrille({ x: 9, y: 0 }), false);
    // Une case n'est pas un flottant : un demi-pas n'existe pas.
    assert.equal(dansGrille({ x: 1.5, y: 0 }), false);
    assert.equal(memeCase({ x: 1, y: 2 }, { x: 1, y: 2 }), true);
    assert.equal(memeCase({ x: 1, y: 2 }, { x: 2, y: 1 }), false);
    assert.equal(cle({ x: 3, y: 7 }), "3,7");
  });

  it("voisines : quatre au centre, trois au bord, deux au coin, ordre N E S O", () => {
    assert.deepEqual(voisines({ x: 4, y: 4 }), [
      { x: 4, y: 3 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
      { x: 3, y: 4 },
    ]);
    assert.deepEqual(voisines({ x: 0, y: 4 }), [
      { x: 0, y: 3 },
      { x: 1, y: 4 },
      { x: 0, y: 5 },
    ]);
    assert.deepEqual(voisines({ x: 0, y: 0 }), [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]);
    assert.deepEqual(voisines({ x: 8, y: 8 }), [
      { x: 8, y: 7 },
      { x: 7, y: 8 },
    ]);
  });

  it("estObstacle : la case pleine, la case libre, le hors-dalle qui vaut plein", () => {
    const d = dalleSi((x, y) => x === 2 && y === 3);
    assert.equal(estObstacle(d, { x: 2, y: 3 }), true);
    assert.equal(estObstacle(d, { x: 3, y: 2 }), false);
    assert.equal(estObstacle(d, { x: -1, y: 0 }), true);
    assert.equal(estObstacle(d, { x: 0, y: 9 }), true);
  });

  it("occupantDe : la vivante tient la case, la retirée ne tient rien", () => {
    const unites = [u(0, "coffre", 1, 1), u(1, "indechiffre", 2, 2, 0)];
    assert.equal(occupantDe(unites, { x: 1, y: 1 })?.id, 0);
    assert.equal(occupantDe(unites, { x: 2, y: 2 }), null);
    assert.equal(occupantDe(unites, { x: 5, y: 5 }), null);
  });

  it("zoneDeControle : les orthogonales de l'adversaire, sans doublon ni mort", () => {
    const unites = [
      u(0, "indechiffre", 4, 4),
      u(1, "indechiffre", 5, 4),
      u(2, "indechiffre", 0, 0, 0),
      u(3, "coffre", 8, 8),
    ];
    assert.deepEqual(zoneDeControle(unites, "coffre"), [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
      { x: 5, y: 4 },
      { x: 6, y: 4 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
    ]);
    // La retirée ne tient plus rien : ses orthogonales sont absentes.
    assert.equal(
      zoneDeControle(unites, "coffre").some((c) => memeCase(c, { x: 0, y: 1 })),
      false,
    );
    assert.deepEqual(zoneDeControle(unites, "indechiffre"), [
      { x: 8, y: 7 },
      { x: 7, y: 8 },
    ]);
  });

  it("accessibles : le contour exact d'une dalle vide", () => {
    const m = u(0, "coffre", 4, 4);
    assert.equal(accessibles(VIDE, [m], m, 0).size, 1);
    // 1 + 4 + 8 = 13 cases à deux pas du centre ; 1 + 4 + 8 + 12 + 16 = 41 à quatre.
    assert.equal(accessibles(VIDE, [m], m, 2).size, 13);
    assert.equal(accessibles(VIDE, [m], m, 4).size, 41);
    const carte = accessibles(VIDE, [m], m, 4);
    assert.equal(carte.get("4,4"), 0);
    assert.equal(carte.get("6,4"), 2);
    assert.equal(carte.get("8,4"), 4);
    // Cinq pas de distance : hors du contour.
    assert.equal(carte.has("8,5"), false);
    // La même carte lue en cases, en ordre de lecture.
    const lues = casesDe(carte);
    assert.equal(lues.length, 41);
    assert.deepEqual(lues[0], { x: 4, y: 0 });
    assert.deepEqual(depuisCle("3,7"), { x: 3, y: 7 });
  });

  it("accessibles : un obstacle ne se traverse pas", () => {
    const mur = dalleSi((x) => x === 3);
    const m = u(0, "coffre", 0, 4);
    const carte = accessibles(mur, [m], m, 16);
    // Trois colonnes libres de neuf cases, et rien au-delà du mur.
    assert.equal(carte.size, 27);
    assert.equal(carte.has("3,4"), false);
    assert.equal(carte.has("4,4"), false);
    assert.equal(carte.get("2,0"), 6);
  });

  it("accessibles : une unité vivante bloque, une unité retirée non", () => {
    const m = u(0, "coffre", 0, 4);
    const allie = u(1, "coffre", 3, 4);
    const vivante = accessibles(COULOIR, [m, allie], m, 8);
    assert.equal(vivante.size, 3);
    assert.equal(vivante.has("3,4"), false);
    const mort = accessibles(COULOIR, [m, u(1, "coffre", 3, 4, 0)], m, 8);
    assert.equal(mort.size, 9);
    assert.equal(mort.get("8,4"), 8);
  });

  it("zone de contrôle : on y entre, on n'en repart pas", () => {
    // Couloir sur la ligne 4, plus la case (4,3) où se tient l'Indéchiffré.
    const d = dalleSi((x, y) => y !== 4 && !(x === 4 && y === 3));
    const m = u(0, "coffre", 0, 4);
    const garde = u(1, "indechiffre", 4, 3);
    const carte = accessibles(d, [m, garde], m, 8);
    assert.equal(carte.get("4,4"), 4);
    assert.equal(carte.has("5,4"), false);
    assert.equal(carte.size, 5);
    assert.deepEqual(chemin(d, [m, garde], m, { x: 8, y: 4 }, 8), []);
    // Sans le garde, le couloir se traverse en huit pas : c'est bien lui qui arrête.
    assert.equal(chemin(d, [m], m, { x: 8, y: 4 }, 8).length, 8);
  });

  it("zone de contrôle : la case de départ ne retient pas, on se dégage", () => {
    const d = dalleSi((x, y) => y !== 4 && !(x === 0 && y === 3));
    const m = u(0, "coffre", 0, 4);
    const garde = u(1, "indechiffre", 0, 3);
    const carte = accessibles(d, [m, garde], m, 8);
    assert.equal(carte.get("1,4"), 1);
    assert.equal(carte.get("8,4"), 8);
    assert.equal(carte.size, 9);
  });

  it("chemin : le même chemin à chaque appel, cinquante fois de suite", () => {
    const m = u(0, "coffre", 0, 0);
    const attendu = [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
    ];
    for (let k = 0; k < 50; k++) {
      assert.deepEqual(chemin(VIDE, [m], m, { x: 3, y: 3 }, 6), attendu);
    }
  });

  it("chemin : contourne un mur par la seule ouverture", () => {
    const mur = dalleSi((x, y) => x === 4 && y < 8);
    const m = u(0, "coffre", 3, 4);
    const p = chemin(mur, [m], m, { x: 5, y: 4 }, 16);
    assert.equal(p.length, 10);
    assert.deepEqual(p[p.length - 1], { x: 5, y: 4 });
    assert.equal(
      p.some((c) => memeCase(c, { x: 4, y: 8 })),
      true,
    );
    assert.equal(
      p.some((c) => c.x === 4 && c.y !== 8),
      false,
    );
  });

  it("chemin : rien à rendre — trop loin, occupée, pleine, ou déjà sous les pieds", () => {
    const m = u(0, "coffre", 0, 0);
    assert.deepEqual(chemin(VIDE, [m], m, { x: 5, y: 5 }, 2), []);
    const garde = u(1, "indechiffre", 2, 0);
    assert.deepEqual(chemin(VIDE, [m, garde], m, { x: 2, y: 0 }, 5), []);
    const d = dalleSi((x, y) => x === 1 && y === 1);
    assert.deepEqual(chemin(d, [m], m, { x: 1, y: 1 }, 5), []);
    assert.deepEqual(chemin(VIDE, [m], m, { x: 0, y: 0 }, 5), []);
  });

  it("casesAPortee : quatre à portée 1, douze à portée 2, tronquée au coin", () => {
    assert.deepEqual(casesAPortee({ x: 4, y: 4 }, 1), [
      { x: 4, y: 3 },
      { x: 3, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 5 },
    ]);
    assert.equal(casesAPortee({ x: 4, y: 4 }, 2).length, 12);
    assert.deepEqual(casesAPortee({ x: 0, y: 0 }, 2), [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ]);
    assert.deepEqual(casesAPortee({ x: 4, y: 4 }, 0), []);
  });

  it("cible : le camp d'en face, à portée, par id croissant", () => {
    const att = u(9, "coffre", 4, 4);
    const unites = [
      u(5, "indechiffre", 4, 6),
      u(2, "indechiffre", 4, 5),
      u(7, "indechiffre", 5, 4, 0),
      u(1, "coffre", 3, 4),
      att,
    ];
    assert.deepEqual(
      cible(unites, att, 2).map((c) => c.id),
      [2, 5],
    );
    assert.deepEqual(
      cible(unites, att, 1).map((c) => c.id),
      [2],
    );
    assert.deepEqual(cible(unites, att, 0), []);
  });

  it("estDeDos : dans l'axe de la marche, jamais de face ni de flanc", () => {
    // Le défenseur vient de (4,4) et se tient en (4,3) : il regarde vers (4,4).
    const def = u(1, "indechiffre", 4, 3);
    const venue: Case = { x: 4, y: 4 };
    assert.equal(estDeDos(u(0, "coffre", 4, 2), def, venue), true);
    assert.equal(estDeDos(u(0, "coffre", 4, 0), def, venue), true);
    // De face : l'attaquant est du côté de la case quittée.
    assert.equal(estDeDos(u(0, "coffre", 4, 5), def, venue), false);
    assert.equal(estDeDos(u(0, "coffre", 4, 4), def, venue), false);
    // De flanc : rien n'est aligné.
    assert.equal(estDeDos(u(0, "coffre", 3, 3), def, venue), false);
    assert.equal(estDeDos(u(0, "coffre", 5, 3), def, venue), false);
    // Le défenseur n'a pas bougé : il regarde partout.
    assert.equal(estDeDos(u(0, "coffre", 4, 2), def, { x: 4, y: 3 }), false);
    // Sans souvenir de déplacement, pas de dos.
    assert.equal(estDeDos(u(0, "coffre", 4, 2), def, { x: -1, y: -1 }), false);
  });

  it("doit échouer : pas négatif, portée négative, case hors dalle, dalle difforme", () => {
    const m = u(0, "coffre", 4, 4);
    assert.throws(() => accessibles(VIDE, [m], m, -1), {
      name: "RejetTactique",
      message: /pas -1 au lieu d'un entier de 0 ou plus/,
    });
    assert.throws(() => chemin(VIDE, [m], m, { x: 4, y: 5 }, 1.5), {
      name: "RejetTactique",
      message: /pas 1.5 au lieu/,
    });
    assert.throws(() => casesAPortee({ x: 4, y: 4 }, -2), {
      name: "RejetTactique",
      message: /portée -2 au lieu/,
    });
    assert.throws(() => cible([], m, -1), {
      name: "RejetTactique",
      message: /portée -1 au lieu/,
    });
    assert.throws(() => chemin(VIDE, [m], m, { x: 9, y: 4 }, 3), {
      name: "RejetTactique",
      message: /case visée \(9,4\) hors de la dalle 9×9/,
    });
    assert.throws(() => voisines({ x: 9, y: 0 }), {
      name: "RejetTactique",
      message: /hors de la dalle 9×9/,
    });
    assert.throws(() => accessibles(VIDE.slice(0, 8), [m], m, 3), {
      name: "RejetTactique",
      message: /dalle de 8 lignes au lieu de 9/,
    });
    const difforme = VIDE.map((l, y) => (y === 3 ? l.slice(0, 8) : l));
    assert.throws(() => accessibles(difforme, [m], m, 3), {
      name: "RejetTactique",
      message: /ligne 3 de 8 cases au lieu de 9/,
    });
    assert.throws(() => depuisCle("9,9"), {
      name: "RejetTactique",
      message: /clé "9,9" au lieu de "x,y" dans la dalle/,
    });
    assert.throws(() => depuisCle("44"), {
      name: "RejetTactique",
      message: /clé "44" au lieu de/,
    });
  });
});
