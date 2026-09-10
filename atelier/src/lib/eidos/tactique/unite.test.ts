import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { COMBAT_BUDGET } from "../combat.ts";
import { concat, sha256d, u32, utf8 } from "../hash.ts";
import { objetDepuisGraine } from "../objets.ts";
import {
  DIV_PAS,
  DIV_PORTEE,
  MULT_TENUE,
  PAS_BASE,
  PORTEE_BASE,
  TENUE_BASE,
  aDesPa,
  depenser,
  deplacer,
  poser,
  encaisser,
  nouveauTour,
  pas,
  portee,
  reprendre,
  tenueMax,
  terminerTour,
  uniteDepuisObjet,
  vivante,
} from "./unite.ts";
import {
  COUP_BASE,
  PA_DEPLACER,
  PA_FRAPPER,
  PA_PAR_TOUR,
  RejetTactique,
  type Unite,
} from "./types.ts";

const GRAINE = sha256d(utf8("eidos-tactique-genese"));

function genese(): Unite {
  return uniteDepuisObjet(
    objetDepuisGraine(GRAINE, "Satya"),
    0,
    "coffre",
    { x: 4, y: 4 },
    "arme",
  );
}

/** Deux cents mots tirés de graines successives. Rien de tiré au sort. */
function cohorte(n: number): Unite[] {
  const out: Unite[] = [];
  for (let i = 0; i < n; i++) {
    const g = sha256d(concat(GRAINE, u32(i)));
    out.push(
      uniteDepuisObjet(objetDepuisGraine(g, "Satya"), i, "indechiffre", { x: 0, y: 0 }, "arme"),
    );
  }
  return out;
}

