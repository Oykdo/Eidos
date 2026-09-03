import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { B_SUR_A, AGES_RELIQUE, lumens, lumenDe, echelleRelique } from "./relique.ts";

describe("reliques", () => {
  it("b/a = 1/2 pour les quatre âges — le ratio ne grandit pas", () => {
    for (const l of lumens()) {
      assert.equal(l.ratio, B_SUR_A);
      assert.equal(l.b, l.a / 2);
    }
  });

  it("aire = π·a·b, Satya la plus grande, Kali la plus petite", () => {
    const [satya, treta, dvapara, kali] = lumens();
    assert.ok(satya && treta && dvapara && kali);
    assert.ok(Math.abs(satya.aire - Math.PI * 40 * 20) < 1e-9);
    assert.ok(satya.aire > treta.aire);
    assert.ok(treta.aire > dvapara.aire);
    assert.ok(dvapara.aire > kali.aire);
    assert.equal(echelleRelique(kali), 0.25);
    assert.equal(echelleRelique(satya), 1);
  });

  it("époches alignées sur la genèse (2080 au total)", () => {
    assert.equal(
      AGES_RELIQUE.reduce((s, a) => s + a.epoques, 0),
      2080,
    );
    assert.equal(lumenDe(AGES_RELIQUE[0]!).a, 40);
  });
});
