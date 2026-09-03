import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hexOf, sha256d, utf8 } from "./hash.ts";
import { objetDepuisGraine, paqueter, depaqueter } from "./objets.ts";
import { SIGNATURES } from "./signatures.ts";
import { coffreNeuf } from "./wallet.ts";
import { minerCoffre } from "./wallet.ts";
import { empreinteVoxels, voxelsDe } from "./voxels.ts";
import { tirerDansCoffre, racineDuCoffre } from "./inventaire.ts";

const GRAINE = sha256d(utf8("eidos-objet-genese"));

describe("voxels", () => {
  it("déterminisme : même objet, mêmes voxels", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    assert.deepEqual(voxelsDe(o), voxelsDe(o));
    assert.equal(voxelsDe(o).length, 216);
    assert.deepEqual(voxelsDe(o)[0], { x: 1, y: 5, z: 3 });
    assert.equal(
      hexOf(sha256d(utf8(empreinteVoxels(o)))),
      "993e5a8b84c984351293d7ba1b650e27328a10d0d7ef1d6c43ea51d8192c37af",
    );
  });

  it("q et −q : mêmes voxels", () => {
    const o = objetDepuisGraine(GRAINE, "Satya");
    const q = depaqueter(o.mot);
    const oppose = { ...o, mot: paqueter([-q[0], -q[1], -q[2], -q[3]]) };
    assert.deepEqual(voxelsDe(oppose), voxelsDe(o));
  });

  it("neuf familles : occupances distinctes, jamais vides", () => {
    const base = objetDepuisGraine(GRAINE, "Satya");
    const empreintes = new Set<string>();
    for (const s of SIGNATURES) {
      const vs = voxelsDe({ ...base, archetype: s.id });
      assert.ok(vs.length > 20, s.id);
      empreintes.add(empreinteVoxels({ ...base, archetype: s.id }));
    }
    assert.equal(empreintes.size, 9);
  });
});

describe("inventaire", () => {
  it("un tirage par hauteur, racine rejouable", () => {
    const c = coffreNeuf("vide");
    const a = tirerDansCoffre(c);
    assert.equal(a.ok, true);
    if (!a.ok) return;
    const b = tirerDansCoffre(a.coffre);
    assert.equal(b.ok, false);
    if (b.ok) return;
    assert.equal(b.code, "hauteur");
    const mine = minerCoffre(a.coffre);
    const d = tirerDansCoffre(mine);
    assert.equal(d.ok, true);
    if (!d.ok) return;
    const hauteurs = new Set(d.coffre.objets.map((o) => o.hauteur));
    assert.equal(hauteurs.size, 2);
    assert.ok(d.coffre.objets.some((o) => o.genre === "pierre"));
    assert.equal(racineDuCoffre(d.coffre), racineDuCoffre(d.coffre));
    assert.notEqual(racineDuCoffre(a.coffre), racineDuCoffre(d.coffre));
  });
});