describe("unite", () => {
  it("stabilité : vecteur gelé (l'unité de genèse)", () => {
    assert.deepEqual(genese(), {
      id: 0,
      camp: "coffre",
      mot: 2064595364,
      archetype: "soleil",
      age: "Satya",
      classe: "arme",
      axes: { lame: 16, ecu: 5, eperon: 22, arc: 21, somme: 64, pointe: "eperon" },
      pos: { x: 4, y: 4 },
      precedente: null,
      elan: 0,
      tenue: 42,
      pa: PA_PAR_TOUR,
    });
    const g = genese();
    assert.equal(tenueMax(g), TENUE_BASE + MULT_TENUE * 5);
    assert.equal(pas(g), 2);
    assert.equal(portee(g), 3);
    assert.equal(vivante(g), true);
  });

  it("somme des axes : 64 sur deux cents mots, et la tenue en découle", () => {
    for (const unite of cohorte(200)) {
      const a = unite.axes;
      assert.equal(a.somme, COMBAT_BUDGET);
      assert.equal(a.lame + a.ecu + a.eperon + a.arc, COMBAT_BUDGET);
      assert.equal(unite.tenue, TENUE_BASE + MULT_TENUE * a.ecu);
      assert.equal(unite.tenue, tenueMax(unite));
    }
  });

  it("pas dans 2..4, portée dans 1..7, entiers, sur les mêmes deux cents", () => {
    for (const unite of cohorte(200)) {
      const p = pas(unite);
      const q = portee(unite);
      assert.equal(Number.isInteger(p), true);
      assert.equal(Number.isInteger(q), true);
      assert.ok(p >= PAS_BASE && p <= PAS_BASE + 2, `pas ${p} hors de 2..4`);
      assert.ok(q >= PORTEE_BASE && q <= PORTEE_BASE + 6, `portée ${q} hors de 1..7`);
      assert.equal(p, PAS_BASE + Math.trunc(unite.axes.eperon / DIV_PAS));
      assert.equal(q, PORTEE_BASE + Math.trunc(unite.axes.arc / DIV_PORTEE));
    }
  });

  it("la mobilité ne noie pas la portée : un pas plein reste sous la plus longue portée", () => {
    // Recalé quand la dalle est passée à deux bits par case : la plus grande
    // salle a triplé, et une mobilité trop haute écrase `arc` — l'archer se
    // fait rattraper avant d'avoir tiré (mesuré : r(arc) = −0,48 à pas 4..8).
    assert.ok(
      PAS_BASE + Math.trunc(64 / DIV_PAS) < PORTEE_BASE + Math.trunc(64 / DIV_PORTEE),
      "le pas le plus long dépasse la portée la plus longue : `arc` n'achète plus rien",
    );
  });

  it("encaisser : la tenue s'arrête à 0, jamais au-dessous", () => {
    const g = genese();
    assert.equal(encaisser(g, 5).tenue, 37);
    assert.equal(encaisser(g, 0).tenue, 42);
    const tombee = encaisser(g, 1000);
    assert.equal(tombee.tenue, 0);
    assert.equal(vivante(tombee), false);
    assert.equal(encaisser(tombee, 3).tenue, 0);
  });

  it("reprendre : MULT_TENUE·arc/8, plafonnée à la tenue de départ", () => {
    const g = genese();
    // arc 21 → 2·2 = 4 de reprise ; 42 − 10 = 32, puis 36.
    assert.equal(reprendre(encaisser(g, 10)).tenue, 36);
    // Déjà pleine : la reprise ne déborde pas.
    assert.equal(reprendre(g).tenue, 42);
    assert.equal(reprendre(encaisser(g, 1)).tenue, 42);
  });

  it("reprendre : rien pour qui a dépensé un PA, rien pour qui est retirée", () => {
    const blessee = encaisser(genese(), 6);
    assert.equal(reprendre(depenser(blessee, PA_FRAPPER)).tenue, 36);
    assert.equal(reprendre(depenser(blessee, PA_PAR_TOUR)).tenue, 36);
    assert.equal(reprendre(terminerTour(blessee)).tenue, 36);
    // On ne relève pas un mot tombé.
    assert.equal(reprendre(encaisser(genese(), 999)).tenue, 0);
  });

  it("deplacer pose la case sans toucher aux PA, et la case posée est une copie", () => {
    const g = genese();
    const vers = { x: 6, y: 2 };
    const bougee = deplacer(g, vers);
    assert.deepEqual(bougee.pos, { x: 6, y: 2 });
    assert.equal(bougee.pa, PA_PAR_TOUR);
    assert.deepEqual(bougee.precedente, { x: 4, y: 4 });
    assert.notStrictEqual(bougee.pos, vers);
  });

  it("les PA : deux par tour, plats, un par geste", () => {
    const g = genese();
    assert.equal(PA_PAR_TOUR, 2);
    assert.equal(PA_DEPLACER, 1);
    assert.equal(PA_FRAPPER, 1);
    assert.equal(g.pa, PA_PAR_TOUR);
    assert.equal(aDesPa(g, PA_DEPLACER), true);
    const un = depenser(g, PA_DEPLACER);
    assert.equal(un.pa, 1);
    assert.equal(aDesPa(un, PA_FRAPPER), true);
    const zero = depenser(un, PA_FRAPPER);
    assert.equal(zero.pa, 0);
    assert.equal(aDesPa(zero, PA_FRAPPER), false);
    // Plats : la dotation ne lit aucun axe.
    for (const u of cohorte(200)) assert.equal(u.pa, PA_PAR_TOUR);
  });

  it("depenser doit échouer : plus de PA que l'unité n'en a, ou un coût fractionnaire", () => {
    const g = genese();
    assert.throws(() => depenser(g, PA_PAR_TOUR + 1), RejetTactique);
    assert.throws(() => depenser(depenser(g, PA_PAR_TOUR), PA_FRAPPER), RejetTactique);
    assert.throws(() => depenser(g, -1), RejetTactique);
    assert.throws(() => depenser(g, 0.5), RejetTactique);
  });

  it("terminerTour vide les PA, et rend l'unité telle quelle si elle est déjà à zéro", () => {
    const fini = terminerTour(genese());
    assert.equal(fini.pa, 0);
    assert.strictEqual(terminerTour(fini), fini);
  });

  it("nouveauTour : les PA repartent à deux, la tenue reste où elle en est", () => {
    const agie = terminerTour(encaisser(genese(), 4));
    const neuve = nouveauTour(agie);
    assert.equal(neuve.pa, PA_PAR_TOUR);
    assert.equal(neuve.tenue, 38);
    assert.equal(reprendre(neuve).tenue, 42);
  });

  it("immuabilité : aucune fonction ne touche son argument", () => {
    const g = genese();
    const copie = structuredClone(g);
    deplacer(g, { x: 0, y: 0 });
    encaisser(g, 7);
    reprendre(encaisser(g, 7));
    nouveauTour(g);
    depenser(g, PA_FRAPPER);
    terminerTour(g);
    aDesPa(g, PA_DEPLACER);
    tenueMax(g);
    pas(g);
    portee(g);
    assert.deepEqual(g, copie);
  });

  it("l'élan : compté au déplacement, éteint par `poser` et par le tour neuf", () => {
    const g = genese();
    assert.equal(g.elan, 0, "une unité posée n'a pas d'élan");
    const lancee = deplacer(g, { x: 4, y: 6 });
    assert.equal(lancee.elan, 2, "sans coût donné, l'élan est le vol d'oiseau");
    assert.equal(deplacer(g, { x: 4, y: 6 }, 5).elan, 5, "le coût du chemin l'emporte");
    assert.equal(poser(lancee).elan, 0);
    assert.equal(poser(lancee).pos.x, lancee.pos.x, "poser a déplacé l'unité");
    assert.strictEqual(poser(g), g, "poser recopie une unité déjà arrêtée");
    assert.equal(nouveauTour(lancee).elan, 0);
    assert.throws(() => deplacer(g, { x: 4, y: 6 }, -2), {
      name: "RejetTactique",
      message: /élan -2 au lieu d'un entier de 0 ou plus/,
    });
  });

  it("le levier de `ecu` égale celui de `lame` : même socle des deux côtés", () => {
    // Le coup va de COUP_BASE à COUP_BASE + 64, la tenue de TENUE_BASE à
    // TENUE_BASE + MULT_TENUE·64 : les deux rapports doivent être égaux,
    // sinon un point d'un axe vaut plus qu'un point de l'autre (mesuré).
    assert.equal(TENUE_BASE, MULT_TENUE * COUP_BASE);
    const coupMax = (COUP_BASE + 64) / COUP_BASE;
    const tenueHaute = (TENUE_BASE + MULT_TENUE * 64) / TENUE_BASE;
    assert.equal(coupMax, tenueHaute);
  });

  it("le mot ne bouge jamais", () => {
    const g = genese();
    let x: Unite = g;
    for (let k = 0; k < 20; k++) {
      x = deplacer(x, { x: k % 9, y: (k * 3) % 9 });
      x = encaisser(x, k % 5);
      x = nouveauTour(x);
      x = reprendre(x);
    }
    assert.equal(x.mot, g.mot);
    assert.equal(x.archetype, g.archetype);
    assert.equal(x.age, g.age);
    assert.equal(x.classe, g.classe);
    assert.deepEqual(x.axes, g.axes);
    assert.equal(tenueMax(x), tenueMax(g));
    assert.equal(pas(x), pas(g));
    assert.equal(portee(x), portee(g));
  });

  it("doit échouer : pose hors dalle, id négatif, case visée hors dalle, dégât négatif", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    assert.throws(() => uniteDepuisObjet(o, 0, "coffre", { x: 9, y: 0 }, "arme"), {
      name: "RejetTactique",
      message: /case de pose \(9,0\) hors de la dalle 9×9/,
    });
    assert.throws(() => uniteDepuisObjet(o, -1, "coffre", { x: 0, y: 0 }, "arme"), {
      name: "RejetTactique",
      message: /id -1 au lieu d'un entier de 0 ou plus/,
    });
    assert.throws(() => deplacer(genese(), { x: 4, y: 9 }), {
      name: "RejetTactique",
      message: /case visée \(4,9\) hors de la dalle 9×9/,
    });
    assert.throws(() => encaisser(genese(), -3), {
      name: "RejetTactique",
      message: /dégât -3 au lieu d'un entier de 0 ou plus/,
    });
    assert.throws(() => encaisser(genese(), 1.5), {
      name: "RejetTactique",
      message: /dégât 1.5 au lieu/,
    });
  });
});
