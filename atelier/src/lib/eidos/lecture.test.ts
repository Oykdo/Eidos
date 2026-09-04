import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NORME, norme2, quadrupleDepuis, type Q } from "./cosmos.ts";
import { conjuguerPar } from "./groupe.ts";
import { sha256d, utf8 } from "./hash.ts";
import { glypheLecture } from "./integrite.ts";
import { exporterCarnet, parserCarnet } from "./carnet.ts";
import { normaliserTour, tourVide } from "./jauge.ts";
import {
  alignementCentiemes,
  figureOrbite,
  glypheDe,
  memeOrbiteLue,
  motDeQ,
  paradeLue,
  tientAxeElite,
} from "./lecture.ts";
import { Q_SCALE, depaqueter, objetDepuisGraine } from "./objets.ts";
import { qDeMot } from "./resonance.ts";
import { occupantsDe } from "./tour.ts";
import { coffreAtelier } from "./wallet.ts";

describe("lectures de la Tour et jauge du coffre", () => {
  it("l'orbite se lit à la première figure ; la conjugaison ne la change pas", () => {
    for (let e = 0; e < 30; e++) {
      for (const o of occupantsDe(e)) {
        assert.equal(figureOrbite(o.q), "·○☽✚".indexOf(glypheLecture(o.q)[0]!));
        const g = quadrupleDepuis(sha256d(utf8(`g${e}`)));
        assert.equal(memeOrbiteLue(conjuguerPar(g, o.q), o.q), true);
      }
    }
    assert.equal(figureOrbite([0n, 0n, 0n, 0n]), 0);
    assert.equal(figureOrbite([10n, 0n, 0n, 0n]), 3);
    assert.equal(figureOrbite([1n, 1n, 1n, 1n]), 2);
    assert.equal(alignementCentiemes([1n, 0n, 0n, 0n], [1n, 0n, 0n, 0n]), 100);
    assert.equal(alignementCentiemes([1n, 0n, 0n, 0n], [0n, 1n, 0n, 0n]), 0);
    assert.equal(tientAxeElite([100n, 0n, 0n, 0n], [87n, 48n, 0n, 0n]), true);
    assert.equal(tientAxeElite([100n, 0n, 0n, 0n], [80n, 60n, 0n, 0n]), false);
  });

  it("le mot d'une coupe garde sa première figure ; la parade lit l'axe, pas l'orbite", () => {
    let gardees = 0;
    let total = 0;
    for (let e = 0; e < 255; e++) {
      for (const o of occupantsDe(e)) {
        const m = motDeQ(o.q);
        const q = depaqueter(m);
        const n2 = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
        assert.ok(Math.abs(n2 - Q_SCALE * Q_SCALE) < 3000, `norme du mot ${e}`);
        total += 1;
        if (figureOrbite(qDeMot(m)) === figureOrbite(o.q)) gardees += 1;
      }
    }
    assert.ok(gardees >= total - 2, `${gardees}/${total}`);
    assert.equal(norme2(occupantsDe(0)[0]!.q), NORME);
    const g: Q = quadrupleDepuis(sha256d(utf8("parade-g")));
    const x: Q = quadrupleDepuis(sha256d(utf8("parade-x")));
    assert.equal(paradeLue(g, x, conjuguerPar(g, x)), true, "g x ḡ tient son propre axe");
    assert.equal(memeOrbiteLue(x, conjuguerPar(g, x)), true);
    const o = objetDepuisGraine(sha256d(utf8("glyphe")), "Kali");
    assert.deepEqual(glypheDe(o), glypheDe(o));
    assert.equal(glypheDe(o).length, 3);
  });

  it("jauge : relecture tolérante, hors feuille, voyage à côté du carnet", () => {
    assert.deepEqual(normaliserTour(null), tourVide());
    assert.deepEqual(
      normaliserTour({ etage: 999, dons: [3, 3, 300, "x"], echos: [[1, 2], [2]], liberee: -1 }),
      {
        ...tourVide(),
        dons: [3],
        echos: [[1, 2]],
      },
    );
    const n = normaliserTour({
      etage: 10,
      sommet: 4,
      depuis: 12,
      elixirs: [
        { etage: 10, mot: 5, espece: "sel" },
        { etage: 1, mot: 5, espece: "x" },
      ],
    });
    assert.equal(n.sommet, 10);
    assert.equal(n.depuis, 10);
    assert.deepEqual(n.elixirs, [{ etage: 10, mot: 5, espece: "sel" }]);
    const c = coffreAtelier("une-piece");
    const avec = { ...c, tour: { ...c.tour, etage: 7, dons: [0], portes: ["Dvapara" as const] } };
    const a = exporterCarnet(c);
    const b = exporterCarnet(avec);
    const pa = parserCarnet(a);
    const pb = parserCarnet(b);
    assert.ok(!("erreur" in pa) && !("erreur" in pb));
    if ("erreur" in pa || "erreur" in pb) return;
    assert.equal(pa.empreinte, pb.empreinte, "la jauge ne touche pas l'empreinte");
    assert.equal(pb.feuillet.tour.etage, 7);
    assert.deepEqual(pb.feuillet.tour.dons, [0]);
    assert.deepEqual(pa.feuillet.tour, tourVide());
    // un carnet d'avant la Tour, sans jauge, se relit tel quel
    const sans = JSON.parse(a) as { tour?: unknown };
    delete sans.tour;
    const ps = parserCarnet(JSON.stringify(sans));
    assert.ok(!("erreur" in ps));
    if (!("erreur" in ps)) assert.deepEqual(ps.feuillet.tour, tourVide());
  });
});
