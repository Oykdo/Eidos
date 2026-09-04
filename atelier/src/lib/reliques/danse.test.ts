import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SIGNATURES } from "../eidos/signatures.ts";
import { DANSES, danse, facteurDanse, type Vec3 } from "./danse.ts";

const P: Vec3 = [0.3, 0.2, 0.1];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe("danses — une par muse", () => {
  it("neuf danses nommées, dans l'ordre des signatures", () => {
    assert.equal(Object.keys(DANSES).length, 9);
    for (const s of SIGNATURES) assert.ok(DANSES[s.id].fr && DANSES[s.id].en, s.id);
  });

  it("identité à phase 0 et à 2π, pour les neuf", () => {
    for (let fam = 0; fam < 9; fam++) {
      assert.ok(dist(danse(P, fam, 0), P) < 1e-12, `famille ${fam} à 0`);
      assert.ok(dist(danse(P, fam, 2 * Math.PI), P) < 1e-9, `famille ${fam} à 2π`);
    }
  });

  it("à phase 1, chaque muse bouge, et aucune ne bouge comme une autre", () => {
    const vus: Vec3[] = [];
    for (let fam = 0; fam < 9; fam++) {
      const q = danse(P, fam, 1);
      assert.ok(dist(q, P) > 1e-3, `famille ${fam} immobile`);
      for (const v of vus) assert.ok(dist(q, v) > 1e-3, `famille ${fam} imite une autre`);
      vus.push(q);
      assert.ok(Math.hypot(...q) < 1.3 * Math.hypot(...P) + 0.1, `famille ${fam} hors borne`);
    }
  });

  it("rotations pures : la norme est conservée ; étirements : facteur de marche < 1", () => {
    for (const fam of [0, 1, 3, 5, 7]) {
      const q = danse(P, fam, 0.7);
      assert.ok(Math.abs(Math.hypot(...q) - Math.hypot(...P)) < 1e-12, `famille ${fam}`);
      assert.equal(facteurDanse(fam), 1);
    }
    for (const fam of [2, 4, 8]) assert.ok(facteurDanse(fam) < 1);
    assert.equal(facteurDanse(6), 1);
  });
});
